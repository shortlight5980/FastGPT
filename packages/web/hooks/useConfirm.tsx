// 这是一个自定义的确认对话框 hook 文件
// 主要功能是提供一个可复用的确认对话框组件和控制方法
// 支持普通确认、删除确认、输入确认文本、倒计时等功能
// 导出 useConfirm hook

// 导入 React 及常用 hooks
// useEffect：处理副作用
// useMemo：性能优化，缓存计算结果
// useRef：保存可变引用
// useState：管理组件状态
import React, { useEffect, useMemo, useRef, useState } from 'react';
// 从 @chakra-ui/react 导入 UI 组件和 hooks
// useDisclosure：用于控制模态框的打开/关闭状态
// Button：按钮组件
// ModalBody：模态框主体组件
// ModalFooter：模态框底部组件
// Input：输入框组件
// VStack：垂直排列的堆栈组件
// Box：通用容器组件
// ImageProps：图片组件的属性类型
import {
  useDisclosure,
  Button,
  ModalBody,
  ModalFooter,
  Input,
  VStack,
  Box,
  type ImageProps
} from '@chakra-ui/react';
// 从 next-i18next 导入国际化相关组件和 hooks
// Trans：用于翻译包含变量或组件的文本
// useTranslation：用于获取翻译函数
import { Trans, useTranslation } from 'next-i18next';
// 导入自定义的模态框组件
import MyModal from '../components/common/MyModal';
// 从 ahooks 导入 useMemoizedFn，用于持久化函数引用
import { useMemoizedFn } from 'ahooks';
// 导入自定义的 useMemoEnhance hook
import { useMemoEnhance } from './useMemoEnhance';

// 定义并导出 useConfirm hook
// 接受一个可选的 props 参数，用于配置确认对话框
export const useConfirm = (props?: {
  // 对话框标题
  title?: string;
  // 图标资源路径
  iconSrc?: string | '';
  // 对话框内容
  content?: string;
  // 是否显示取消按钮，默认显示
  showCancel?: boolean;
  // 对话框类型：普通确认或删除确认
  type?: 'common' | 'delete';
  // 是否隐藏底部按钮区域
  hideFooter?: boolean;
  // 图标颜色
  iconColor?: ImageProps['color'];
  // 输入确认文本（需要用户输入指定文本才能确认）
  inputConfirmText?: string;
}) => {
  // 获取翻译函数 t
  const { t } = useTranslation();

  // 使用 useMemoEnhance 缓存不同类型对话框的配置
  const map = useMemoEnhance(() => {
    // 定义配置映射对象
    const map = {
      // 普通确认类型的配置
      common: {
        title: t('common:action_confirm'),
        variant: 'primary',
        iconSrc: 'common/confirm/commonTip'
      },
      // 删除确认类型的配置
      delete: {
        title: t('common:delete_warning'),
        variant: 'dangerFill',
        iconSrc: 'common/confirm/deleteTip'
      }
    };
    // 如果 props 中指定了类型且该类型存在于 map 中，返回对应配置
    if (props?.type && map[props.type]) return map[props.type];
    // 默认返回普通确认类型的配置
    return map.common;
  }, [props?.type, t]);

  // 解构 props，设置默认值
  const {
    // 对话框标题，默认使用 map 中的标题或通用警告
    title = map?.title || t('common:Warning'),
    // 图标资源路径，默认使用 map 中的图标
    iconSrc = map?.iconSrc,
    // 图标颜色
    iconColor,
    // 对话框内容
    content,
    // 是否显示取消按钮，默认显示
    showCancel = true,
    // 是否隐藏底部，默认不隐藏
    hideFooter = false,
    // 输入确认文本，重命名为 initialInputConfirmText
    inputConfirmText: initialInputConfirmText
  } = props || {};
  // 使用 useState 管理自定义内容状态
  const [customContent, setCustomContent] = useState<string | React.ReactNode>(content);
  // 使用 useState 管理自定义输入确认文本状态
  const [customContentInputConfirmText, setCustomContentInputConfirmText] = useState<
    string | undefined
  >(initialInputConfirmText);

  // 使用 useDisclosure 管理模态框的打开/关闭状态
  const { isOpen, onOpen, onClose } = useDisclosure();

  // 使用 useRef 保存确认回调函数的引用
  const confirmCb = useRef<Function>();
  // 使用 useRef 保存取消回调函数的引用
  const cancelCb = useRef<any>();

  // 使用 useMemoizedFn 持久化 openConfirm 函数
  const openConfirm = useMemoizedFn(
    // 接受一个配置对象参数
    ({
      onConfirm,
      onCancel,
      customContent,
      inputConfirmText
    }: {
      onConfirm?: Function;
      onCancel?: any;
      customContent?: string | React.ReactNode;
      inputConfirmText?: string;
    }) => {
      // 保存确认回调函数到 ref
      confirmCb.current = onConfirm;
      // 保存取消回调函数到 ref
      cancelCb.current = onCancel;

      // 设置自定义内容
      setCustomContent(customContent || content);
      // 设置自定义输入确认文本
      setCustomContentInputConfirmText(inputConfirmText || initialInputConfirmText);

      // 返回 onOpen 函数，调用后可打开对话框
      return onOpen;
    }
  );

  // 使用 useMemoizedFn 持久化 ConfirmModal 组件函数
  const ConfirmModal = useMemoizedFn(
    // 接受一个配置对象参数
    ({
      closeText = t('common:Cancel'),
      confirmText = t('common:Confirm'),
      isLoading,
      countDown = 0
    }: {
      closeText?: string;
      confirmText?: string;
      isLoading?: boolean;
      countDown?: number;
    }) => {
      // 判断是否为输入确认模式
      const isInputDelete = !!customContentInputConfirmText;

      // 使用 ref 保存定时器引用
      const timer = useRef<any>();
      // 使用 useState 管理倒计时数值
      const [countDownAmount, setCountDownAmount] = useState(countDown);
      // 使用 useState 管理请求中状态
      const [requesting, setRequesting] = useState(false);
      // 使用 useState 管理输入框的值
      const [inputValue, setInputValue] = useState('');

      // 使用 useEffect 处理倒计时逻辑
      useEffect(() => {
        // 当模态框打开时
        if (isOpen) {
          // 重置倒计时数值
          setCountDownAmount(countDown);
          // 清空输入框
          setInputValue('');
          // 设置定时器，每秒执行一次
          timer.current = setInterval(() => {
            // 更新倒计时数值
            setCountDownAmount((val) => {
              // 如果倒计时小于等于 0，清除定时器
              if (val <= 0) {
                clearInterval(timer.current);
              }
              // 返回减 1 后的值
              return val - 1;
            });
          }, 1000);

          // 组件卸载时的清理函数
          return () => {
            // 清除定时器
            clearInterval(timer.current);
          };
        }
      }, [isOpen]);

      // 计算输入确认是否有效
      const isInputDeleteConfirmValid = !isInputDelete
        ? // 如果不是输入确认模式，始终有效
          true
        : // 如果是输入确认模式，检查输入值是否与确认文本一致
          !!customContentInputConfirmText &&
          inputValue.trim() === customContentInputConfirmText.trim();

      // 渲染 MyModal 组件
      return (
        <MyModal
          isOpen={isOpen}
          iconSrc={iconSrc}
          iconColor={iconColor}
          title={title}
          maxW={['90vw', '400px']}
        >
          {/* 模态框主体 */}
          <ModalBody pt={5} whiteSpace={'pre-wrap'} fontSize={'sm'}>
            {/* 如果是输入确认模式 */}
            {isInputDelete ? (
              <VStack align={'stretch'} spacing={3}>
                {/* 显示自定义内容 */}
                <Box whiteSpace={'pre-wrap'}>{customContent}</Box>
                <Box>
                  {/* 显示输入确认提示，使用 Trans 组件进行国际化 */}
                  <Trans
                    i18nKey={'common:confirm_input_delete_tip'}
                    values={{ confirmText: customContentInputConfirmText }}
                    components={{
                      bold: <Box as={'span'} fontWeight={'bold'} userSelect={'all'} />
                    }}
                  />
                </Box>
                {/* 输入框组件 */}
                <Input
                  size={'sm'}
                  value={inputValue}
                  autoFocus
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder={t('common:confirm_input_delete_placeholder', {
                    confirmText: customContentInputConfirmText
                  })}
                />
              </VStack>
            ) : (
              // 如果不是输入确认模式，直接显示自定义内容
              customContent
            )}
          </ModalBody>
          {/* 如果不隐藏底部，显示底部按钮区域 */}
          {!hideFooter && (
            <ModalFooter>
              {/* 如果显示取消按钮 */}
              {showCancel && (
                <Button
                  size={'sm'}
                  variant={'whiteBase'}
                  onClick={() => {
                    // 关闭模态框
                    onClose();
                    // 如果取消回调是函数，执行它
                    typeof cancelCb.current === 'function' && cancelCb.current();
                  }}
                  px={5}
                >
                  {closeText}
                </Button>
              )}

              {/* 确认按钮 */}
              <Button
                size={'sm'}
                variant={map.variant}
                isDisabled={countDownAmount > 0 || (isInputDelete && !isInputDeleteConfirmValid)}
                ml={3}
                isLoading={isLoading || requesting}
                px={5}
                onClick={async () => {
                  // 设置请求中状态为 true
                  setRequesting(true);
                  try {
                    // 如果确认回调是函数，执行它
                    typeof confirmCb.current === 'function' && (await confirmCb.current());
                    // 关闭模态框
                    onClose();
                  } catch (error) {}
                  // 设置请求中状态为 false
                  setRequesting(false);
                }}
              >
                {/* 如果倒计时大于 0，显示倒计时；否则显示确认文本 */}
                {countDownAmount > 0 ? `${countDownAmount}s` : confirmText}
              </Button>
            </ModalFooter>
          )}
        </MyModal>
      );
    }
  );

  // 返回三个值：
  // openConfirm：打开确认对话框的函数
  // onClose：关闭确认对话框的函数
  // ConfirmModal：确认对话框组件
  return {
    openConfirm,
    onClose,
    ConfirmModal
  };
};
