// 父文件夹相关类型定义文件
// 本文件定义了与父文件夹、资源路径相关的数据结构和验证规则
// 主要用于资源管理、文件夹树状结构展示等功能

// 导入 Zod 库，用于数据验证和类型推导
// Zod 是一个 TypeScript 优先的模式声明和验证库，可以创建复杂的验证规则
import z from 'zod';

// 父文件夹 ID 的验证模式
// 用于验证资源的父文件夹 ID 格式是否正确
export const ParentIdSchema = z
  .preprocess(
    // 预处理函数：在验证前先对值进行转换
    // 如果值不是 null 且是对象类型（可能是 ObjectId 对象），则将其转换为字符串
    // 否则保持原值不变
    (value) => (value !== null && typeof value === 'object' ? String(value) : value),
    // 验证字符串格式：必须是 24 位的十六进制字符串（MongoDB ObjectId 格式），或者是空字符串
    // [0-9a-fA-F] 表示允许的字符：数字和大小写字母 a-f
    // {24} 表示恰好 24 个字符
    // ? 表示整个模式可以匹配空字符串
    z.string().regex(/^([0-9a-fA-F]{24})?$/)
  )
  // nullish() 表示值可以是 null 或 undefined
  .nullish();
// ParentIdType 类型：可以是字符串、null 或 undefined
// 从 ParentIdSchema 自动推导出的类型
export type ParentIdType = string | null | undefined;

// 获取路径参数的验证模式
// 用于获取资源路径时的参数验证
export const GetPathPropsSchema = z.object({
  // 源资源 ID，可选参数
  sourceId: ParentIdSchema.optional(),
  // 路径类型，可选参数
  // 'current' 表示当前路径，'parent' 表示父路径
  type: z.enum(['current', 'parent']).optional()
});
// GetPathProps 类型：从 GetPathPropsSchema 推导出来的类型
export type GetPathProps = z.infer<typeof GetPathPropsSchema>;

// 父文件夹树路径项的验证模式
// 用于表示文件夹树路径中的每一个节点
export const ParentTreePathItemSchema = z.object({
  // 父文件夹 ID
  parentId: ParentIdSchema,
  // 父文件夹名称
  parentName: z.string()
});
// ParentTreePathItemType 类型：从 ParentTreePathItemSchema 推导出来的类型
export type ParentTreePathItemType = z.infer<typeof ParentTreePathItemSchema>;

// 获取资源文件夹列表参数的验证模式
// 用于获取某个文件夹下的子文件夹列表时的参数验证
export const GetResourceFolderListPropsSchema = z.object({
  // 父文件夹 ID，用于指定要获取哪个文件夹下的子文件夹
  parentId: ParentIdSchema
});
// GetResourceFolderListProps 类型：从 GetResourceFolderListPropsSchema 推导出来的类型
export type GetResourceFolderListProps = z.infer<typeof GetResourceFolderListPropsSchema>;

// 获取资源文件夹列表项响应的验证模式
// 用于定义 API 返回的单个文件夹项的数据结构
export const GetResourceFolderListItemResponseSchema = z.object({
  // 文件夹名称
  name: z.string(),
  // 文件夹 ID
  id: z.string()
});
// GetResourceFolderListItemResponse 类型：从 GetResourceFolderListItemResponseSchema 推导出来的类型
export type GetResourceFolderListItemResponse = z.infer<
  typeof GetResourceFolderListItemResponseSchema
>;

// 获取资源列表项响应的验证模式
// 扩展自文件夹列表项响应模式，增加了资源特有的字段
// 用于定义 API 返回的单个资源项的数据结构
export const GetResourceListItemResponseSchema = GetResourceFolderListItemResponseSchema.extend({
  // 资源的头像/图标 URL
  avatar: z.string(),
  // 标识是否为文件夹
  // true 表示是文件夹，false 表示是普通资源
  isFolder: z.boolean()
});
// GetResourceListItemResponse 类型：从 GetResourceListItemResponseSchema 推导出来的类型
export type GetResourceListItemResponse = z.infer<typeof GetResourceListItemResponseSchema>;
