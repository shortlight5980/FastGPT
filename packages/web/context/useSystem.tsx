// 这是一个系统状态管理的 Context 文件
// 主要功能是管理和提供设备类型信息（PC 或移动端）
// 使用 React Context API 结合 use-context-selector 库来优化性能
// 导出 useSystemStoreContext 和 SystemStoreContextProvider 供其他组件使用

// 导入 React 及其相关的类型和 hooks
// ReactNode: 用于定义 children 的类型
// useMemo: 用于缓存计算结果，避免不必要的重新计算
// useEffect: 用于处理副作用
import React, { type ReactNode, useMemo, useEffect } from 'react';
// 从 use-context-selector 库导入 createContext 函数
// 这个库可以创建支持选择性订阅的 Context，避免不必要的组件重渲染
import { createContext } from 'use-context-selector';
// 从 Chakra UI 导入 useMediaQuery hook
// 用于检测媒体查询，判断当前屏幕宽度是否符合 PC 设备标准
import { useMediaQuery } from '@chakra-ui/react';
// 导入 js-cookie 库，用于操作浏览器 Cookie
import Cookies from 'js-cookie';

// 定义存储设备尺寸信息的 Cookie 和 localStorage 的键名常量
const CookieKey = 'NEXT_DEVICE_SIZE';

// 定义设置设备尺寸信息的函数
// 该函数会同时更新 Cookie 和 localStorage，确保设备信息持久化存储
// 参数 value: 要存储的设备尺寸值，通常是 'pc' 或 'mobile'
const setSize = (value: string) => {
  // 将设备尺寸信息存储到 Cookie 中，设置 30 天后过期
  Cookies.set(CookieKey, value, { expires: 30 });
  // 将设备尺寸信息也存储到 localStorage 中，作为额外的数据备份
  localStorage.setItem(CookieKey, value);
};

// 定义系统 Context 的类型
// 规范了 Context 中可以提供的数据结构
type useSystemContextType = {
  isPc: boolean; // 标识当前设备是否是 PC 设备
};

// 创建并导出系统状态 Context
// 使用 createContext 创建，初始值设置为 isPc: true（默认认为是 PC 设备）
// 这个 Context 将用于在应用中传递设备类型信息
export const useSystemStoreContext = createContext<useSystemContextType>({
  isPc: true
});

// 定义系统状态 Context 的 Provider 组件
// 该组件负责管理系统状态，并通过 Context 将状态提供给子组件
// 参数 children: 子组件，将被包裹在 Provider 中，可以访问 Context 中的状态
// 参数 device: 可选的设备类型参数，用于服务端渲染或初始状态设置
const SystemStoreContextProvider = ({
  children,
  device
}: {
  children: ReactNode;
  device?: 'pc' | 'mobile' | null;
}) => {
  // 使用 useMediaQuery hook 判断当前屏幕宽度是否大于等于 900px
  // 返回值 isPc: 如果屏幕宽度 >= 900px 则为 true，表示是 PC 设备
  // fallback 选项: 当媒体查询无法使用时（如服务端渲染），使用传入的 device 参数判断
  const [isPc] = useMediaQuery('(min-width: 900px)', {
    fallback: device === 'pc'
  });

  // 使用 useEffect hook 处理副作用
  // 当 isPc 值发生变化时，自动更新 Cookie 和 localStorage 中的设备信息
  // 依赖数组 [isPc] 表示只有 isPc 变化时才会执行这个 effect
  useEffect(() => {
    // 根据 isPc 的值调用 setSize 函数，存储 'pc' 或 'mobile'
    setSize(isPc ? 'pc' : 'mobile');
  }, [isPc]);

  // 使用 useMemo hook 缓存 Context 的值
  // 只有当 isPc 发生变化时，才会重新计算 contextValue
  // 这样可以避免不必要的子组件重渲染，优化性能
  const contextValue = useMemo(
    () => ({
      isPc // 向 Context 中提供 isPc 状态
    }),
    [isPc] // 依赖数组，当 isPc 变化时重新计算
  );

  // 返回 Context.Provider 组件
  // 将 contextValue 作为 value 传递给 Provider
  // 所有被包裹的子组件都可以通过 useSystemStoreContext 访问到 isPc 状态
  return (
    <useSystemStoreContext.Provider value={contextValue}>{children}</useSystemStoreContext.Provider>
  );
};

// 默认导出 SystemStoreContextProvider 组件
// 方便其他文件导入并使用该 Provider 包裹应用组件
export default SystemStoreContextProvider;
