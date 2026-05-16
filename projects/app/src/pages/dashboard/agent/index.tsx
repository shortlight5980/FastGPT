// 声明这是一个客户端组件，在 Next.js 13+ App Router 中，这个指令告诉 React
// 这个组件只在浏览器端运行，不会在服务器端渲染
'use client';

// 导入 React 核心库和 useState Hook
// useState 用于在函数组件中管理状态
import React, { useState } from 'react';

// 从 Chakra UI 导入 UI 组件库的组件
// Box: 通用容器组件，类似 div
// Button: 按钮组件
// Flex: 弹性布局容器组件
// useDisclosure: Chakra UI 提供的 Hook，用于管理弹窗、抽屉等组件的打开/关闭状态
import { Box, Button, Flex, useDisclosure } from '@chakra-ui/react';

// 导入国际化服务端属性处理函数，用于多语言支持
import { serviceSideProps } from '@/web/common/i18n/utils';

// 从 next-i18next 导入 useTranslation Hook
// 用于实现国际化翻译功能
import { useTranslation } from 'next-i18next';

// 从 Next.js 导入 dynamic 函数
// 用于实现组件的动态导入（代码分割），可以按需加载组件，提高首屏性能
import dynamic from 'next/dynamic';

// 导入自定义的 useRequest Hook
// 通常用于封装网络请求，提供加载状态、错误处理等功能
import { useRequest } from '@fastgpt/web/hooks/useRequest';

// 导入创建应用文件夹的 API 请求函数
import { postCreateAppFolder } from '@/web/core/app/api/app';

// 导入编辑文件夹表单的类型定义（只作为类型使用，不会打包到最终代码）
import type { EditFolderFormType } from '@fastgpt/web/components/common/MyModal/EditFolderModal';

// 从 use-context-selector 导入 useContextSelector
// 这是一个优化的 Context 选择器，可以只订阅 Context 中需要的部分，避免不必要的重渲染
import { useContextSelector } from 'use-context-selector';

// 导入应用列表的 Context 提供者和 Context 对象本身
// Context 用于在组件树中跨层级共享数据，避免逐层传递 props
import AppListContextProvider, { AppListContext } from '@/pageComponents/dashboard/agent/context';

// 导入文件夹路径导航组件
import FolderPath from '@/components/common/folder/Path';

// 从 Next.js 导入 useRouter Hook
// 用于编程式导航，获取路由参数等
import { useRouter } from 'next/router';

// 导入文件夹侧边栏卡片组件
import FolderSlideCard from '@/components/common/folder/SlideCard';

// 导入删除应用和恢复继承权限的 API 函数
import { delAppById, resumeInheritPer } from '@/web/core/app/api';

// 导入应用角色列表常量
import { AppRoleList } from '@fastgpt/global/support/permission/app/constant';

// 导入协作人员相关的 API 函数
import {
  deleteAppCollaborators,
  getCollaboratorList,
  postUpdateAppCollaborators
} from '@/web/core/app/api/collaborator';

// 导入应用类型枚举（如文件夹、插件等）
import { AppTypeEnum } from '@fastgpt/global/core/app/constants';

// 导入自定义的盒子组件
import MyBox from '@fastgpt/web/components/common/MyBox';

// 导入系统相关的 Hook，用于获取设备信息等
import { useSystem } from '@fastgpt/web/hooks/useSystem';

// 导入 JSON 导入弹窗组件
import JsonImportModal from '@/pageComponents/dashboard/agent/JsonImportModal';

// 导入仪表板容器组件
import DashboardContainer from '@/pageComponents/dashboard/Container';

// 导入应用列表组件
import List from '@/pageComponents/dashboard/agent/List';

// 导入获取 UTM 工作流的工具函数
import { getUtmWorkflow } from '@/web/support/marketing/utils';

// 从 ahooks 导入 useMount Hook
// 这个 Hook 只在组件第一次挂载时执行，类似 componentDidMount
import { useMount } from 'ahooks';

// 导入搜索输入框组件
import SearchInput from '@fastgpt/web/components/common/Input/SearchInput';

// 导入用户状态管理的 Hook（使用 Zustand 状态管理库）
import { useUserStore } from '@/web/support/user/useUserStore';

// 导入自定义图标组件
import MyIcon from '@fastgpt/web/components/common/Icon';

// 导入只读角色的值常量
import { ReadRoleVal } from '@fastgpt/global/support/permission/constant';

// 导入模板创建面板组件
import TemplateCreatePanel from '@/pageComponents/dashboard/agent/TemplateCreatePanel';

// 使用 Next.js 的 dynamic 动态导入 EditFolderModal 组件
// 这样可以实现代码分割，这个组件不会在首屏加载，而是在需要时才加载
// 可以提高首屏性能
const EditFolderModal = dynamic(
  () => import('@fastgpt/web/components/common/MyModal/EditFolderModal')
);

// 定义 MyApps 函数组件，这是页面的主要组件
// 接收 MenuIcon 作为 props，类型是 JSX.Element
const MyApps = ({ MenuIcon }: { MenuIcon: JSX.Element }) => {
  // 调用 useTranslation Hook，获取翻译函数 t
  // 可以通过 t('key') 的方式获取对应语言的文本
  const { t } = useTranslation();

  // 调用 useRouter Hook，获取 router 对象
  // 可以用来进行页面跳转、获取路由参数等
  const router = useRouter();

  // 调用 useSystem Hook，获取系统信息
  // isPc 表示当前是否是 PC 设备
  const { isPc } = useSystem();

  // 使用 useContextSelector 从 AppListContext 中选择需要的状态和方法
  // 这样做的好处是只有当我们选择的这些值变化时，组件才会重新渲染
  // paths: 文件夹路径数组
  // parentId: 父级文件夹 ID
  // myApps: 我的应用列表
  // appType: 应用类型
  // loadMyApps: 加载应用列表的函数
  // onUpdateApp: 更新应用的函数
  // setMoveAppId: 设置要移动的应用 ID 的函数
  // isFetchingApps: 是否正在获取应用列表的加载状态
  // folderDetail: 文件夹详情
  // refetchFolderDetail: 重新获取文件夹详情的函数
  // searchKey: 搜索关键词
  // setSearchKey: 设置搜索关键词的函数
  const {
    paths,
    parentId,
    myApps,
    appType,
    loadMyApps,
    onUpdateApp,
    setMoveAppId,
    isFetchingApps,
    folderDetail,
    refetchFolderDetail,
    searchKey,
    setSearchKey
  } = useContextSelector(AppListContext, (v) => v);

  // 使用 useState Hook 创建 editFolder 状态
  // 用于存储当前正在编辑的文件夹信息
  // setEditFolder 是更新这个状态的函数
  // 初始值是 undefined，表示没有在编辑任何文件夹
  const [editFolder, setEditFolder] = useState<EditFolderFormType>();

  // 从用户状态管理中获取 userInfo（用户信息）
  const { userInfo } = useUserStore();

  // 使用 useDisclosure Hook 管理 JSON 导入弹窗的状态
  // isOpenJsonImportModal: 弹窗是否打开的状态
  // onOpenJsonImportModal: 打开弹窗的函数
  // onCloseJsonImportModal: 关闭弹窗的函数
  const {
    isOpen: isOpenJsonImportModal,
    onOpen: onOpenJsonImportModal,
    onClose: onCloseJsonImportModal
  } = useDisclosure();

  // 使用 useMount Hook，这个函数只会在组件第一次挂载时执行一次
  // 检查 sessionStorage 中是否有工作流 URL，如果有就打开导入弹窗
  useMount(() => {
    // 调用 getUtmWorkflow 检查是否有 UTM 工作流参数
    if (getUtmWorkflow()) {
      // 如果有，打开 JSON 导入弹窗
      onOpenJsonImportModal();
    }
  });

  // 使用 useRequest Hook 封装创建文件夹的请求
  // runAsync 被重命名为 onCreateFolder，是发起请求的函数
  // onSuccess: 请求成功后的回调函数，重新加载应用列表
  // errorToast: 请求失败时显示的错误提示
  const { runAsync: onCreateFolder } = useRequest(postCreateAppFolder, {
    onSuccess() {
      // 创建文件夹成功后，重新加载应用列表，显示最新的文件夹
      loadMyApps();
    },
    errorToast: 'Error'
  });

  // 使用 useRequest Hook 封装删除文件夹的请求
  const { runAsync: onDeleFolder } = useRequest(delAppById, {
    onSuccess(data) {
      // 删除成功后，遍历被删除的应用 ID 列表
      data.forEach((appId) => {
        // 从 localStorage 中移除对应应用的日志键
        // localStorage 是浏览器提供的本地存储 API
        localStorage.removeItem(`app_log_keys_${appId}`);
      });

      // 使用 router.replace 跳转到父级文件夹
      // replace 不会在浏览器历史记录中留下新记录
      router.replace({
        query: {
          // 设置父级文件夹 ID 为路由参数
          parentId: folderDetail?.parentId
        }
      });
    },
    errorToast: 'Error'
  });

  // 组件的 JSX 返回，描述 UI 结构
  return (
    // Flex 容器组件，使用 flex 布局
    // flexDirection: 'column' 表示垂直排列
    // h: '100%' 表示高度占满父容器
    <Flex flexDirection={'column'} h={'100%'}>
      {/* 水平布局的容器 */}
      {/* gap: 5 表示子元素之间的间距 */}
      {/* flex: '1 0 0' 是 flex-grow: 1, flex-shrink: 0, flex-basis: 0 的简写 */}
      <Flex gap={5} flex={'1 0 0'} h={0}>
        {/* 左侧主内容区域 */}
        <Flex
          flex={'1 0 0'}
          flexDirection={'column'}
          h={'100%'}
          // 根据是否选中文件夹设置不同的右侧内边距
          // [3, 2] 是响应式数组，第一个值在小屏幕生效，第二个在大屏幕生效
          pr={folderDetail ? [3, 2] : [3, 6]}
          pl={6}
          pt={6}
          overflowY={'auto'} // 垂直方向内容超出时显示滚动条
          overflowX={'hidden'} // 水平方向内容超出时隐藏
        >
          {/* 模板创建面板，只在 PC 端的根目录页面显示 */}
          {!folderDetail && isPc && <TemplateCreatePanel type={appType} />}

          {/* 顶部导航栏区域，垂直居中 */}
          <Flex alignItems={'center'}>
            {/* 条件渲染：根据设备类型和路径显示不同内容 */}
            {!isPc ? (
              // 如果是移动端，显示菜单图标
              MenuIcon
            ) : paths.length > 0 ? (
              // 如果是 PC 端且有路径，显示文件夹路径导航
              <Box>
                <FolderPath
                  paths={paths} // 路径数组
                  hoverStyle={{ bg: 'myGray.200' }} // 鼠标悬停时的样式
                  forbidLastClick // 禁止点击最后一个路径（当前所在位置）
                  // 点击路径项的回调函数
                  onClick={(parentId) => {
                    // 使用 router.push 跳转到对应文件夹
                    router.push({
                      query: {
                        // 保留原有的查询参数
                        ...router.query,
                        // 更新 parentId 参数
                        parentId
                      }
                    });
                  }}
                />
              </Box>
            ) : (
              // 如果是 PC 端且在根目录，显示 "Agent" 标题
              <Box color={'myGray.900'} fontSize={'20px'} fontWeight={'medium'}>
                Agent
              </Box>
            )}

            {/* 占位元素，占据剩余空间，将后面的元素推到右边 */}
            <Flex flex={1} />

            {/* 右侧操作按钮区域 */}
            <Flex alignItems={'center'} gap={3}>
              {/* 搜索框，只在 PC 端显示 */}
              {isPc && (
                <SearchInput
                  maxW={['auto', '250px']} // 响应式最大宽度
                  value={searchKey} // 搜索框的值，绑定到状态
                  bg={'white'} // 背景色
                  // 输入变化时的处理函数，更新搜索关键词状态
                  onChange={(e) => setSearchKey(e.target.value)}
                  // 占位符文本，使用翻译函数获取多语言文本
                  placeholder={t('app:search_agent')}
                  maxLength={30} // 最大输入长度
                />
              )}

              {/* 条件渲染：根据权限显示创建文件夹和导入按钮 */}
              {/* 如果选中了文件夹，检查文件夹的写入权限和类型 */}
              {/* 如果没有选中文件夹，检查团队是否有创建应用的权限 */}
              {(folderDetail
                ? folderDetail.permission.hasWritePer &&
                  folderDetail?.type !== AppTypeEnum.httpPlugin
                : userInfo?.team.permission.hasAppCreatePer) && (
                // 空标签 <></>，也叫 Fragment，用于包裹多个元素但不额外增加 DOM 节点
                <>
                  {/* 创建文件夹按钮 */}
                  <Button
                    variant={'grayBase'} // 按钮样式变体
                    // 左侧图标
                    leftIcon={<MyIcon name={'common/addLight'} w={'18px'} mr={-1} />}
                    // 点击时设置 editFolder 为空对象，表示新建文件夹
                    onClick={() => setEditFolder({})}
                    px={5} // 左右内边距
                  >
                    {/* 按钮文本，使用翻译 */}
                    {t('common:Folder')}
                  </Button>

                  {/* 导入按钮 */}
                  <Button
                    variant={'grayBase'}
                    leftIcon={<MyIcon name={'common/importLight'} w={'14px'} />}
                    // 点击时打开 JSON 导入弹窗
                    onClick={onOpenJsonImportModal}
                    px={5}
                  >
                    {t('common:Import')}
                  </Button>
                </>
              )}
            </Flex>
          </Flex>

          {/* 移动端的搜索框，在导航栏下方显示 */}
          {!isPc && (
            <Box mt={2}>
              {
                <SearchInput
                  maxW={['auto', '250px']}
                  value={searchKey}
                  onChange={(e) => setSearchKey(e.target.value)}
                  placeholder={t('app:search_app')}
                  maxLength={30}
                />
              }
            </Box>
          )}

          {/* 应用列表容器 */}
          <MyBox flex={'1 0 0'} isLoading={myApps.length === 0 && isFetchingApps}>
            {/* 应用列表组件 */}
            <List />
          </MyBox>
        </Flex>

        {/* 文件夹侧边栏区域，注释说明 */}
        {/* Folder slider */}
        {/* 只在选中了文件夹且是 PC 端时显示 */}
        {!!folderDetail && isPc && (
          <Box pt={[4, 6]} pr={[4, 6]} h={'100%'} pb={4} overflow={'auto'}>
            {/* 文件夹侧边栏卡片组件 */}
            <FolderSlideCard
              // 刷新资源的函数，同时重新获取文件夹详情和应用列表
              refetchResource={() => Promise.all([refetchFolderDetail(), loadMyApps()])}
              // 恢复继承权限的函数
              resumeInheritPermission={() => resumeInheritPer(folderDetail._id)}
              // 是否继承权限
              isInheritPermission={folderDetail.inheritPermission}
              // 是否有父级文件夹
              hasParent={!!folderDetail.parentId}
              // 刷新依赖项数组，这些值变化时会刷新组件
              refreshDeps={[folderDetail._id, folderDetail.inheritPermission]}
              // 文件夹名称
              name={folderDetail.name}
              // 文件夹介绍
              intro={folderDetail.intro}
              // 编辑文件夹的回调函数
              onEdit={() => {
                // 设置 editFolder 状态，包含文件夹的 id、name、intro
                setEditFolder({
                  id: folderDetail._id,
                  name: folderDetail.name,
                  intro: folderDetail.intro
                });
              }}
              // 移动文件夹的回调函数
              onMove={() => setMoveAppId(folderDetail._id)}
              // 删除确认提示文本
              deleteTip={t('app:confirm_delete_folder_tip')}
              // 删除文件夹的回调函数
              onDelete={() => onDeleFolder(folderDetail._id)}
              // 权限管理相关配置
              managePer={{
                // 默认角色
                defaultRole: ReadRoleVal,
                // 权限信息
                permission: folderDetail.permission,
                // 获取协作人员列表的函数
                onGetCollaboratorList: () => getCollaboratorList(folderDetail._id),
                // 角色列表
                roleList: AppRoleList,
                // 更新协作人员的函数
                onUpdateCollaborators: (props) =>
                  postUpdateAppCollaborators({
                    ...props,
                    appId: folderDetail._id
                  }),
                // 刷新依赖项
                refreshDeps: [folderDetail._id, folderDetail.inheritPermission],
                // 删除单个协作人员的函数
                onDelOneCollaborator: async (params) =>
                  deleteAppCollaborators({
                    ...params,
                    appId: folderDetail._id
                  })
              }}
            />
          </Box>
        )}
      </Flex>

      {/* 编辑文件夹弹窗，当 editFolder 有值时显示 */}
      {!!editFolder && (
        <EditFolderModal
          // 展开 editFolder 的所有属性作为 props
          {...editFolder}
          // 关闭弹窗的回调，清空 editFolder 状态
          onClose={() => setEditFolder(undefined)}
          // 创建文件夹的回调
          onCreate={(data) => onCreateFolder({ ...data, parentId, type: AppTypeEnum.folder })}
          // 编辑文件夹的回调
          onEdit={({ id, ...data }) => onUpdateApp(id, data)}
        />
      )}

      {/* JSON 导入弹窗，当 isOpenJsonImportModal 为 true 时显示 */}
      {isOpenJsonImportModal && <JsonImportModal onClose={onCloseJsonImportModal} />}
    </Flex>
  );
};

// 定义 ContextRender 函数组件
// 这个组件用于包装 MyApps 组件，提供必要的 Context 和容器
function ContextRender() {
  return (
    // 仪表板容器组件
    <DashboardContainer>
      {/* DashboardContainer 使用 render props 模式，传递 MenuIcon */}
      {({ MenuIcon }) => (
        // 应用列表 Context 提供者，为子组件提供共享状态
        <AppListContextProvider>
          {/* 渲染 MyApps 组件，传递 MenuIcon */}
          <MyApps MenuIcon={MenuIcon} />
        </AppListContextProvider>
      )}
    </DashboardContainer>
  );
}

// 导出 ContextRender 作为默认导出
// 这是 Next.js 页面的默认导出组件
export default ContextRender;

// 导出 getServerSideProps 函数
// 这是 Next.js Pages Router 中的服务器端渲染函数
// 每次页面请求时都会在服务器端运行
export async function getServerSideProps(content: any) {
  return {
    // 返回组件需要的 props
    props: {
      // 调用 serviceSideProps 获取国际化相关的 props
      // 加载 'app' 和 'user' 两个命名空间的翻译
      ...(await serviceSideProps(content, ['app', 'user']))
    }
  };
}
