// 这是一个应用（App）相关的 API 请求函数文件
// 主要功能是封装与应用和文件夹操作相关的 HTTP 请求
// 使用了统一的请求方法 GET、POST、DELETE，导出多个 API 调用函数

// 从通用 API 请求模块中导入 HTTP 请求方法
// DELETE: 用于发送 DELETE 请求
// GET: 用于发送 GET 请求
// POST: 用于发送 POST 请求
import { DELETE, GET, POST } from '@/web/common/api/request';
// 导入创建应用文件夹的请求体类型定义
import type { CreateAppFolderBody } from '@/pages/api/core/app/folder/create';
// 导入与父级文件夹路径相关的类型定义
// GetPathProps: 获取路径时的参数类型
// ParentTreePathItemType: 路径树节点类型
import type {
  GetPathProps,
  ParentTreePathItemType
} from '@fastgpt/global/common/parentFolder/type';
// 导入工作流转换相关的类型定义
// transitionWorkflowBody: 转换工作流的请求体类型
// transitionWorkflowResponse: 转换工作流的响应类型
import type {
  transitionWorkflowBody,
  transitionWorkflowResponse
} from '@/pages/api/core/app/transitionWorkflow';
// 导入复制应用相关的类型定义
// copyAppQuery: 复制应用的查询参数类型
// copyAppResponse: 复制应用的响应类型
import type { copyAppQuery, copyAppResponse } from '@/pages/api/core/app/copy';

// ========== 文件夹相关 API ==========

// 创建应用文件夹的 API 函数
// 参数：data: CreateAppFolderBody - 创建文件夹所需的数据
// 返回值：POST 请求的 Promise
export const postCreateAppFolder = (data: CreateAppFolderBody) =>
  POST('/core/app/folder/create', data);

// 获取应用文件夹路径的 API 函数
// 参数：data: GetPathProps - 包含 sourceId 等获取路径所需的参数
// 返回值：Promise<ParentTreePathItemType[]> - 路径树节点数组的 Promise
export const getAppFolderPath = (data: GetPathProps) => {
  // 如果 sourceId 不存在，直接返回一个空数组的 resolved Promise
  // 这样可以避免发送不必要的请求
  if (!data.sourceId) return Promise.resolve<ParentTreePathItemType[]>([]);

  // 发送 GET 请求获取文件夹路径
  // 使用泛型指定响应数据类型为 ParentTreePathItemType[]
  return GET<ParentTreePathItemType[]>(`/core/app/folder/path`, data);
};

// ========== 应用详情相关 API ==========

// 将应用转换为工作流的 API 函数
// 参数：data: transitionWorkflowBody - 转换工作流所需的数据
// 返回值：Promise<transitionWorkflowResponse> - 转换结果的 Promise
export const postTransition2Workflow = (data: transitionWorkflowBody) =>
  POST<transitionWorkflowResponse>('/core/app/transitionWorkflow', data);

// 复制应用的 API 函数
// 参数：data: copyAppQuery - 复制应用所需的查询参数
// 返回值：Promise<copyAppResponse> - 复制结果的 Promise
export const postCopyApp = (data: copyAppQuery) => POST<copyAppResponse>('/core/app/copy', data);
