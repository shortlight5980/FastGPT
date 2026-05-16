// 这是一个自定义的模态框组件
// 主要功能是封装 Chakra UI 的 Modal 组件进行二次封装，提供更统一的样式和更便捷的 API
// 支持图标、标题、加载状态等功能
// 导出 MyModal 组件和 MyModalProps 接口

// 导入 React 库
import React from 'react';
// 从 Chakra UI 导入需要的模态框相关组件和类型
// Modal: 模态框容器组件
// ModalOverlay: 模态框遮罩层组件
// ModalContent: 模态框内容容器
// ModalHeader: 模态框头部
// ModalCloseButton: 模态框关闭按钮
// ModalContentProps: ModalContent 组件的属性类型
// Box: 布局容器组件
// ImageProps: Image 组件的属性类型，用于 iconColor
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  type ModalContentProps,
  Box,
  type ImageProps
} from '@chakra-ui/react';
// 导入自定义的 MyBox 组件，用于包裹内容并支持加载状态
import MyBox from '../MyBox';
// 导入 useSystem hook，用于判断当前是否是 PC 设备
import { useSystem } from '../../../hooks/useSystem';
// 导入 Avatar 组件，用于显示图标
import Avatar from '../Avatar';

// 导出 MyModal 组件的属性接口定义
// 继承自 ModalContentProps，扩展了一些自定义属性
export interface MyModalProps extends ModalContentProps {
  iconSrc?: string; // 图标的路径，可选
  iconColor?: ImageProps['color']; // 图标的颜色，可选，类型来自 ImageProps
  title?: any; // 模态框标题，可选，类型为 any 以支持多种类型的标题内容
  isCentered?: boolean; // 是否居中显示，可选
  isLoading?: boolean; // 是否显示加载状态，可选
  isOpen?: boolean; // 模态框是否打开，可选
  onClose?: () => void; // 关闭模态框的回调函数，可选
  closeOnOverlayClick?: boolean; // 点击遮罩层是否关闭模态框，可选
  size?: 'md' | 'lg'; // 模态框大小，可选，支持 'md' 或 'lg'
  showCloseButton?: boolean; // 是否显示关闭按钮，可选
}

// 定义 MyModal 组件
// 这是一个二次封装的模态框组件，提供统一的样式和功能
const MyModal = ({
  isOpen = true, // 模态框是否打开，默认为 true
  onClose, // 关闭模态框的函数
  iconSrc, // 图标的路径
  title, // 模态框标题
  children, // 子组件，模态框的内容
  isCentered, // 是否居中显示
  isLoading, // 是否显示加载状态
  w = 'auto', // 宽度，默认为 'auto'
  maxW = ['90vw', '600px'], // 最大宽度，响应式：移动端 90vw，PC 端 600px
  closeOnOverlayClick = true, // 点击遮罩层是否关闭，默认为 true
  iconColor, // 图标颜色
  size = 'md', // 模态框大小，默认为 'md'
  showCloseButton = true, // 是否显示关闭按钮，默认为 true
  ...props // 其他属性，透传给 ModalContent
}: MyModalProps) => {
  // 获取是否是 PC 设备
  const { isPc } = useSystem();

  // 渲染组件
  return (
    // 使用 Chakra UI 的 Modal 组件
    <Modal
      isOpen={isOpen} // 控制模态框是否显示
      onClose={() => onClose && onClose()} // 关闭时的回调，只有 onClose 存在时才调用
      size={size} // 模态框大小
      autoFocus={false} // 不自动聚焦
      isCentered={isPc ? isCentered : true} // PC 端使用传入的 isCentered，移动端强制居中
      blockScrollOnMount={false} // 打开时不阻止页面滚动
      allowPinchZoom // 允许双指缩放
      scrollBehavior={'inside'} // 滚动行为：在模态框内部滚动
      closeOnOverlayClick={closeOnOverlayClick} // 点击遮罩层是否关闭
      returnFocusOnClose={false} // 关闭时不返回焦点
    >
      {/* 模态框遮罩层 */}
      <ModalOverlay zIndex={props.zIndex} />
      {/* 模态框内容容器 */}
      <ModalContent
        w={w} // 宽度
        minW={['90vw', '400px']} // 最小宽度，响应式
        maxW={maxW} // 最大宽度
        position={'relative'} // 相对定位
        maxH={'85vh'} // 最大高度为视口高度的 85%
        boxShadow={'7'} // 阴影样式
        containerProps={{
          zIndex: props.zIndex // 容器的 z-index
        }}
        {...props} // 透传其他属性
      >
        {/* 如果没有标题但有关闭函数且显示关闭按钮，则显示关闭按钮 */}
        {!title && onClose && showCloseButton && <ModalCloseButton zIndex={1} />}
        {/* 如果有标题，则渲染标题栏 */}
        {!!title && (
          // 模态框头部
          <ModalHeader
            display={'flex'} // 使用 flex 布局
            alignItems={'center'} // 垂直居中对齐
            background={'#FBFBFC'} // 背景颜色
            borderBottom={'1px solid #F4F6F8'} // 底部边框
            roundedTop={'lg'} // 顶部圆角
            py={'10px'} // 上下内边距
            fontSize={'md'} // 字体大小
            fontWeight={'bold'} // 字体粗细
            minH={['46px', '53px']} // 最小高度，响应式
          >
            {/* 如果有图标路径，则渲染图标 */}
            {iconSrc && (
              <>
                {/* 使用 Avatar 组件显示图标 */}
                <Avatar
                  color={iconColor} // 图标颜色
                  objectFit={'contain'} // 图片适配方式
                  alt="" // 替代文本，空字符串
                  src={iconSrc} // 图标路径
                  w={'20px'} // 宽度
                  borderRadius={'sm'} // 圆角大小
                />
              </>
            )}
            {/* 标题容器 */}
            <Box ml={iconSrc ? 3 : 0} color={'myGray.900'} fontWeight={'500'}>
              {/* 标题内容 */}
              {title}
            </Box>
            {/* 占位容器，占据剩余空间，将关闭按钮推到右边 */}
            <Box flex={1} />
            {/* 如果有关闭函数，则渲染关闭按钮 */}
            {onClose && (
              <ModalCloseButton position={'relative'} fontSize={'xs'} top={0} right={0} />
            )}
          </ModalHeader>
        )}

        {/* 使用 MyBox 包裹内容，支持加载状态 */}
        <MyBox
          isLoading={isLoading} // 是否显示加载状态
          overflow={props.overflow || 'overlay'} // 溢出处理，默认为 'overlay'
          h={'100%'} // 高度 100%
          display={'flex'} // 使用 flex 布局
          flexDirection={'column'} // 垂直方向排列
        >
          {/* 子组件内容 */}
          {children}
        </MyBox>
      </ModalContent>
    </Modal>
  );
};

// 使用 React.memo 包裹组件并默认导出
// React.memo 可以避免不必要的重渲染，提高性能
export default React.memo(MyModal);
