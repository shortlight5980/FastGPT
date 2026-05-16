// 这是一个系统信息获取的 React Hook 文件
// 主要功能是提供当前运行环境的系统信息，如是否是 PC 设备、是否是 Mac 系统
// 导出一个 useSystem Hook 函数供其他组件使用

// 从系统上下文文件中导入 useSystemStoreContext，这是存储系统状态的 Context
import { useSystemStoreContext } from '../context/useSystem';
// 导入 useContextSelector 函数，用于从 Context 中选择性地获取特定状态值，避免不必要的重渲染
import { useContextSelector } from 'use-context-selector';

// 定义并导出 useSystem 自定义 Hook
// 该 Hook 不需要接收任何参数，返回一个包含系统信息的对象
export const useSystem = () => {
  // 从系统状态 Context 中获取 isPc 状态
  // isPc 表示当前设备是否是 PC 设备
  const isPc = useContextSelector(useSystemStoreContext, (state) => state.isPc);

  // 判断当前操作系统是否是 Mac 系统
  // 首先检查 window 对象是否存在（避免在服务端渲染时出错）
  // 然后通过 navigator.userAgent 获取用户代理字符串并转为小写
  // 最后检查字符串中是否包含 'mac' 来判断是否是 Mac 系统
  const isMac =
    typeof window !== 'undefined' && window.navigator.userAgent.toLocaleLowerCase().includes('mac');

  // 返回一个对象，包含 isPc 和 isMac 两个布尔值
  return { isPc, isMac };
};
