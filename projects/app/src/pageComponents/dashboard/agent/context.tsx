// 这是一个应用列表的 Context 管理文件
// 主要功能是管理应用列表、文件夹信息、移动应用等状态和操作
// 使用 React Context API 结合 use-context-selector 库来优化性能
// 导出 AppListContext 和 AppListContextProvider 供其他组件使用

// 导入 React 及其相关的类型和 hooks
// ReactNode: 用于定义 children 的类型
// useCallback: 用于缓存函数引用，避免不必要的重渲染
// useEffect: 用于处理副作用
// useState: 用于管理组件状态
import React, { type ReactNode, useCallback, useEffect, useState } from 'react';
// 从 use-context-selector 库导入 createContext 函数
// 这个库可以创建支持选择性订阅的 Context，避免不必要的组件重渲染
import { createContext } from 'use-context-selector';
// 导入 Next.js 的路由 hook，用于获取路由信息和导航
import { useRouter } from 'next/router';
// 导入自定义的 useRequest hook，用于处理 API 请求
import { useRequest } from '@fastgpt/web/hooks/useRequest';
// 导入应用相关的 API 函数
import { getAppDetailById, getMyApps, putAppById } from '@/web/core/app/api';
// 导入应用相关的类型定义
import { type AppDetailType, type AppListItemType } from '@fastgpt/global/core/app/type';
// 导入获取文件夹路径的 API 函数
import { getAppFolderPath } from '@/web/core/app/api/app';
// 导入文件夹相关的类型定义
import {
  type GetResourceFolderListProps,
  type ParentIdType,
  type ParentTreePathItemType
} from '@fastgpt/global/common/parentFolder/type';
// 导入应用更新参数的类型定义
import { type AppUpdateParams } from '@/global/core/app/api';
// 导入 Next.js 的 dynamic 函数，用于动态导入组件，实现代码分割和懒加载
import dynamic from 'next/dynamic';
// 导入应用类型的枚举常量
import { AppTypeEnum } from '@fastgpt/global/core/app/constants';
// 导入系统状态管理的 hook
import { useSystemStore } from '@/web/common/system/useSystemStore';
// 导入国际化 hook，用于多语言支持
import { useTranslation } from 'next-i18next';
// 动态导入移动文件夹的模态框组件
// 使用 dynamic 可以实现按需加载，减少初始包大小
const MoveModal = dynamic(() => import('@/components/common/folder/MoveModal'));

// 定义应用列表 Context 的类型
// 规范了 Context 中可以提供的数据和方法
type AppListContextType = {
  parentId?: string | null; // 当前文件夹的父级 ID
  appType: AppTypeEnum | 'all'; // 应用类型，可以是特定类型或 'all' 表示所有类型
  myApps: AppListItemType[]; // 我的应用列表数据
  loadMyApps: () => Promise<AppListItemType[]>; // 加载应用列表的异步函数
  isFetchingApps: boolean; // 是否正在获取应用列表的加载状态
  folderDetail: AppDetailType | undefined | null; // 当前文件夹的详细信息
  paths: ParentTreePathItemType[]; // 文件夹路径树，用于面包屑导航
  onUpdateApp: (id: string, data: AppUpdateParams) => Promise<any>; // 更新应用信息的函数
  setMoveAppId: React.Dispatch<React.SetStateAction<string | undefined>>; // 设置要移动的应用 ID 的函数
  refetchFolderDetail: () => Promise<AppDetailType | null>; // 重新获取文件夹详情的函数
  searchKey: string; // 搜索关键词
  setSearchKey: React.Dispatch<React.SetStateAction<string>>; // 设置搜索关键词的函数
};

// 创建并导出应用列表 Context
// 使用 createContext 创建，并设置默认值
// 默认值中的函数会抛出未实现错误，确保在 Provider 外部使用时会被及时发现
export const AppListContext = createContext<AppListContextType>({
  parentId: undefined, // 默认父级 ID 为 undefined
  myApps: [], // 默认应用列表为空数组
  loadMyApps: async function (): Promise<AppListItemType[]> {
    throw new Error('Function not implemented.'); // 默认函数未实现
  },
  isFetchingApps: false, // 默认不在加载中
  folderDetail: undefined, // 默认文件夹详情为 undefined
  paths: [], // 默认路径为空数组
  onUpdateApp: function (id: string, data: AppUpdateParams): Promise<any> {
    throw new Error('Function not implemented.'); // 默认函数未实现
  },
  setMoveAppId: function (value: React.SetStateAction<string | undefined>): void {
    throw new Error('Function not implemented.'); // 默认函数未实现
  },
  appType: 'all', // 默认应用类型为 'all'
  refetchFolderDetail: async function (): Promise<AppDetailType | null> {
    throw new Error('Function not implemented.'); // 默认函数未实现
  },
  searchKey: '', // 默认搜索关键词为空字符串
  setSearchKey: function (value: React.SetStateAction<string>): void {
    throw new Error('Function not implemented.'); // 默认函数未实现
  }
});

// 定义应用列表 Context 的 Provider 组件
// 该组件负责管理应用列表相关的状态和逻辑，并通过 Context 提供给子组件
// 参数 children: 子组件，将被包裹在 Provider 中，可以访问 Context 中的状态和方法
const AppListContextProvider = ({ children }: { children: ReactNode }) => {
  // 获取国际化翻译函数
  const { t } = useTranslation();
  // 获取路由对象，用于访问路由信息
  const router = useRouter();
  // 从路由查询参数中获取 parentId 和 type
  // parentId: 当前文件夹的 ID
  // type: 应用类型
  const { parentId = null, type = 'all' } = router.query as {
    parentId?: string | null;
    type: AppTypeEnum;
  };
  // 定义搜索关键词的状态
  const [searchKey, setSearchKey] = useState('');

  // 使用 useRequest hook 处理获取应用列表的请求
  // data: 返回的应用列表数据，默认为空数组
  // runAsync: 执行请求的异步函数，命名为 loadMyApps
  // loading: 请求是否正在进行的状态，命名为 isFetchingApps
  const {
    data = [],
    runAsync: loadMyApps,
    loading: isFetchingApps
  } = useRequest(
    () => {
      // 根据当前路由路径确定要获取的应用类型
      const formatType = (() => {
        // 如果是聊天页面，显示所有类型的应用
        if (router.pathname.includes('/chat')) {
          return [
            AppTypeEnum.folder, // 普通文件夹
            AppTypeEnum.toolFolder, // 工具文件夹
            AppTypeEnum.simple, // 简单应用
            AppTypeEnum.workflow, // 工作流应用
            AppTypeEnum.workflowTool // 工作流工具
          ];
        }

        // 如果是 Agent 页面
        if (router.pathname.includes('/agent')) {
          // 如果类型为空或 'all'，返回文件夹和所有 Agent 相关类型
          return !type || type === 'all'
            ? [AppTypeEnum.folder, AppTypeEnum.simple, AppTypeEnum.workflow, AppTypeEnum.chatAgent]
            : [AppTypeEnum.folder, type]; // 否则返回文件夹和指定类型
        }

        // 如果是工具页面（默认情况）
        return !type || type === 'all'
          ? [
              AppTypeEnum.toolFolder, // 工具文件夹
              AppTypeEnum.workflowTool, // 工作流工具
              AppTypeEnum.mcpToolSet, // MCP 工具集
              AppTypeEnum.httpToolSet // HTTP 工具集
            ]
          : [AppTypeEnum.toolFolder, type]; // 否则返回工具文件夹和指定类型
      })();

      // 调用 API 获取应用列表，传入父级 ID、类型和搜索关键词
      return getMyApps({ parentId, type: formatType, searchKey });
    },
    {
      manual: false, // 不手动触发，组件挂载时自动执行
      refreshDeps: [searchKey, parentId, type], // 这些依赖变化时自动刷新
      throttleWait: 500, // 节流等待时间，500ms 内只执行一次
      refreshOnWindowFocus: true // 窗口获得焦点时刷新
    }
  );

  // 使用 useRequest hook 处理获取文件夹路径的请求
  // data: 返回的路径数据，默认为空数组
  // runAsync: 执行请求的异步函数，命名为 refetchPaths
  const { data: paths = [], runAsync: refetchPaths } = useRequest(
    () => getAppFolderPath({ sourceId: parentId, type: 'current' }), // 根据 parentId 获取当前路径
    {
      manual: false, // 不手动触发
      refreshDeps: [parentId] // parentId 变化时自动刷新
    }
  );

  // 使用 useRequest hook 处理获取文件夹详情的请求
  // data: 返回的文件夹详情数据
  // runAsync: 执行请求的异步函数，命名为 refetchFolderDetail
  const { data: folderDetail, runAsync: refetchFolderDetail } = useRequest(
    () => {
      // 如果有 parentId，获取对应的文件夹详情
      if (parentId) return getAppDetailById(parentId);
      // 否则返回 null，表示在根目录
      return Promise.resolve(null);
    },
    {
      manual: false, // 不手动触发
      refreshDeps: [parentId] // parentId 变化时自动刷新
    }
  );

  // 使用 useRequest hook 处理更新应用的请求
  // runAsync: 执行请求的异步函数，命名为 onUpdateApp
  const { runAsync: onUpdateApp } = useRequest((id: string, data: AppUpdateParams) =>
    // 调用 API 更新应用信息
    putAppById(id, data).then(async (res) => {
      // 更新成功后，同时刷新文件夹详情、路径和应用列表
      await Promise.all([refetchFolderDetail(), refetchPaths(), loadMyApps()]);
      // 返回 API 响应结果
      return res;
    })
  );

  // 定义要移动的应用 ID 的状态
  const [moveAppId, setMoveAppId] = useState<string>();
  // 使用 useCallback 缓存移动应用的函数
  // 参数 parentId: 目标文件夹的 ID
  const onMoveApp = useCallback(
    async (parentId: ParentIdType) => {
      // 如果没有要移动的应用 ID，直接返回
      if (!moveAppId) return;
      // 调用更新应用的函数，修改其 parentId 为目标文件夹
      await onUpdateApp(moveAppId, { parentId });
    },
    [moveAppId, onUpdateApp] // 依赖项，这些值变化时会重新创建函数
  );

  // 使用 useCallback 缓存获取文件夹列表的函数
  // 该函数用于获取可移动到的目标文件夹列表
  const getAppFolderList = useCallback(
    ({ parentId }: GetResourceFolderListProps) => {
      // 判断当前是否是 Agent 页面
      const isAgent = router.pathname.includes('/agent');
      // 根据页面类型确定文件夹类型
      const folderType = isAgent ? AppTypeEnum.folder : AppTypeEnum.toolFolder;

      // 调用 API 获取应用列表，只获取文件夹类型
      return getMyApps({
        parentId,
        type: folderType
      }).then((res) =>
        res
          // 过滤出用户有写入权限的文件夹
          .filter((item) => item.permission.hasWritePer)
          // 映射成只包含 id 和 name 的对象
          .map((item) => ({
            id: item._id,
            name: item.name
          }))
      );
    },
    [router.pathname] // 依赖项，路径变化时会重新创建函数
  );

  // 从系统状态管理中获取设置上次应用列表路由类型的函数
  const { setLastAppListRouteType } = useSystemStore();
  // 使用 useEffect 处理副作用
  // 当 type 变化时，更新系统状态中的上次应用列表路由类型
  useEffect(() => {
    setLastAppListRouteType(type);
  }, [setLastAppListRouteType, type]); // 依赖项

  // 使用 useMemo 缓存 Context 的值
  // 只有当依赖项变化时，才会重新计算 contextValue
  const contextValue: AppListContextType = {
    parentId, // 当前文件夹 ID
    appType: type, // 应用类型
    myApps: data, // 应用列表数据
    loadMyApps, // 加载应用列表的函数
    refetchFolderDetail, // 刷新文件夹详情的函数
    isFetchingApps, // 加载状态
    folderDetail, // 文件夹详情
    paths, // 路径树
    onUpdateApp, // 更新应用的函数
    setMoveAppId, // 设置要移动的应用 ID 的函数
    searchKey, // 搜索关键词
    setSearchKey // 设置搜索关键词的函数
  };
  // 返回 Context.Provider 组件
  // 将 contextValue 作为 value 传递给 Provider
  // 同时渲染子组件和移动应用的模态框
  return (
    <AppListContext.Provider value={contextValue}>
      {/* 渲染子组件 */}
      {children}
      {/* 如果有要移动的应用 ID，显示移动模态框 */}
      {!!moveAppId && (
        <MoveModal
          moveResourceId={moveAppId} // 要移动的资源 ID
          server={getAppFolderList} // 获取文件夹列表的函数
          title={t('app:move_app')} // 模态框标题，使用国际化
          onClose={() => setMoveAppId(undefined)} // 关闭时清空 moveAppId
          onConfirm={onMoveApp} // 确认移动时的回调函数
          moveHint={t('app:move.hint')} // 移动提示文本，使用国际化
        />
      )}
    </AppListContext.Provider>
  );
};

// 默认导出 AppListContextProvider 组件
// 方便其他文件导入并使用该 Provider 包裹应用组件
export default AppListContextProvider;
