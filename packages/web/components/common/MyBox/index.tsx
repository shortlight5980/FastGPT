// 这是一个支持加载状态的容器组件
// 主要功能是封装 Chakra UI 的 Box 组件，并在加载时显示 Loading 组件
// 使用 forwardRef 支持 ref 转发，使用 React.memo 优化性能
// 导出 MyBox 组件

// 导入 React 和 forwardRef
// forwardRef 用于将 ref 转发到内部的 DOM 元素或组件
import React, { forwardRef } from 'react';
// 从 Chakra UI 导入 Box 组件和相关类型
// Box: 基础布局容器组件
// BoxProps: Box 组件的属性类型
// SpinnerProps: Spinner 组件的属性类型，用于 size 属性
import { Box, type BoxProps, type SpinnerProps } from '@chakra-ui/react';
// 导入自定义的 Loading 组件，用于显示加载状态
import Loading from '../MyLoading';

// 定义组件的属性类型 Props
// 继承自 BoxProps，并添加了加载状态相关的属性
type Props = BoxProps & {
  isLoading?: boolean; // 是否显示加载状态，可选
  text?: string; // 加载时显示的文本，可选
  size?: SpinnerProps['size']; // 加载动画的大小，可选，类型来自 SpinnerProps
};

// 定义 MyBox 组件
// 使用 forwardRef 包裹，支持 ref 转发
// 第一个参数是组件的 props
// 第二个参数是 ref
const MyBox = ({ text, isLoading, children, size, ...props }: Props, ref: any) => {
  // 渲染组件
  return (
    // 使用 Chakra UI 的 Box 组件
    <Box
      ref={ref} // 转发 ref
      position={isLoading ? 'relative' : 'unset'} // 如果是加载状态，设置为相对定位，否则取消定位
      {...props} // 透传其他属性
    >
      {/* 渲染子组件 */}
      {children}
      {/* 如果是加载状态，显示 Loading 组件 */}
      {isLoading && <Loading fixed={false} text={text} size={size} />}
    </Box>
  );
};

// 使用 React.memo 和 forwardRef 包裹组件后默认导出
// React.memo: 性能优化，避免不必要的重渲染
// forwardRef: 支持 ref 转发
export default React.memo(forwardRef(MyBox));
