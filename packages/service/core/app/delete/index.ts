import { getQueue, getWorker, QueueNames } from '../../../common/bullmq';
import { appDeleteProcessor } from './processor';
import type { JobState } from 'bullmq';

export type AppDeleteJobData = {
  teamId: string;
  appId: string;
};

export type AppDeleteJobStateDetail =
  | {
      state: 'missing';
    }
  | {
      state: JobState;
      failedReason?: string;
      attemptsMade?: number;
    };

const getAppDeleteQueue = () =>
  getQueue<AppDeleteJobData>(QueueNames.appDelete, {
    defaultJobOptions: {
      attempts: 10,
      backoff: {
        type: 'exponential',
        delay: 5000
      },
      removeOnComplete: true,
      removeOnFail: { age: 30 * 24 * 60 * 60 } // 保留30天失败记录
    }
  });

// 创建工作进程
export const initAppDeleteWorker = () => {
  return getWorker<AppDeleteJobData>(QueueNames.appDelete, appDeleteProcessor, {
    concurrency: 1, // 确保同时只有1个删除任务
    removeOnFail: {
      age: 90 * 24 * 60 * 60, // 保留90天失败记录
      count: 10000 // 最多保留10000个失败任务
    }
  });
};

// 添加删除任务
export const addAppDeleteJob = (data: AppDeleteJobData) => {
  // 创建删除队列
  const appDeleteQueue = getAppDeleteQueue();

  const jobId = `${String(data.teamId)}-${String(data.appId)}`;

  // Use jobId to automatically prevent duplicate deletion tasks (BullMQ feature)
  return appDeleteQueue.add('delete_app', data, {
    jobId,
    delay: 1000 // Delay 1 second to ensure API response completes
  });
};

export const getAppDeleteJobState = async (data: AppDeleteJobData) => {
  const detail = await getAppDeleteJobStateDetail(data);
  if (detail.state === 'missing') return 'completed';

  return detail.state;
};

/**
 * 读取应用删除任务的原始队列状态，并保留 job 缺失、失败原因和重试次数。
 * 旧的 getAppDeleteJobState 为兼容调用方会把 missing 折算为 completed；
 * 需要做补偿或告警时应使用本函数，避免把 worker no-op、完成清理和任务丢失混在一起。
 */
export const getAppDeleteJobStateDetail = async (
  data: AppDeleteJobData
): Promise<AppDeleteJobStateDetail> => {
  const appDeleteQueue = getAppDeleteQueue();
  const job = await appDeleteQueue.getJob(`${String(data.teamId)}-${String(data.appId)}`);
  if (!job) return { state: 'missing' };

  const state = await job.getState();
  return {
    state: state === 'unknown' ? 'completed' : state,
    failedReason: job.failedReason,
    attemptsMade: job.attemptsMade
  };
};

export const retryAppDeleteJob = async (data: AppDeleteJobData) => {
  const appDeleteQueue = getAppDeleteQueue();
  const job = await appDeleteQueue.getJob(`${String(data.teamId)}-${String(data.appId)}`);
  if (!job) {
    return addAppDeleteJob(data);
  }

  if ((await job.getState()) === 'failed') {
    await job.retry('failed');
  }

  return job;
};
