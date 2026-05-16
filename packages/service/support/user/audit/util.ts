// 这是一个审计日志相关的工具函数文件
// 主要功能是提供获取各种类型的国际化文本和添加审计日志的函数
// 导出多个国际化转换函数和添加审计日志的函数

// 导入应用类型枚举
import { AppTypeEnum } from '@fastgpt/global/core/app/constants';
// 导入数据集类型枚举
import { DatasetTypeEnum } from '@fastgpt/global/core/dataset/constants';
// 导入智能体技能类型枚举
import { AgentSkillTypeEnum } from '@fastgpt/global/core/agentSkills/constants';
// 导入国际化翻译函数
import { i18nT } from '../../../../web/i18n/utils';
// 导入团队审计日志的数据模型
import { MongoTeamAudit } from './schema';
// 导入审计事件相关的类型定义
// AdminAuditEventEnum: 管理员审计事件枚举
// AuditEventEnum: 审计事件枚举
// AdminAuditEventParamsType: 管理员审计事件参数类型
// AuditEventParamsType: 审计事件参数类型
import type {
  AdminAuditEventEnum,
  AuditEventEnum,
  AdminAuditEventParamsType,
  AuditEventParamsType
} from '@fastgpt/global/support/user/audit/constants';
// 导入重试函数（用于失败时自动重试）
import { retryFn } from '@fastgpt/global/common/system/utils';

// 获取应用类型的国际化文本
// 参数：type - 应用类型枚举
// 返回值：对应的国际化文本
export function getI18nAppType(type: AppTypeEnum): string {
  if (type === AppTypeEnum.folder) return i18nT('account_team:type.Folder');
  if (type === AppTypeEnum.simple) return i18nT('app:type.Chat_Agent');
  if (type === AppTypeEnum.chatAgent) return 'Agent';
  if (type === AppTypeEnum.workflow) return i18nT('account_team:type.Workflow bot');
  if (type === AppTypeEnum.workflowTool) return i18nT('app:toolType_workflow');
  if (type === AppTypeEnum.httpPlugin) return i18nT('account_team:type.Http plugin');
  if (type === AppTypeEnum.httpToolSet) return i18nT('app:toolType_http');
  if (type === AppTypeEnum.mcpToolSet) return i18nT('app:toolType_mcp');
  if (type === AppTypeEnum.tool) return i18nT('app:toolType_mcp');
  // 未知类型返回默认的未知文本
  return i18nT('common:UnKnow');
}

// 获取协作者类型的国际化文本
// 参数：tmbId - 团队成员 ID，groupId - 群组 ID，orgId - 组织 ID
// 返回值：对应的国际化文本（成员/群组/部门/未知）
export function getI18nCollaboratorItemType(
  tmbId: string | undefined,
  groupId: string | undefined,
  orgId: string | undefined
): string {
  if (tmbId) return i18nT('account_team:member');
  if (groupId) return i18nT('account_team:group');
  if (orgId) return i18nT('account_team:department');
  return i18nT('common:UnKnow');
}

// 获取数据集类型的国际化文本
// 参数：type - 数据集类型枚举或字符串
// 返回值：对应的国际化文本
export function getI18nDatasetType(type: DatasetTypeEnum | string): string {
  if (type === DatasetTypeEnum.folder) return i18nT('account_team:dataset.folder_dataset');
  if (type === DatasetTypeEnum.dataset) return i18nT('account_team:dataset.common_dataset');
  if (type === DatasetTypeEnum.websiteDataset) return i18nT('account_team:dataset.website_dataset');
  if (type === DatasetTypeEnum.externalFile) return i18nT('account_team:dataset.external_file');
  if (type === DatasetTypeEnum.apiDataset) return i18nT('account_team:dataset.api_file');
  if (type === DatasetTypeEnum.feishu) return i18nT('account_team:dataset.feishu_dataset');
  if (type === DatasetTypeEnum.yuque) return i18nT('account_team:dataset.yuque_dataset');
  return i18nT('common:UnKnow');
}

// 获取技能类型的国际化文本
// 参数：type - 智能体技能类型枚举或字符串
// 返回值：对应的国际化文本
export function getI18nSkillType(type: AgentSkillTypeEnum | string): string {
  if (type === AgentSkillTypeEnum.folder) return i18nT('account_team:skill.folder');
  if (type === AgentSkillTypeEnum.skill) return i18nT('account_team:skill.skill');
  return i18nT('common:UnKnow');
}

// 获取通知级别的国际化文本
// 参数：level - 通知级别字符串
// 返回值：对应的国际化文本（普通/重要/紧急/未知）
export function getI18nInformLevel(level: string): string {
  if (level === 'common') return i18nT('account_team:inform_level_common');
  if (level === 'important') return i18nT('account_team:inform_level_important');
  if (level === 'emergency') return i18nT('account_team:inform_level_emergency');
  return i18nT('common:UnKnow');
}

// addAuditLog 函数重载：处理普通审计事件
export function addAuditLog<T extends AuditEventEnum>({
  teamId,
  tmbId,
  event,
  params
}: {
  tmbId: string;
  teamId: string;
  event: T;
  params?: AuditEventParamsType[T];
}): void;

// addAuditLog 函数重载：处理管理员审计事件
export function addAuditLog<T extends AdminAuditEventEnum>({
  teamId,
  tmbId,
  event,
  params
}: {
  tmbId: string;
  teamId: string;
  event: T;
  params?: AdminAuditEventParamsType[T];
}): void;

// 添加审计日志的实际函数实现
// 使用函数重载提供更好的类型提示
// 参数：
//   teamId - 团队 ID
//   tmbId - 团队成员 ID
//   event - 审计事件类型
//   params - 事件相关的参数（可选）
export function addAuditLog<T extends AuditEventEnum | AdminAuditEventEnum>({
  teamId,
  tmbId,
  event,
  params
}: {
  tmbId: string;
  teamId: string;
  event: T;
  params?: any;
}) {
  // 使用重试函数来执行日志创建，避免临时失败导致日志丢失
  retryFn(() =>
    // 在数据库中创建审计日志记录
    MongoTeamAudit.create({
      tmbId: tmbId, // 操作者 ID
      teamId: teamId, // 团队 ID
      event, // 事件类型
      metadata: params // 事件元数据（参数）
    })
  );
}
