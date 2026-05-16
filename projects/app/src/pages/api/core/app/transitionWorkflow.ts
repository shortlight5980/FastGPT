// 转换应用为工作流类型的 API 路由文件
// 本文件提供将现有应用转换为工作流类型应用的功能
// 支持两种模式：直接修改原应用类型，或创建一个新的工作流类型应用副本
// 主要导出：NextAPI 包装后的 handler 函数

// 导入类型定义：ApiRequestProps 和 ApiResponseType
// 这些是 Next.js API 路由的请求和响应类型定义
import type { ApiRequestProps, ApiResponseType } from '@fastgpt/service/type/next';
// 导入 NextAPI 中间件函数
// 用于包装 API 处理函数，提供统一的错误处理、日志记录等功能
import { NextAPI } from '@/service/middleware/entry';
// 导入应用权限验证函数
// 用于验证用户是否有权限操作指定的应用
import { authApp } from '@fastgpt/service/support/permission/app/auth';
// 导入所有者权限常量
// 表示需要应用的所有者权限才能执行此操作
import { OwnerPermissionVal } from '@fastgpt/global/support/permission/constant';
// 导入应用的 MongoDB 数据模型
// 用于操作数据库中的应用数据
import { MongoApp } from '@fastgpt/service/core/app/schema';
// 导入应用类型枚举
// 定义了不同类型的应用，如简单对话、工作流等
import { AppTypeEnum } from '@fastgpt/global/core/app/constants';
// 导入创建应用的函数
// 用于在创建新副本时调用创建应用的逻辑
import { onCreateApp } from './create';
// 导入 MongoDB 会话运行函数
// 用于在 MongoDB 事务中执行多个操作，确保数据一致性
import { mongoSessionRun } from '@fastgpt/service/common/mongo/sessionRun';
// 导入复制头像图片的函数
// 用于在创建新应用副本时复制原应用的头像
import { copyAvatarImage } from '@fastgpt/service/common/file/image/controller';
// 导入 S3 头像源管理函数
// 用于刷新头像的访问权限等操作
import { getS3AvatarSource } from '@fastgpt/service/common/s3/sources/avatar';

// 定义 API 查询参数类型
// 此接口为空，表示不需要查询字符串参数
export type transitionWorkflowQuery = {};

// 定义 API 请求体类型
// 客户端调用此 API 时需要传递的参数结构
export type transitionWorkflowBody = {
  appId: string; // 要转换的应用 ID
  createNew?: boolean; // 可选参数，是否创建新应用副本。true=创建副本，false/不传=直接修改原应用
};

// 定义 API 响应类型
// API 返回给客户端的数据结构
export type transitionWorkflowResponse = {
  id?: string; // 可选字段，创建新应用时返回新应用的 ID
};

// API 处理函数
// 这是实际处理请求的核心逻辑函数
// 参数：
//   req - 请求对象，包含请求体和查询参数
//   res - 响应对象，用于发送响应
// 返回值：Promise<transitionWorkflowResponse> - 返回响应数据
async function handler(
  req: ApiRequestProps<transitionWorkflowBody, transitionWorkflowQuery>,
  res: ApiResponseType<any>
): Promise<transitionWorkflowResponse> {
  // 从请求体中解构出 appId 和 createNew 参数
  const { appId, createNew } = req.body;

  // 调用 authApp 函数进行应用权限验证
  // 参数：
  //   req - 请求对象，用于获取认证信息
  //   appId - 要验证的应用 ID
  //   authToken - 是否需要验证 token
  //   per - 需要的权限等级（这里是所有者权限）
  // 返回值：包含应用对象、团队 ID、团队成员 ID 的对象
  const { app, teamId, tmbId } = await authApp({
    req,
    appId,
    authToken: true,
    per: OwnerPermissionVal
  });

  // 如果 createNew 参数为 true，则创建一个新的工作流类型应用副本
  if (createNew) {
    // 使用 mongoSessionRun 在 MongoDB 事务中执行操作
    // 这样可以确保多个数据库操作要么全部成功，要么全部失败，保持数据一致性
    const { appId } = await mongoSessionRun(async (session) => {
      // 复制原应用的头像图片
      // 参数：
      //   teamId - 团队 ID
      //   imageUrl - 原头像图片的 URL
      //   temporary - 是否为临时图片
      //   session - MongoDB 会话对象，用于事务
      const avatar = await copyAvatarImage({
        teamId,
        imageUrl: app.avatar,
        temporary: true,
        session
      });

      // 调用 onCreateApp 函数创建新应用
      // 新应用继承原应用的大部分配置，但类型设为 workflow
      const appId = await onCreateApp({
        parentId: app.parentId, // 继承原应用的父文件夹 ID
        name: app.name + ' Copy', // 在原名称后加 " Copy"
        avatar, // 使用复制后的头像
        type: AppTypeEnum.workflow, // 设置应用类型为工作流
        modules: app.modules, // 继承原应用的模块配置
        edges: app.edges, // 继承原应用的边（连接）配置
        chatConfig: app.chatConfig, // 继承原应用的聊天配置
        teamId: app.teamId, // 使用原应用的团队 ID
        tmbId // 使用当前操作者的团队成员 ID
      });
      // 刷新头像的访问权限
      // 确保新头像可以正常访问
      await getS3AvatarSource().refreshAvatar(avatar, undefined, session);

      // 返回事务中创建的新应用 ID
      return {
        appId
      };
    });

    // 返回新应用的 ID 给客户端
    return { id: appId };
  }

  // 如果 createNew 不为 true，则直接修改原应用的类型为工作流
  // 使用 MongoDB 的 findByIdAndUpdate 方法通过 ID 查找并更新应用
  await MongoApp.findByIdAndUpdate(appId, { type: AppTypeEnum.workflow });

  // 返回空对象，表示操作成功但没有创建新资源
  return {};
}

// 使用 NextAPI 中间件包装 handler 函数并导出
// NextAPI 会处理错误捕获、响应格式化等通用逻辑
export default NextAPI(handler);
