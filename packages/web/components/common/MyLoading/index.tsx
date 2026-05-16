// 这是一个通用的加载动画组件文件
// 主要功能是显示一个居中的加载 spinner，支持自定义背景、文字、定位方式等
// 导出一个使用 React.memo 优化后的 Loading 组件

// 导入 React 库，这是创建 React 组件所必需的
import React from 'react';
// 从 Chakra UI 导入需要的组件和类型
// Spinner: 加载旋转图标组件
// Flex: 弹性布局容器组件
// Box: 基础盒子组件
// SpinnerProps: Spinner 组件的属性类型，用于类型定义
import { Spinner, Flex, Box, type SpinnerProps } from '@chakra-ui/react';

// 定义 Loading 组件，这是一个函数组件
// 接收一个配置对象作为参数，包含多个可选属性，都有默认值
const Loading = ({
  fixed = true, // 是否使用固定定位（fixed），默认为 true
  text = '', // 加载时显示的文字，默认为空字符串（不显示）
  bg = 'rgba(255,255,255,0.5)', // 背景颜色，默认为半透明白色
  zIndex = 1000, // 层级，默认为 1000（确保在最上层）
  size = 'lg' // spinner 大小，默认为大号
}: {
  fixed?: boolean; // fixed 属性的类型定义：可选的布尔值
  text?: string; // text 属性的类型定义：可选的字符串
  bg?: string; // bg 属性的类型定义：可选的字符串
  zIndex?: number; // zIndex 属性的类型定义：可选的数字
  size?: SpinnerProps['size']; // size 属性的类型定义：使用 Spinner 组件的 size 类型
}) => {
  // 返回组件的 JSX 结构
  return (
    // 使用 Flex 组件作为容器，实现居中布局
    <Flex
      // 根据 fixed 参数决定使用 fixed 还是 absolute 定位
      // fixed: 相对于视口定位，不随滚动条滚动
      // absolute: 相对于最近的定位祖先元素定位
      position={fixed ? 'fixed' : 'absolute'}
      // 根据 fixed 参数设置 z-index 层级
      // 如果是 fixed 定位，使用传入的 zIndex；否则使用 10
      zIndex={fixed ? zIndex : 10}
      bg={bg} // 设置背景颜色
      borderRadius={'md'} // 设置圆角为中等大小
      top={0} // 定位到顶部 0
      left={0} // 定位到左侧 0
      right={0} // 定位到右侧 0
      bottom={0} // 定位到底部 0，这样四个方向都是 0 会让容器铺满整个父元素/视口
      alignItems={'center'} // 垂直方向居中对齐
      justifyContent={'center'} // 水平方向居中对齐
      flexDirection={'column'} // 主轴方向为列（垂直排列）
    >
      {/* 渲染 Spinner 加载图标 */}
      <Spinner
        thickness="4px" // spinner 线条的粗细为 4px
        speed="0.65s" // 旋转一圈的时间为 0.65 秒
        emptyColor="myGray.100" // spinner 空白部分的颜色
        color="primary.500" // spinner 主要颜色（主题色）
        size={size} // spinner 大小，使用传入的参数
      />
      {/* 如果有传入 text 参数（不为空），则显示文字 */}
      {text && (
        // 使用 Box 组件包裹文字
        <Box mt={2} color="primary.600" fontWeight={'bold'}>
          {/* mt={2}: 上边距为 2 个单位 */}
          {/* color: 文字颜色为主题色 600 */}
          {/* fontWeight: 文字加粗 */}
          {text} {/* 显示传入的文字内容 */}
        </Box>
      )}
    </Flex>
  );
};

// 导出 Loading 组件，并使用 React.memo 进行性能优化
// React.memo 是一个高阶组件，它会对 props 进行浅比较
// 如果 props 没有变化，组件就不会重新渲染，从而提高性能
export default React.memo(Loading);
