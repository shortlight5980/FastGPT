// 这是一个自定义的 Toast 提示 hook 文件
// 主要功能是封装 Chakra UI 的 useToast，添加国际化支持和默认配置
// 导出一个自定义的 useToast hook

// 从 @chakra-ui/react 导入 useToast（重命名为 uToast）和其类型 UseToastOptions
// useToast 是 Chakra UI 提供的用于显示消息提示的 hook
import { useToast as uToast, type UseToastOptions } from '@chakra-ui/react';
// 从 react 导入 CSSProperties 类型和 useCallback hook
// CSSProperties 用于类型化 CSS 样式对象
// useCallback 用于缓存函数引用，优化性能
import { type CSSProperties, useCallback } from 'react';
// 从 next-i18next 导入 useTranslation hook
// 用于国际化翻译功能
import { useTranslation } from 'next-i18next';

// 定义并导出自定义的 useToast hook
// 接受一个可选的 props 参数，它是 UseToastOptions 和一个包含 containerStyle 的对象的联合类型
// UseToastOptions 是 Chakra UI 定义的 Toast 配置选项类型
// containerStyle 是可选的 CSS 样式对象，用于自定义 Toast 容器的样式
export const useToast = (props?: UseToastOptions & { containerStyle?: CSSProperties }) => {
  // 解构 props，分离出 containerStyle 和其他 toastProps
  // 如果 props 为空，则使用空对象 {} 作为默认值
  const { containerStyle, ...toastProps } = props || {};
  // 调用 useTranslation hook 获取翻译函数 t
  // t 函数用于将文本键转换为对应语言的翻译文本
  const { t } = useTranslation();

  // 调用 Chakra UI 的 uToast hook，传入配置选项
  // 这里设置了一些默认配置，同时允许用户通过 props 覆盖
  const toast = uToast({
    // Toast 显示在屏幕顶部
    position: 'top',
    // Toast 显示 2000 毫秒（2秒）后自动消失
    duration: 2000,
    // 容器样式配置
    containerStyle: {
      // 默认字体大小为 'sm'（小）
      fontSize: 'sm',
      // 合并用户传入的 containerStyle，用户配置会覆盖默认配置
      ...containerStyle
    },
    // 合并用户传入的其他 toastProps
    ...toastProps
  });

  // 定义自定义的 myToast 函数，使用 useCallback 缓存
  // useCallback 的依赖数组是 [props]，当 props 变化时会重新创建函数
  const myToast = useCallback(
    // 接受一个可选的 options 参数，类型为 UseToastOptions
    (options?: UseToastOptions) => {
      // 只有当 options 中有 title 或 description 时才显示 Toast
      // 这样可以避免显示空的 Toast
      if (options?.title || options?.description) {
        // 调用 toast 函数显示提示
        toast({
          // 如果有 title，使用 t 函数翻译后再显示
          ...(options.title && { title: t(options.title as any) }),
          // 如果有 description，使用 t 函数翻译后再显示
          ...(options.description && { description: t(options.description as any) }),
          // 合并用户传入的其他 options
          ...options
        });
      }
    },
    // 依赖数组：当 props 变化时，重新创建 myToast 函数
    [props]
  );

  // 返回一个对象，包含自定义的 toast 函数
  // 这样使用时可以通过 const { toast } = useToast() 来获取
  return {
    toast: myToast
  };
};
