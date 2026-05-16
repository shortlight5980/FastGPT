// 这是一个编辑/创建文件夹的模态框组件
// 主要功能是提供表单界面，让用户可以创建新文件夹或编辑已有文件夹的名称和描述
// 使用 Chakra UI 组件库和 react-hook-form 进行表单管理
// 导出 EditFolderModal 组件和 EditFolderFormType 类型

// 导入 React 和 useMemo hook
// useMemo 用于缓存计算结果，避免不必要的重复计算
import React, { useMemo } from 'react';
// 从 Chakra UI 导入需要的 UI 组件
// ModalFooter: 模态框底部组件，通常放置按钮
// ModalBody: 模态框主体组件，放置主要内容
// Input: 输入框组件
// Button: 按钮组件
// Box: 布局容器组件
// Textarea: 多行文本输入组件
import { ModalFooter, ModalBody, Input, Button, Box, Textarea } from '@chakra-ui/react';
// 导入自定义的 MyModal 组件，这是一个封装好的模态框基础组件
import MyModal from './index';
// 导入国际化 hook，用于多语言支持
import { useTranslation } from 'next-i18next';
// 导入自定义的 useRequest hook，用于处理 API 请求
import { useRequest } from '../../../hooks/useRequest';
// 导入自定义的 FormLabel 组件，用于表单标签
import FormLabel from '../MyBox/FormLabel';
// 导入 react-hook-form 的 useForm hook，用于表单状态管理和验证
import { useForm } from 'react-hook-form';

// 导出编辑文件夹表单的类型定义
// 定义了表单中可能包含的字段
export type EditFolderFormType = {
  id?: string; // 文件夹 ID，编辑时才有，创建时没有
  name?: string; // 文件夹名称
  intro?: string; // 文件夹描述/介绍
};

// 提交数据的类型定义
// 定义了提交给父组件的数据结构
type CommitType = {
  name: string; // 文件夹名称，必填
  intro?: string; // 文件夹描述，可选
};

// 定义并导出 EditFolderModal 组件
// 这是一个函数组件，用于创建或编辑文件夹的模态框
// 参数说明：
// onClose: 关闭模态框的函数
// onCreate: 创建文件夹的回调函数，接收 CommitType 类型的数据
// onEdit: 编辑文件夹的回调函数，接收包含 id 的 CommitType 数据
// id: 文件夹 ID，编辑时传入，创建时不传入
// name: 文件夹名称，用于初始化表单
// intro: 文件夹描述，用于初始化表单
const EditFolderModal = ({
  onClose,
  onCreate,
  onEdit,
  id,
  name,
  intro
}: EditFolderFormType & {
  onClose: () => void;
  onCreate: (data: CommitType) => any;
  onEdit: (data: CommitType & { id: string }) => any;
}) => {
  // 获取国际化翻译函数
  const { t } = useTranslation();
  // 判断当前是编辑模式还是创建模式
  // 如果有 id 则是编辑模式，否则是创建模式
  const isEdit = !!id;
  // 使用 useForm hook 初始化表单
  // EditFolderFormType: 表单数据的类型
  // defaultValues: 表单的默认值，使用传入的 name 和 intro
  const { register, handleSubmit } = useForm<EditFolderFormType>({
    defaultValues: {
      name,
      intro
    }
  });

  // 使用 useMemo 缓存模态框标题等配置
  // 根据 isEdit 的值返回不同的标题
  const typeMap = useMemo(
    () =>
      isEdit
        ? {
            title: t('common:dataset.Edit Folder') // 编辑模式的标题：编辑文件夹
          }
        : {
            title: t('common:dataset.Create Folder') // 创建模式的标题：创建文件夹
          },
    [isEdit, t] // 依赖项，这些值变化时会重新计算
  );

  // 使用 useRequest hook 处理保存操作
  // run: 执行请求的函数，命名为 onSave
  // loading: 请求是否正在进行的状态
  const { run: onSave, loading } = useRequest(
    ({ name = '', intro }: EditFolderFormType) => {
      // 如果名称为空，直接返回不执行任何操作
      if (!name) return;

      // 如果是编辑模式，调用 onEdit 函数，传入 id、name 和 intro
      if (isEdit) return onEdit({ id, name, intro });
      // 如果是创建模式，调用 onCreate 函数，传入 name 和 intro
      return onCreate({ name, intro });
    },
    {
      // 请求成功后的回调函数
      onSuccess: (res) => {
        // 关闭模态框
        onClose();
      }
    }
  );

  // 渲染组件
  return (
    // 使用 MyModal 组件作为容器
    // isOpen: 控制模态框显示
    // onClose: 关闭模态框的函数
    // iconSrc: 模态框标题栏的图标
    // title: 模态框标题，根据模式动态显示
    <MyModal isOpen onClose={onClose} iconSrc="common/folderFill" title={typeMap.title}>
      {/* 模态框主体内容 */}
      <ModalBody>
        {/* 包裹名称输入框的容器 */}
        <Box>
          {/* 表单标签：输入名称 */}
          <FormLabel mb={1}>{t('common:input_name')}</FormLabel>
          {/* 名称输入框 */}
          <Input
            {...register('name', { required: true })} // 注册表单字段，设置为必填
            bg={'myGray.50'} // 设置背景色
            autoFocus // 自动聚焦
            maxLength={100} // 最大长度限制为 100 字符
          />
        </Box>
        {/* 包裹描述输入框的容器，设置顶部外边距 */}
        <Box mt={4}>
          {/* 表单标签：文件夹描述 */}
          <FormLabel mb={1}>{t('common:folder_description')}</FormLabel>
          {/* 描述文本域 */}
          <Textarea {...register('intro')} bg={'myGray.50'} maxLength={200} />
        </Box>
      </ModalBody>
      {/* 模态框底部，放置按钮 */}
      <ModalFooter>
        {/* 确认按钮 */}
        <Button isLoading={loading} onClick={handleSubmit(onSave)} px={6}>
          {/* 按钮文本：确认 */}
          {t('common:Confirm')}
        </Button>
      </ModalFooter>
    </MyModal>
  );
};

// 默认导出 EditFolderModal 组件
// 方便其他文件导入并使用该组件
export default EditFolderModal;
