// 应用列表组件文件
// 本文件实现了应用列表展示功能，包括应用卡片、文件夹、创建按钮等
// 支持拖拽移动、权限管理、复制、删除等交互功能
// 主要导出：List 组件作为默认导出

// 导入 React 核心库和 hooks
// useMemo 用于性能优化，缓存计算结果；useState 用于管理组件状态
import React, { useMemo, useState } from 'react';
// 导入 Chakra UI 组件库的布局组件
// Box 通用容器，Grid 网格布局，IconButton 图标按钮，HStack/VStack 水平/垂直堆叠，Flex 弹性布局
import { Box, Grid, IconButton, HStack, Flex, VStack } from '@chakra-ui/react';
// 导入 Next.js 的路由 hook
// 用于页面导航和获取路由参数
import { useRouter } from 'next/router';
// 导入应用相关的 API 函数
// delAppById 删除应用，putAppById 更新应用，resumeInheritPer 恢复继承权限，changeOwner 更改所有者
import { delAppById, putAppById, resumeInheritPer, changeOwner } from '@/web/core/app/api';
// 导入确认对话框 hook
// 用于显示确认弹窗，如删除确认、移动确认等
import { useConfirm } from '@fastgpt/web/hooks/useConfirm';
// 导入自定义图标组件
// 用于显示各种 SVG 图标
import MyIcon from '@fastgpt/web/components/common/Icon';
// 导入头像组件
// 用于显示应用头像
import Avatar from '@fastgpt/web/components/common/Avatar';
// 导入权限图标文本组件
// 用于显示应用的权限状态图标和文本
import PermissionIconText from '@/components/support/permission/IconText';
// 导入国际化 hook
// 用于多语言支持
import { useTranslation } from 'next-i18next';
// 导入自定义盒子组件
// 封装了常用样式的 Box 组件
import MyBox from '@fastgpt/web/components/common/MyBox';
// 导入请求 hook
// 用于发送 API 请求并管理加载状态、错误处理等
import { useRequest } from '@fastgpt/web/hooks/useRequest';
// 导入上下文选择器 hook
// 用于从 React Context 中选择性地获取数据，避免不必要的重渲染
import { useContextSelector } from 'use-context-selector';
// 导入应用列表上下文
// 提供应用列表相关的状态和方法
import { AppListContext } from './context';
// 导入应用类型相关常量
// AppFolderTypeList 文件夹类型列表，AppTypeEnum 应用类型枚举，AppTypeList 应用类型列表，ToolTypeList 工具类型列表
import {
  AppFolderTypeList,
  AppTypeEnum,
  AppTypeList,
  ToolTypeList
} from '@fastgpt/global/core/app/constants';
// 导入文件夹拖拽 hook
// 用于实现文件夹的拖拽移动功能
import { useFolderDrag } from '@/components/common/folder/useFolderDrag';
// 导入 Next.js 的动态导入函数
// 用于按需加载组件，减少初始包大小
import dynamic from 'next/dynamic';
// 导入编辑资源信息表单类型
// 类型定义，用于编辑资源信息的表单数据
import type { EditResourceInfoFormType } from '@/components/common/Modal/EditResourceModal';
// 导入自定义菜单组件和菜单项类型
// MyMenu 菜单组件，MenuItemType 菜单项类型定义
import MyMenu, { type MenuItemType } from '@fastgpt/web/components/common/MyMenu';
// 导入应用角色列表常量
// 定义了应用的各种角色
import { AppRoleList } from '@fastgpt/global/support/permission/app/constant';
// 导入协作者相关的 API 函数
// deleteAppCollaborators 删除协作者，getCollaboratorList 获取协作者列表，postUpdateAppCollaborators 更新协作者
import {
  deleteAppCollaborators,
  getCollaboratorList,
  postUpdateAppCollaborators
} from '@/web/core/app/api/collaborator';
// 导入自定义工具提示组件
// 用于显示鼠标悬停时的提示信息
import MyTooltip from '@fastgpt/web/components/common/MyTooltip';
// 导入应用类型标签组件
// 用于显示应用类型的标签
import AppTypeTag from './TypeTag';
// 导入复制应用的 API 函数
// 用于创建应用副本
import { postCopyApp } from '@/web/core/app/api/app';
// 导入时间格式化函数
// 用于将时间格式化为聊天记录显示的时间格式
import { formatTimeToChatTime } from '@fastgpt/global/common/string/time';
// 导入系统信息 hook
// 用于获取系统相关信息，如是否为 PC 端
import { useSystem } from '@fastgpt/web/hooks/useSystem';
// 导入聊天状态管理 hook
// 用于管理聊天相关的状态
import { useChatStore } from '@/web/core/chat/context/useChatStore';
// 导入类型工具：只需要一个属性的类型
// 用于定义只需要多个属性中的一个的类型
import { type RequireOnlyOne } from '@fastgpt/global/common/type/utils';
// 导入用户信息展示组件
// 用于显示用户头像和名称
import UserBox from '@fastgpt/web/components/common/UserBox';
// 导入聊天侧边栏面板枚举
// 定义了聊天侧边栏的不同面板
import { ChatSidebarPaneEnum } from '@/pageComponents/chat/constants';
// 导入只读角色权限值常量
// 定义了只读角色的权限值
import { ReadRoleVal } from '@fastgpt/global/support/permission/constant';
// 导入提示消息 hook
// 用于显示成功、错误等提示消息
import { useToast } from '@fastgpt/web/hooks/useToast';
// 导入获取 Web 请求 URL 的工具函数
// 用于构建完整的资源 URL
import { getWebReqUrl } from '@fastgpt/web/common/system/utils';
// 导入创建应用类型映射常量
// 定义了不同类型应用的创建配置
import { createAppTypeMap } from '@/pageComponents/app/constants';
// 导入用户状态管理 hook
// 用于管理用户相关的状态
import { useUserStore } from '@/web/support/user/useUserStore';
// 导入空状态提示组件
// 用于显示空数据时的提示
import EmptyTip from '@fastgpt/web/components/common/EmptyTip';

// 使用动态导入加载编辑资源模态框组件
// 只在需要时才加载，减少初始包大小
const EditResourceModal = dynamic(() => import('@/components/common/Modal/EditResourceModal'));
// 使用动态导入加载权限配置模态框组件
// 只在需要时才加载，减少初始包大小
const ConfigPerModal = dynamic(() => import('@/components/support/permission/ConfigPerModal'));

// 定义 List 组件，用于展示应用列表
// 这是一个 React 函数组件，没有接收参数
const List = () => {
  // 获取国际化翻译函数
  const { t } = useTranslation();
  // 获取路由实例
  const router = useRouter();
  // 从路由查询参数中获取 parentId，默认为 null
  const { parentId = null } = router.query;
  // 获取是否为 PC 端的信息
  const { isPc } = useSystem();
  // 获取提示消息函数
  const { toast } = useToast();
  // 获取用户信息
  const { userInfo } = useUserStore();

  // 创建移动确认对话框
  // openMoveConfirm 打开确认框的函数，MoveConfirmModal 确认框组件
  const { openConfirm: openMoveConfirm, ConfirmModal: MoveConfirmModal } = useConfirm({
    type: 'common',
    title: t('common:move.confirm'),
    content: t('app:move.hint')
  });

  // 从应用列表上下文中获取需要的状态和方法
  // myApps 应用列表，appType 应用类型，loadMyApps 加载应用列表，isFetchingApps 是否正在获取，
  // onUpdateApp 更新应用，setMoveAppId 设置要移动的应用 ID，folderDetail 文件夹详情，
  // searchKey 搜索关键词，setSearchKey 设置搜索关键词
  const {
    myApps,
    appType,
    loadMyApps,
    isFetchingApps,
    onUpdateApp,
    setMoveAppId,
    folderDetail,
    searchKey,
    setSearchKey
  } = useContextSelector(AppListContext, (v) => v);

  // 计算是否有创建权限
  // 如果有文件夹详情，检查文件夹的写权限且不是 HTTP 插件类型；否则检查团队的创建应用权限
  const hasCreatePer = folderDetail
    ? folderDetail.permission.hasWritePer && folderDetail?.type !== AppTypeEnum.httpPlugin
    : userInfo?.team.permission.hasAppCreatePer;

  // 定义状态：当前正在编辑的应用
  const [editedApp, setEditedApp] = useState<EditResourceInfoFormType>();
  // 定义状态：当前正在编辑权限的应用 ID
  const [editPerAppId, setEditPerAppId] = useState<string>();

  // 使用 useMemo 计算当前正在编辑权限的应用对象
  // 根据 editPerAppId 在 myApps 中查找对应的应用
  const editPerApp = useMemo(
    () =>
      editPerAppId !== undefined
        ? myApps.find((item) => String(item._id) === String(editPerAppId))
        : undefined,
    [editPerAppId, myApps]
  );

  // 使用 useMemo 计算当前父级文件夹对象
  // 根据 parentId 在 myApps 中查找对应的应用/文件夹
  const parentApp = useMemo(() => myApps.find((item) => item._id === parentId), [parentId, myApps]);

  // 创建更新应用的请求函数
  // onPutAppById 更新应用的异步函数，成功后重新加载应用列表
  const { runAsync: onPutAppById } = useRequest(putAppById, {
    onSuccess() {
      loadMyApps();
    }
  });

  // 初始化文件夹拖拽功能
  // getBoxProps 获取拖拽属性的函数，onDrop 放置时的回调函数
  const { getBoxProps } = useFolderDrag({
    activeStyles: {
      borderColor: 'primary.600'
    },
    onDrop: (dragId: string, targetId: string) => {
      // 放置时显示确认框，确认后更新应用的父级文件夹
      openMoveConfirm({ onConfirm: async () => onPutAppById(dragId, { parentId: targetId }) })();
    }
  });

  // 创建删除确认对话框
  const { openConfirm: openConfirmDel, ConfirmModal: DelConfirmModal } = useConfirm({
    type: 'delete'
  });

  // 从聊天状态中获取最后聊天的应用 ID 和设置函数
  const { lastChatAppId, setLastChatAppId } = useChatStore();
  // 创建删除应用的请求函数
  const { runAsync: onclickDelApp } = useRequest(
    (id: string) => {
      // 如果删除的是最后聊天的应用，清空 lastChatAppId
      if (id === lastChatAppId) {
        setLastChatAppId('');
      }
      return delAppById(id);
    },
    {
      onSuccess(data) {
        // 删除成功后，清除相关的本地存储
        data.forEach((appId) => {
          localStorage.removeItem(`app_log_keys_${appId}`);
        });
        // 重新加载应用列表
        loadMyApps();
      },
      successToast: t('common:delete_success'),
      errorToast: t('common:delete_failed')
    }
  );

  // 创建复制确认对话框
  const { openConfirm: openConfirmCopy, ConfirmModal: ConfirmCopyModal } = useConfirm({
    content: t('app:confirm_copy_app_tip')
  });
  // 创建复制应用的请求函数
  const { runAsync: onclickCopy } = useRequest(postCopyApp, {
    onSuccess({ appId }) {
      // 复制成功后跳转到新应用的详情页
      router.push(`/app/detail?appId=${appId}`);
      // 重新加载应用列表
      loadMyApps();
    },
    successToast: t('app:create_copy_success')
  });

  // 创建恢复继承权限的请求函数
  // manual: true 表示需要手动调用，不会自动执行
  const { runAsync: onResumeInheritPermission } = useRequest(
    () => {
      return resumeInheritPer(editPerApp!._id);
    },
    {
      manual: true,
      errorToast: t('common:permission.Resume InheritPermission Failed'),
      onSuccess() {
        loadMyApps();
      }
    }
  );
  // 如果应用列表为空且正在获取数据，则不渲染任何内容
  if (myApps.length === 0 && isFetchingApps) return null;

  // 渲染组件内容
  return (
    <>
      {/* 如果应用列表为空且没有文件夹详情 */}
      {myApps.length === 0 && !folderDetail ? (
        // 如果有搜索关键词，显示空状态提示
        searchKey ? (
          <EmptyTip />
        ) : isPc && hasCreatePer ? (
          // 如果是 PC 端且有创建权限，显示创建按钮
          <CreateButton appType={appType} />
        ) : (
          // 否则显示创建按钮（有权限时）或禁止创建按钮（无权限时）
          <Grid
            py={4}
            gridTemplateColumns={
              folderDetail
                ? ['1fr', 'repeat(2,1fr)', 'repeat(2,1fr)', 'repeat(3,1fr)']
                : ['1fr', 'repeat(2,1fr)', 'repeat(2,1fr)', 'repeat(3,1fr)', 'repeat(4,1fr)']
            }
            gridGap={5}
            alignItems={'stretch'}
          >
            {hasCreatePer ? <ListCreateButton appType={appType} /> : <ForbiddenCreateButton />}
          </Grid>
        )
      ) : (
        // 否则渲染应用列表网格
        <Grid
          py={4}
          gridTemplateColumns={
            folderDetail
              ? ['1fr', 'repeat(2,1fr)', 'repeat(2,1fr)', 'repeat(3,1fr)']
              : ['1fr', 'repeat(2,1fr)', 'repeat(2,1fr)', 'repeat(3,1fr)', 'repeat(4,1fr)']
          }
          gridGap={5}
          alignItems={'stretch'}
        >
          {/* 根据权限显示创建按钮或禁止创建按钮 */}
          {hasCreatePer ? <ListCreateButton appType={appType} /> : <ForbiddenCreateButton />}
          {/* 遍历应用列表，渲染每个应用卡片 */}
          {myApps.map((app, index) => {
            // 判断应用类型
            const isAgent = AppTypeList.includes(app.type);
            const isTool = ToolTypeList.includes(app.type);
            const isFolder = AppFolderTypeList.includes(app.type);
            return (
              // 工具提示组件，鼠标悬停时显示提示文本
              <MyTooltip
                key={app._id}
                label={
                  app.type === AppTypeEnum.folder
                    ? t('common:open_folder')
                    : app.permission.hasWritePer || app.permission.hasReadChatLogPer
                      ? t('app:edit_app')
                      : t('app:go_to_chat')
                }
              >
                {/* 应用卡片容器 */}
                <MyBox
                  py={4}
                  px={5}
                  cursor={'pointer'}
                  border={'base'}
                  bg={'white'}
                  borderRadius={'10px'}
                  position={'relative'}
                  display={'flex'}
                  flexDirection={'column'}
                  // 鼠标悬停时的样式
                  _hover={{
                    borderColor: 'primary.300',
                    boxShadow: '1.5',
                    '& .more': {
                      display: 'flex'
                    },
                    '& .time': {
                      display: ['flex', 'none']
                    }
                  }}
                  // 点击事件处理
                  onClick={() => {
                    if (AppFolderTypeList.includes(app.type)) {
                      // 如果是文件夹，清空搜索关键词并进入该文件夹
                      setSearchKey('');
                      router.push({
                        query: {
                          ...router.query,
                          parentId: app._id
                        }
                      });
                    } else if (app.permission.hasWritePer || app.permission.hasReadChatLogPer) {
                      // 如果有写权限或读聊天记录权限，跳转到应用详情页
                      router.push(`/app/detail?appId=${app._id}`);
                    } else {
                      // 否则，在新标签页中打开聊天页面
                      window.open(
                        `/chat?appId=${app._id}&pane=${ChatSidebarPaneEnum.RECENTLY_USED_APPS}`,
                        '_blank'
                      );
                    }
                  }}
                  // 传递拖拽相关属性
                  {...getBoxProps({
                    dataId: app._id,
                    isFolder: app.type === AppTypeEnum.folder || app.type === AppTypeEnum.toolFolder
                  })}
                >
                  {/* 顶部网格：头像、名称、类型标签 */}
                  <Grid templateColumns="auto 1fr auto" alignItems="center" width="100%" gap={2}>
                    {/* 应用头像 */}
                    <Avatar src={app.avatar} borderRadius={'sm'} w={'1.5rem'} />
                    {/* 应用名称 */}
                    <Box color={'myGray.900'} fontWeight={'medium'} minWidth={0} overflow="hidden">
                      <Box className={'textEllipsis'}>{app.name}</Box>
                    </Box>
                    {/* 应用类型标签 */}
                    <Box justifySelf="end" mr={-5}>
                      <AppTypeTag type={app.type} />
                    </Box>
                  </Grid>
                  {/* 应用简介区域 */}
                  <Box
                    flex={'1 0 56px'}
                    mt={3}
                    textAlign={'justify'}
                    wordBreak={'break-all'}
                    fontSize={'xs'}
                    color={'myGray.500'}
                  >
                    <Box className={'textEllipsis2'} whiteSpace={'pre-wrap'} lineHeight={1.3}>
                      {app.intro || t('common:no_intro')}
                    </Box>
                  </Box>
                  {/* 底部信息栏：创建者、权限、更新时间、更多操作 */}
                  <HStack h={'24px'} fontSize={'mini'} color={'myGray.500'} w="full">
                    <HStack flex={'1 0 0'}>
                      {/* 显示创建者信息 */}
                      <UserBox
                        sourceMember={app.sourceMember}
                        fontSize="xs"
                        avatarSize="1rem"
                        spacing={0.5}
                      />
                      {/* 显示权限图标 */}
                      <PermissionIconText
                        private={app.private}
                        color={'myGray.500'}
                        iconColor={'myGray.400'}
                        w={'0.875rem'}
                      />
                    </HStack>
                    <HStack>
                      {/* PC 端显示更新时间 */}
                      {isPc && (
                        <HStack spacing={0.5} className="time">
                          <MyIcon name={'history'} w={'0.85rem'} color={'myGray.400'} />
                          <Box color={'myGray.500'}>
                            {t(formatTimeToChatTime(app.updateTime) as any).replace('#', ':')}
                          </Box>
                        </HStack>
                      )}
                      {/* 根据权限显示更多操作按钮 */}
                      {(AppFolderTypeList.includes(app.type)
                        ? app.permission.hasManagePer
                        : app.permission.hasWritePer || app.permission.hasReadChatLogPer) && (
                        <Box className="more" display={['', 'none']}>
                          {/* 更多操作菜单 */}
                          <MyMenu
                            Button={
                              <IconButton
                                size={'xsSquare'}
                                variant={'transparentBase'}
                                icon={<MyIcon name={'more'} w={'0.875rem'} color={'myGray.500'} />}
                                aria-label={''}
                              />
                            }
                            menuList={[
                              // 对于简单应用、工作流、聊天代理，显示"去聊天"菜单项
                              ...([
                                AppTypeEnum.simple,
                                AppTypeEnum.workflow,
                                AppTypeEnum.chatAgent
                              ].includes(app.type)
                                ? [
                                    {
                                      children: [
                                        {
                                          icon: 'core/chat/chatLight',
                                          type: 'grayBg' as MenuItemType,
                                          label: t('app:go_to_chat'),
                                          onClick: () => {
                                            window.open(
                                              `/chat?appId=${app._id}&pane=${ChatSidebarPaneEnum.RECENTLY_USED_APPS}`,
                                              '_blank'
                                            );
                                          }
                                        }
                                      ]
                                    }
                                  ]
                                : []),
                              // 对于工作流工具，显示"去运行"菜单项
                              ...([AppTypeEnum.workflowTool].includes(app.type)
                                ? [
                                    {
                                      children: [
                                        {
                                          icon: 'core/chat/chatLight',
                                          type: 'grayBg' as MenuItemType,
                                          label: t('app:go_to_run'),
                                          onClick: () => {
                                            window.open(
                                              `/chat?appId=${app._id}&pane=${ChatSidebarPaneEnum.RECENTLY_USED_APPS}`,
                                              '_blank'
                                            );
                                          }
                                        }
                                      ]
                                    }
                                  ]
                                : []),
                              // 有管理权限时显示编辑、移动、权限设置菜单项
                              ...(app.permission.hasManagePer
                                ? [
                                    {
                                      children: [
                                        {
                                          icon: 'edit',
                                          type: 'grayBg' as MenuItemType,
                                          label: t('common:dataset.Edit Info'),
                                          onClick: () => {
                                            // HTTP 插件已弃用，显示警告提示
                                            if (app.type === AppTypeEnum.httpPlugin) {
                                              toast({
                                                title: t('app:type.Http plugin_deprecated'),
                                                status: 'warning'
                                              });
                                            }
                                            // 设置要编辑的应用信息
                                            setEditedApp({
                                              id: app._id,
                                              avatar: app.avatar,
                                              name: app.name,
                                              intro: app.intro
                                            });
                                          }
                                        },
                                        // 移动菜单项（根据权限显示）
                                        ...(folderDetail?.type === AppTypeEnum.httpPlugin &&
                                        !(parentApp ? parentApp.permission : app.permission)
                                          .hasManagePer
                                          ? []
                                          : [
                                              {
                                                icon: 'common/file/move',
                                                type: 'grayBg' as MenuItemType,
                                                label: t('common:move_to'),
                                                onClick: () => setMoveAppId(app._id)
                                              }
                                            ]),
                                        // 权限设置菜单项（有管理权限时显示）
                                        ...(app.permission.hasManagePer
                                          ? [
                                              {
                                                icon: 'key',
                                                type: 'grayBg' as MenuItemType,
                                                label: t('common:permission.Permission'),
                                                onClick: () => setEditPerAppId(app._id)
                                              }
                                            ]
                                          : [])
                                      ]
                                    }
                                  ]
                                : []),
                              // 复制菜单项（根据应用类型和权限显示）
                              ...(!app.permission?.hasWritePer ||
                              app.type === AppTypeEnum.mcpToolSet ||
                              app.type === AppTypeEnum.folder ||
                              app.type === AppTypeEnum.httpToolSet ||
                              app.type === AppTypeEnum.httpPlugin
                                ? []
                                : [
                                    {
                                      children: [
                                        {
                                          icon: 'copy',
                                          type: 'grayBg' as MenuItemType,
                                          label: t('app:copy_one_app'),
                                          onClick: () =>
                                            openConfirmCopy({
                                              onConfirm: () => onclickCopy({ appId: app._id })
                                            })()
                                        }
                                      ]
                                    }
                                  ]),
                              // 删除菜单项（仅所有者可见）
                              ...(app.permission.isOwner
                                ? [
                                    {
                                      children: [
                                        {
                                          type: 'danger' as 'danger',
                                          icon: 'delete',
                                          label: t('common:Delete'),
                                          onClick: () =>
                                            openConfirmDel({
                                              onConfirm: () => onclickDelApp(app._id),
                                              inputConfirmText: app.name,
                                              customContent: (() => {
                                                if (isFolder)
                                                  return t('app:confirm_delete_folder_tip');
                                                if (isAgent) return t('app:confirm_del_app_tip');
                                                if (isTool) return t('app:confirm_del_tool_tip');
                                                return t('app:confirm_del_app_tip');
                                              })()
                                            })()
                                        }
                                      ]
                                    }
                                  ]
                                : [])
                            ]}
                          />
                        </Box>
                      )}
                    </HStack>
                  </HStack>
                </MyBox>
              </MyTooltip>
            );
          })}
        </Grid>
      )}
      {/* 删除确认对话框 */}
      <DelConfirmModal />
      {/* 复制确认对话框 */}
      <ConfirmCopyModal />
      {/* 编辑资源信息模态框 */}
      {!!editedApp && (
        <EditResourceModal
          {...editedApp}
          title={t('common:core.app.edit_content')}
          onClose={() => {
            setEditedApp(undefined);
          }}
          onEdit={({ id, ...data }) => onUpdateApp(id, data)}
        />
      )}
      {/* 权限配置模态框 */}
      {!!editPerApp && (
        <ConfigPerModal
          // 如果是所有者，提供更改所有者功能
          {...(editPerApp.permission.isOwner && {
            onChangeOwner: (tmbId: string) =>
              changeOwner({
                appId: editPerApp._id,
                ownerId: tmbId
              }).then(() => loadMyApps())
          })}
          refetchResource={loadMyApps}
          hasParent={Boolean(parentId)}
          resumeInheritPermission={onResumeInheritPermission}
          isInheritPermission={editPerApp.inheritPermission}
          avatar={editPerApp.avatar}
          name={editPerApp.name}
          managePer={{
            defaultRole: ReadRoleVal,
            permission: editPerApp.permission,
            onGetCollaboratorList: () => getCollaboratorList(editPerApp._id),
            roleList: AppRoleList,
            onUpdateCollaborators: (props) =>
              postUpdateAppCollaborators({
                ...props,
                appId: editPerApp._id
              }),
            onDelOneCollaborator: async (
              props: RequireOnlyOne<{
                tmbId?: string;
                groupId?: string;
                orgId?: string;
              }>
            ) =>
              deleteAppCollaborators({
                ...props,
                appId: editPerApp._id
              }),
            refreshDeps: [editPerApp.inheritPermission]
          }}
          onClose={() => setEditPerAppId(undefined)}
        />
      )}
      {/* 移动确认对话框 */}
      <MoveConfirmModal />
    </>
  );
};

// 创建按钮组件（大图样式）
// 用于在空状态下显示的创建应用按钮，带有图片背景和动画效果
// 参数：appType 应用类型
const CreateButton = ({ appType }: { appType: AppTypeEnum | 'all' }) => {
  // 获取国际化翻译函数
  const { t } = useTranslation();
  // 定义状态：鼠标是否悬停在创建按钮上
  const [isHoverCreateButton, setIsHoverCreateButton] = useState(false);
  // 获取路由实例
  const router = useRouter();
  // 获取父文件夹 ID
  const parentId = router.query.parentId;
  // 计算要创建的应用类型
  const createAppType =
    appType !== 'all' && appType in createAppTypeMap
      ? createAppTypeMap[appType as keyof typeof createAppTypeMap].type
      : router.pathname.includes('/agent')
        ? AppTypeEnum.workflow
        : AppTypeEnum.workflowTool;
  // 判断是否为工具类型
  const isToolType = ToolTypeList.includes(createAppType);

  return (
    <Box
      position="relative"
      width="100%"
      minH={'150px'}
      overflow="hidden"
      rounded={'sm'}
      cursor={'pointer'}
      // 点击事件：跳转到创建应用页面
      onClick={() => {
        router.push(
          `/dashboard/create?appType=${createAppType}${parentId ? `&parentId=${parentId}` : ''}`
        );
      }}
      // 鼠标进入时设置悬停状态为 true
      onMouseEnter={() => setIsHoverCreateButton(true)}
      // 鼠标离开时设置悬停状态为 false
      onMouseLeave={() => setIsHoverCreateButton(false)}
      boxShadow={
        isHoverCreateButton
          ? '0 4px 27.1px 0 rgba(199, 212, 233, 0.29)'
          : '0 4px 27.1px 0 rgba(199, 212, 233, 0.29)'
      }
      userSelect={'none'}
      mt={4}
    >
      {/* 背景图片 */}
      <Box
        as="img"
        src={getWebReqUrl('/imgs/app/createButton.jpg')}
        alt="operational advertisement"
        width="100%"
        maxW="100%"
        display="block"
        transition="transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)"
        // 悬停时图片放大并上移
        transform={isHoverCreateButton ? 'scale(1.2) translateY(-12px)' : 'scale(1) translateY(0)'}
      />
      {/* 前景内容：创建提示文本和按钮 */}
      <VStack
        position="absolute"
        top="50%"
        left="50%"
        transform="translate(-50%, -50%)"
        color="#334155"
        fontSize="32px"
        fontWeight="medium"
      >
        {/* 第一行：图标和创建提示文本 */}
        <Flex gap={2.5} alignItems={'center'}>
          <MyIcon name={'core/app/create'} w={8} />
          {/* 根据类型显示"创建第一个工具"或"创建第一个智能体" */}
          {isToolType ? t('app:create_your_first_tool') : t('app:create_your_first_agent')}
        </Flex>
        {/* 第二行：虚线框按钮 */}
        <Box
          mt={4}
          h={14}
          w={'330px'}
          display={'flex'}
          alignItems={'center'}
          justifyContent={'center'}
          sx={{
            background: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='330' height='56'%3E%3Crect x='0.5' y='0.5' width='329' height='55' rx='12' fill='none' stroke='%237895FE' stroke-width='1' stroke-dasharray='6 6' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") no-repeat center`
          }}
        >
          <MyIcon name={'common/addLight'} w={8} color={'#7895FE'} />
        </Box>
      </VStack>
    </Box>
  );
};
// 列表创建按钮组件（卡片样式）
// 用于在应用列表中显示的创建按钮，与应用卡片样式一致
// 参数：appType 应用类型
const ListCreateButton = ({ appType }: { appType: AppTypeEnum | 'all' }) => {
  // 获取国际化翻译函数
  const { t } = useTranslation();
  // 获取路由实例
  const router = useRouter();
  // 获取父文件夹 ID
  const parentId = router.query.parentId;
  // 计算要创建的应用类型
  const createAppType =
    appType !== 'all' && appType in createAppTypeMap
      ? createAppTypeMap[appType as keyof typeof createAppTypeMap].type
      : router.pathname.includes('/agent')
        ? AppTypeEnum.workflow
        : AppTypeEnum.workflowTool;

  return (
    <MyBox
      py={4}
      px={5}
      cursor={'pointer'}
      border={'base'}
      bg={'white'}
      borderRadius={'10px'}
      position={'relative'}
      display={'flex'}
      flexDirection={'column'}
      // 悬停时显示背景高亮
      _hover={{
        '& .create-box': {
          display: 'flex'
        }
      }}
      // 点击事件：跳转到创建应用页面
      onClick={() => {
        router.push(
          `/dashboard/create?appType=${createAppType}${parentId ? `&parentId=${parentId}` : ''}`
        );
      }}
    >
      {/* 标题：新建 */}
      <Box color={'myGray.900'} fontWeight={'medium'}>
        {t('common:new_create')}
      </Box>
      {/* 中间区域：虚线框按钮 */}
      <Box
        mt={4}
        mb={2}
        h={'100%'}
        w={'100%'}
        display={'flex'}
        alignItems={'center'}
        justifyContent={'center'}
        position={'relative'}
        flex={'1 0 56px'}
      >
        {/* 悬停时显示的背景高亮 */}
        <Box
          className="create-box"
          display={'none'}
          position={'absolute'}
          top={'1px'}
          left={'1px'}
          right={'1px'}
          bottom={'1px'}
          bg={'primary.50'}
          borderRadius={'14px'}
        />
        {/* 虚线框和添加图标 */}
        <Box
          w={'100%'}
          h={'100%'}
          display={'flex'}
          alignItems={'center'}
          justifyContent={'center'}
          sx={{
            background: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100%25' height='100%25' viewBox='0 0 330 56' preserveAspectRatio='none'%3E%3Crect x='0.5' y='0.5' width='329' height='55' rx='12' fill='none' stroke='%237895FE' stroke-width='1' stroke-dasharray='6 6' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") no-repeat center`,
            backgroundSize: '100% 100%'
          }}
        >
          <MyIcon name={'common/addLight'} w={8} color={'#7895FE'} zIndex={1} />
        </Box>
      </Box>
    </MyBox>
  );
};
// 禁止创建按钮组件
// 用于在用户没有创建权限时显示的按钮，显示禁用状态和提示文本
const ForbiddenCreateButton = () => {
  // 获取国际化翻译函数
  const { t } = useTranslation();
  return (
    <MyBox
      py={4}
      px={5}
      cursor={'not-allowed'}
      border={'base'}
      bg={'white'}
      borderRadius={'10px'}
      position={'relative'}
      display={'flex'}
      flexDirection={'column'}
    >
      {/* 标题：新建 */}
      <Box color={'myGray.900'} fontWeight={'medium'}>
        {t('common:new_create')}
      </Box>
      {/* 中间区域：禁用图标和提示文本 */}
      <Box
        mt={4}
        mb={2}
        h={'100%'}
        w={'100%'}
        display={'flex'}
        alignItems={'center'}
        justifyContent={'center'}
        position={'relative'}
        flex={'1 0 56px'}
      >
        {/* 灰色背景 */}
        <Box
          position={'absolute'}
          top={'1px'}
          left={'1px'}
          right={'1px'}
          bottom={'1px'}
          bg={'myGray.50'}
          borderRadius={'14px'}
        />
        {/* 禁用图标和提示文本 */}
        <Box
          w={'100%'}
          h={'100%'}
          display={'flex'}
          flexDirection={'column'}
          alignItems={'center'}
          justifyContent={'center'}
          sx={{
            background: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100%25' height='100%25' viewBox='0 0 330 56' preserveAspectRatio='none'%3E%3Crect x='0.5' y='0.5' width='329' height='55' rx='12' fill='none' stroke='%23D7D7D7' stroke-width='1' stroke-dasharray='6 6' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") no-repeat center`,
            backgroundSize: '100% 100%'
          }}
        >
          {/* 禁用图标 */}
          <MyIcon name={'common/disable'} w={'34px'} color={'#DFE2EA'} zIndex={1} />
          {/* 提示文本：没有创建权限 */}
          <Box color={'myGray.500'} fontSize={'11px'} fontWeight={'medium'} zIndex={1}>
            {t('app:has_no_create_per')}
          </Box>
        </Box>
      </Box>
    </MyBox>
  );
};

// 导出 List 组件作为默认导出
export default List;
