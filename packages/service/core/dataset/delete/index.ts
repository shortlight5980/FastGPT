import { getQueue, getWorker, QueueNames } from '../../../common/bullmq';
import { datasetDeleteProcessor } from './processor';
import type { JobState } from 'bullmq';

export type DatasetDeleteJobData = {
  teamId: string;
  datasetId: string;
};

export type DatasetDeleteJobStateDetail =
  | {
      state: 'missing';
    }
  | {
      state: JobState;
      failedReason?: string;
      attemptsMade?: number;
    };

const getDatasetDeleteQueue = () =>
  getQueue<DatasetDeleteJobData>(QueueNames.datasetDelete, {
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
export const initDatasetDeleteWorker = () => {
  return getWorker<DatasetDeleteJobData>(QueueNames.datasetDelete, datasetDeleteProcessor, {
    concurrency: 1, // 确保同时只有1个删除任务
    removeOnFail: {
      age: 90 * 24 * 60 * 60, // 保留90天失败记录
      count: 10000 // 最多保留10000个失败任务
    }
  });
};

// 添加删除任务
export const addDatasetDeleteJob = (data: DatasetDeleteJobData) => {
  // 创建删除队列
  const datasetDeleteQueue = getDatasetDeleteQueue();

  const jobId = `${String(data.teamId)}-${String(data.datasetId)}`;

  // 使用去重机制，避免重复删除
  return datasetDeleteQueue.add('delete_dataset', data, {
    jobId,
    delay: 1000 // 延迟1秒执行，确保API响应完成
  });
};

export const getDatasetDeleteJobState = async (data: DatasetDeleteJobData) => {
  const detail = await getDatasetDeleteJobStateDetail(data);
  if (detail.state === 'missing') return 'completed';

  return detail.state;
};

/**
 * 读取知识库删除任务的原始队列状态，并保留 job 缺失、失败原因和重试次数。
 * 旧的 getDatasetDeleteJobState 为兼容调用方会把 missing 折算为 completed；
 * 需要做补偿或告警时应使用本函数，避免把 worker no-op、完成清理和任务丢失混在一起。
 */
export const getDatasetDeleteJobStateDetail = async (
  data: DatasetDeleteJobData
): Promise<DatasetDeleteJobStateDetail> => {
  const datasetDeleteQueue = getDatasetDeleteQueue();
  const job = await datasetDeleteQueue.getJob(`${String(data.teamId)}-${String(data.datasetId)}`);
  if (!job) return { state: 'missing' };

  const state = await job.getState();
  return {
    state: state === 'unknown' ? 'completed' : state,
    failedReason: job.failedReason,
    attemptsMade: job.attemptsMade
  };
};

export const retryDatasetDeleteJob = async (data: DatasetDeleteJobData) => {
  const datasetDeleteQueue = getDatasetDeleteQueue();
  const job = await datasetDeleteQueue.getJob(`${String(data.teamId)}-${String(data.datasetId)}`);
  if (!job) {
    return addDatasetDeleteJob(data);
  }

  if ((await job.getState()) === 'failed') {
    await job.retry('failed');
  }

  return job;
};
