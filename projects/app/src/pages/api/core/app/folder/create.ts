// 这是一个 Next.js API 路由文件
// 主要功能是创建应用文件夹（包括普通文件夹和工具文件夹）
// 包含权限验证、参数校验、数据库操作等功能
// 导出一个 NextAPI 包装的处理函数

// 导入 Next.js API 中间件包装函数
import { NextAPI } from '@/service/middleware/entry';
// 导入通用错误枚举
import { CommonErrEnum } from '@fastgpt/global/common/error/code/common';
// 导入文件夹默认图标 URL
import { FolderImgUrl } from '@fastgpt/global/common/file/image/constants';
// 导入父级 ID 类型定义
import { type ParentIdType } from '@fastgpt/global/common/parentFolder/type';
// 导入解析父级 ID 的工具函数（用于 MongoDB 存储）
import { parseParentIdInMongo } from '@fastgpt/global/common/parentFolder/utils';
// 导入应用类型枚举
import { AppTypeEnum } from '@fastgpt/global/core/app/constants';
// 导入权限相关常量
// PerResourceTypeEnum: 资源类型枚举
// WritePermissionVal: 写入权限值
import {
  PerResourceTypeEnum,
  WritePermissionVal
} from '@fastgpt/global/support/permission/constant';
// 导入团队应用创建权限值
import { TeamAppCreatePermissionVal } from '@fastgpt/global/support/permission/user/constant';
// 导入 MongoDB 会话运行函数（用于事务处理）
import { mongoSessionRun } from '@fastgpt/service/common/mongo/sessionRun';
// 导入应用数据模型
import { MongoApp } from '@fastgpt/service/core/app/schema';
// 导入应用权限验证函数
import { authApp } from '@fastgpt/service/support/permission/app/auth';
// 导入创建资源默认协作者的函数
import { createResourceDefaultCollaborators } from '@fastgpt/service/support/permission/controller';
// 导入用户权限验证函数
import { authUserPer } from '@fastgpt/service/support/permission/user/auth';
// 导入 API 请求类型定义
import { type ApiRequestProps } from '@fastgpt/service/type/next';
// 导入添加审计日志的工具函数
import { addAuditLog } from '@fastgpt/service/support/user/audit/util';
// 导入审计事件枚举
import { AuditEventEnum } from '@fastgpt/global/support/user/audit/constants';
// 导入检查团队应用类型限制的函数
import { checkTeamAppTypeLimit } from '@fastgpt/service/support/permission/teamLimit';
// 定义创建应用文件夹的请求体类型
export type CreateAppFolderBody = {
  parentId?: ParentIdType; // 父级文件夹 ID（可选，根目录时为空）
  name: string; // 文件夹名称
  intro?: string; // 文件夹简介（可选）
  type: AppTypeEnum.folder | AppTypeEnum.toolFolder; // 文件夹类型：普通文件夹或工具文件夹
};

// API 请求处理函数
// 参数：req - API 请求对象，包含请求体数据
async function handler(req: ApiRequestProps<CreateAppFolderBody>) {
  // 从请求体中解构出需要的参数
  const { name, intro, parentId, type } = req.body;

  // 校验必填参数：name 和 type 不能为空
  if (!name || !type) {
    // 返回参数缺失的错误
    return Promise.reject(CommonErrEnum.missingParams);
  }

  // 校验 type 是否为有效的文件夹类型
  if (type !== AppTypeEnum.folder && type !== AppTypeEnum.toolFolder) {
    // 返回无效参数的错误
    return Promise.reject(CommonErrEnum.invalidParams);
  }

  // 权限校验：验证用户是否有权限创建文件夹
  // 使用条件运算符选择不同的认证方式
  const { teamId, tmbId } = parentId
    ? // 如果有 parentId（在某个文件夹下创建），需要验证对该父文件夹的写入权限
      await authApp({ req, appId: parentId, per: WritePermissionVal, authToken: true })
    : // 如果没有 parentId（在根目录创建），需要验证用户有创建应用的权限
      await authUserPer({ req, authToken: true, per: TeamAppCreatePermissionVal });

  // 检查团队的文件夹数量是否已达上限
  await checkTeamAppTypeLimit({ teamId, appCheckType: 'folder' });

  // 创建文件夹（使用 MongoDB 事务确保数据一致性）
  await mongoSessionRun(async (session) => {
    // 在数据库中创建文件夹记录（文件夹在系统中也是一种特殊的 app）
    const app = await MongoApp.create({
      // 解析并设置父级 ID
      ...parseParentIdInMongo(parentId),
      // 设置文件夹图标
      avatar: FolderImgUrl,
      // 设置文件夹名称
      name,
      // 设置文件夹简介
      intro,
      // 设置团队 ID
      teamId,
      // 设置创建者 ID
      tmbId,
      // 设置应用类型（文件夹类型）
      type
    });

    // 为新创建的文件夹设置默认的协作者权限
    await createResourceDefaultCollaborators({
      tmbId, // 创建者 ID
      session, // MongoDB 会话
      resource: app, // 资源对象（刚创建的文件夹）
      resourceType: PerResourceTypeEnum.app // 资源类型为应用
    });
  });

  // 异步记录审计日志（不等待，不影响主流程）
  (async () => {
    addAuditLog({
      tmbId, // 操作者 ID
      teamId, // 团队 ID
      event: AuditEventEnum.CREATE_APP_FOLDER, // 事件类型：创建应用文件夹
      params: {
        folderName: name // 记录文件夹名称
      }
    });
  })();
}

// 使用 NextAPI 中间件包装处理函数并导出
export default NextAPI(handler);
