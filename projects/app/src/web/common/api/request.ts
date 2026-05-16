// 这是一个统一的 HTTP 请求封装文件
// 主要功能是基于 axios 封装统一的 GET、POST、PUT、DELETE 请求方法
// 包含请求拦截、响应拦截、错误处理、并发请求控制等功能
// 导出便捷的请求方法供其他模块使用

// 导入 axios 库及其相关类型定义
// axios: HTTP 请求库
// Method: HTTP 请求方法类型（GET、POST、PUT、DELETE等）
// InternalAxiosRequestConfig: axios 请求配置类型
// AxiosResponse: axios 响应类型
// AxiosProgressEvent: axios 上传/下载进度事件类型
import axios, {
  type Method,
  type InternalAxiosRequestConfig,
  type AxiosResponse,
  type AxiosProgressEvent
} from 'axios';
// 导入清除用户认证 token 的函数
import { clearToken } from '@/web/support/user/auth';
// 导入 token 相关错误码常量
import { TOKEN_ERROR_CODE } from '@fastgpt/global/common/error/errorCode';
// 导入团队相关错误枚举
import { TeamErrEnum } from '@fastgpt/global/common/error/code/team';
// 导入系统状态管理 store
import { useSystemStore } from '../system/useSystemStore';
// 导入获取 Web 请求 URL 和子路由的工具函数
import { getWebReqUrl, subRoute } from '@fastgpt/web/common/system/utils';
// 导入国际化翻译函数
import { i18nT } from '@fastgpt/web/i18n/utils';
// 导入生成唯一 ID 的工具函数
import { getNanoid } from '@fastgpt/global/common/string/tools';
// 导入 dayjs 日期处理库
import dayjs from 'dayjs';
// 导入安全的 URI 编码函数
import { safeEncodeURIComponent } from '@/web/common/utils/uri';

// 配置选项的类型定义
interface ConfigType {
  headers?: { [key: string]: string }; // 请求头配置
  timeout?: number; // 请求超时时间（毫秒）
  onUploadProgress?: (progressEvent: AxiosProgressEvent) => void; // 上传进度回调
  cancelToken?: AbortController; // 取消请求的控制器
  maxQuantity?: number; // 同一 URL 的最大并发请求数，通常用于取消旧请求
  withCredentials?: boolean; // 是否携带凭证（如 cookies）
}
// 响应数据的类型定义
interface ResponseDataType {
  code: number; // 响应状态码
  message: string; // 响应消息
  data: any; // 响应数据
}

// 存储每个 URL 的请求控制器映射表
// key 是 URL，value 是该 URL 的请求控制器数组
const maxQuantityMap: Record<
  string,
  | undefined
  | {
      id: string; // 请求的唯一标识
      sign: AbortController; // 用于取消请求的控制器
    }[]
> = {};

/*
  每个请求生成一个唯一标识
  如果请求数量超过 maxQuantity，取消最早的请求并发起新请求
*/
// 检查并控制同一 URL 的最大并发请求数
// 参数：url - 请求地址，maxQuantity - 最大并发数
// 返回值：包含请求 id 和 abortSignal 的对象
function checkMaxQuantity({ url, maxQuantity }: { url: string; maxQuantity?: number }) {
  // 如果没有设置最大并发数，直接返回空对象
  if (!maxQuantity) return {};
  // 获取该 URL 已有的请求列表
  const item = maxQuantityMap[url];
  // 生成一个唯一的请求 ID
  const id = getNanoid();
  // 创建一个新的 AbortController 用于取消请求
  const sign = new AbortController();

  // 如果该 URL 已有请求记录
  if (item && item.length > 0) {
    // 如果当前请求数已达到上限
    if (item.length >= maxQuantity) {
      // 移除最早的请求（数组的第一个元素）
      const firstSign = item.shift();
      // 取消那个最早的请求
      firstSign?.sign.abort();
    }
    // 将新请求添加到数组末尾
    item.push({ id, sign });
  } else {
    // 如果该 URL 还没有请求记录，创建一个新数组并添加当前请求
    maxQuantityMap[url] = [{ id, sign }];
  }
  // 返回请求 ID 和用于取消请求的 signal
  return {
    id,
    abortSignal: sign?.signal
  };
}

// 请求完成后的清理函数
// 参数：signId - 请求的唯一标识，url - 请求地址
function requestFinish({ signId, url }: { signId?: string; url: string }) {
  // 获取该 URL 的请求列表
  const item = maxQuantityMap[url];
  if (item) {
    // 如果有 signId，从列表中移除对应的请求
    if (signId) {
      // 查找该 signId 在数组中的索引
      const index = item.findIndex((item) => item.id === signId);
      // 如果找到了，从数组中删除该元素
      if (index !== -1) {
        item.splice(index, 1);
      }
    }
    // 如果该 URL 的请求列表已空，删除这个 URL 的记录
    if (item.length <= 0) {
      delete maxQuantityMap[url];
    }
  }
}

/**
 * 请求拦截器：在请求发送前执行
 */
function startInterceptors(config: InternalAxiosRequestConfig): InternalAxiosRequestConfig {
  // 如果有请求头，可以在这里进行统一处理（目前为空，预留扩展点）
  if (config.headers) {
  }

  // 返回配置，继续发送请求
  return config;
}

/**
 * 响应成功拦截器：在收到响应后、返回数据前执行
 */
function responseSuccess(response: AxiosResponse<ResponseDataType>) {
  // 直接返回响应对象，不做任何处理
  return response;
}
/**
 * 响应数据检查：检查响应数据的状态码
 */
function checkRes(data: ResponseDataType) {
  // 如果数据未定义（空响应）
  if (data === undefined) {
    console.log('error->', data, 'data is empty');
    // 返回一个 rejected Promise，中断正常流程
    return Promise.reject('服务器异常');
    // 如果状态码不在 200-399 范围内（表示错误）
  } else if (data.code < 200 || data.code >= 400) {
    // 返回 rejected Promise，将整个 data 作为错误对象
    return Promise.reject(data);
  }
  // 检查通过，返回实际的业务数据
  return data.data;
}

/**
 * 响应错误处理：统一处理各种错误情况
 */
function responseError(err: any) {
  // 在控制台打印错误信息，方便调试
  console.log('error->', '请求错误', err);
  // 获取当前页面的路径
  const pathname = window.location.pathname;
  // 判断当前页面是否是外链页面（不需要登录的页面）
  const isOutlinkPage = {
    [`${subRoute}/chat/share`]: true, // 分享聊天页面
    [`${subRoute}/price`]: true, // 价格页面
    [`${subRoute}/login`]: true // 登录页面
  }[pathname];

  // 从错误对象中提取数据，优先使用响应中的数据
  const data = err?.response?.data || err;

  // 如果 err 为空
  if (!err) {
    return Promise.reject({ message: '未知错误' });
  }
  // 如果 err 是一个字符串
  if (typeof err === 'string') {
    return Promise.reject({ message: err });
  }
  // 如果提取的 data 是一个字符串
  if (typeof data === 'string') {
    return Promise.reject(data);
  }

  // Token 相关错误处理
  if (data?.code in TOKEN_ERROR_CODE) {
    // 如果不是外链页面且不是聊天页面
    if (!isOutlinkPage && pathname !== `${subRoute}/chat`) {
      // 清除本地存储的 token
      clearToken();
      // 跳转到登录页，并记录当前页面作为登录后返回的页面
      window.location.replace(
        getWebReqUrl(
          `/login?lastRoute=${safeEncodeURIComponent(location.pathname + location.search)}`
        )
      );
    }

    // 返回 token 未授权的错误消息
    return Promise.reject({ message: i18nT('common:unauth_token') });
  }
  // 余额/配额不足错误处理
  if (
    data?.statusText &&
    // 检查错误类型是否属于各种资源不足的情况
    [
      TeamErrEnum.aiPointsNotEnough, // AI 点数不足
      TeamErrEnum.datasetSizeNotEnough, // 数据集大小不足
      TeamErrEnum.datasetAmountNotEnough, // 数据集数量不足
      TeamErrEnum.appAmountNotEnough, // 应用数量不足
      TeamErrEnum.pluginAmountNotEnough, // 插件数量不足
      TeamErrEnum.websiteSyncNotEnough, // 网站同步次数不足
      TeamErrEnum.reRankNotEnough // 重排次数不足
    ].includes(data?.statusText) &&
    !isOutlinkPage // 如果不是外链页面
  ) {
    // 打开余额不足的提示弹窗
    useSystemStore.getState().setNotSufficientModalType(data.statusText);
    return Promise.reject(data);
  }
  // 其他错误，直接返回错误数据
  return Promise.reject(data);
}

/* 创建 axios 请求实例 */
const instance = axios.create({
  timeout: 60000 // 设置默认超时时间为 60 秒
});

/* 添加请求拦截器 */
instance.interceptors.request.use(startInterceptors, (err) => Promise.reject(err));
/* 添加响应拦截器 */
instance.interceptors.response.use(responseSuccess, (err) => Promise.reject(err));

// 统一的请求函数
// 参数：url - 请求地址，data - 请求数据，config - 配置项，method - HTTP 方法
function request(
  url: string,
  data: any,
  { cancelToken, maxQuantity, withCredentials, ...config }: ConfigType,
  method: Method
): any {
  /* 清理数据：删除 undefined 字段，格式化日期 */
  for (const key in data) {
    const val = data[key];
    // 如果值是 undefined，删除这个字段
    if (data[key] === undefined) {
      delete data[key];
      // 如果值是 Date 对象，格式化为字符串
    } else if (val instanceof Date) {
      data[key] = dayjs(val).format();
    }
  }

  // 检查并处理最大并发请求数，获取请求 id 和取消信号
  const { id: signId, abortSignal } = checkMaxQuantity({ url, maxQuantity });

  // 发起请求并返回 Promise
  return (
    instance
      .request({
        baseURL: getWebReqUrl('/api'), // 设置基础 URL
        url, // 请求路径
        method, // HTTP 方法
        // POST 和 PUT 方法将数据放在请求体中
        data: ['POST', 'PUT'].includes(method) ? data : undefined,
        // GET 和 DELETE 方法将数据放在 URL 参数中
        params: !['POST', 'PUT'].includes(method) ? data : undefined,
        // 使用传入的 cancelToken，没有则使用自动生成的 abortSignal
        signal: cancelToken?.signal ?? abortSignal,
        withCredentials, // 是否携带凭证
        ...config // 用户自定义配置，可以覆盖前面的配置
      })
      // 请求成功时，检查响应数据
      .then((res) => checkRes(res.data))
      // 请求失败时，处理错误
      .catch((err) => responseError(err))
      // 无论成功或失败，最后清理请求记录
      .finally(() => requestFinish({ signId, url }))
  );
}

/**
 * API 请求方法封装
 * @param {String} url - 请求地址
 * @param {Any} params - 请求参数
 * @param {Object} config - 请求配置
 * @returns Promise<T> - 返回泛型类型的 Promise
 */
// GET 请求方法
export function GET<T = undefined>(url: string, params = {}, config: ConfigType = {}): Promise<T> {
  return request(url, params, config, 'GET');
}

// POST 请求方法
export function POST<T = undefined>(url: string, data = {}, config: ConfigType = {}): Promise<T> {
  return request(url, data, config, 'POST');
}

// PUT 请求方法
export function PUT<T = undefined>(url: string, data = {}, config: ConfigType = {}): Promise<T> {
  return request(url, data, config, 'PUT');
}

// DELETE 请求方法
export function DELETE<T = undefined>(url: string, data = {}, config: ConfigType = {}): Promise<T> {
  return request(url, data, config, 'DELETE');
}

// 导出内部方法和变量，供需要直接使用的场景
export {
  maxQuantityMap, // 请求并发控制映射表
  checkMaxQuantity, // 检查并发数的函数
  requestFinish, // 请求完成清理函数
  startInterceptors, // 请求拦截器
  responseSuccess, // 响应成功拦截器
  checkRes, // 响应数据检查函数
  responseError, // 响应错误处理函数
  instance, // axios 实例
  request // 基础请求函数
};
