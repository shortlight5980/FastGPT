// 这是一个用户状态管理的 Zustand store 文件
// 主要功能是管理用户信息、团队信息、通知状态等全局状态
// 导出 useUserStore hook，供组件使用来获取和更新用户相关状态
// 使用了 Zustand 的 devtools、persist、immer 中间件增强功能

// 从自定义的 zustand 模块导入 create 函数和中间件
// create：用于创建 Zustand store
// devtools：集成 Redux DevTools，方便调试状态变化
// persist：持久化状态到本地存储
// immer：使用 Immer 库，允许以可变方式编写不可变状态更新
import { create, devtools, persist, immer } from '@fastgpt/web/common/zustand';

// 导入用户更新参数的类型定义
import type { UserUpdateParams } from '@/types/user';
// 导入用户相关的 API 函数
// getTokenLogin：通过 token 获取用户登录信息
// putUserInfo：更新用户信息
import { getTokenLogin, putUserInfo } from '@/web/support/user/api';
// 导入组织类型定义
import type { OrgType } from '@fastgpt/global/support/user/team/org/type';
// 导入用户类型定义
import type { UserType } from '@fastgpt/global/support/user/type';
// 导入团队套餐状态类型定义
import type { ClientTeamPlanStatusType } from '@fastgpt/global/support/wallet/sub/type';
// 导入获取团队套餐状态的 API 函数
import { getTeamPlanStatus } from './team/api';
// 导入国际化语言相关的工具函数
// setLangToStorage：将语言设置保存到本地存储
// getLangMapping：获取语言映射关系
import { setLangToStorage, getLangMapping } from '@fastgpt/web/i18n/utils';

// 定义 store 的状态类型 State
// 包含了 store 中所有的状态和方法的类型声明
type State = {
  // 系统消息已读的 ID，用于记录用户已读的系统消息
  systemMsgReadId: string;
  // 设置系统消息已读 ID 的方法
  setSysMsgReadId: (id: string) => void;

  // 是否显示更新通知的标志
  isUpdateNotification: boolean;
  // 设置是否显示更新通知的方法
  setIsUpdateNotification: (val: boolean) => void;

  // 用户信息对象，未登录时为 null
  userInfo: UserType | null;
  // 当前用户是否是团队管理员
  isTeamAdmin: boolean;
  // 初始化用户信息的异步方法
  initUserInfo: () => Promise<any>;
  // 设置用户信息的方法
  setUserInfo: (user: UserType | null) => void;
  // 更新用户信息的异步方法
  updateUserInfo: (user: UserUpdateParams) => Promise<void>;

  // 团队套餐状态信息，未获取时为 null
  teamPlanStatus: ClientTeamPlanStatusType | null;
  // 初始化团队套餐状态的异步方法
  initTeamPlanStatus: () => Promise<any>;

  // 团队组织列表
  teamOrgs: OrgType[];
};

// 创建并导出 useUserStore hook
// 使用 create 函数创建 Zustand store，泛型参数为 State 类型
export const useUserStore = create<State>()(
  // 使用 devtools 中间件包裹，支持 Redux DevTools 调试
  devtools(
    // 使用 persist 中间件包裹，支持状态持久化
    persist(
      // 使用 immer 中间件包裹，支持 mutable 方式更新状态
      immer((set, get) => ({
        // 初始化 systemMsgReadId 为空字符串
        systemMsgReadId: '',
        // 定义 setSysMsgReadId 方法
        setSysMsgReadId(id: string) {
          // 使用 set 函数更新状态
          // immer 允许直接修改 state 对象的属性
          set((state) => {
            state.systemMsgReadId = id;
          });
        },

        // 初始化 isUpdateNotification 为 true，默认显示更新通知
        isUpdateNotification: true,
        // 定义 setIsUpdateNotification 方法
        setIsUpdateNotification(val: boolean) {
          set((state) => {
            state.isUpdateNotification = val;
          });
        },

        // 初始化 userInfo 为 null，表示未登录状态
        userInfo: null,
        // 初始化 isTeamAdmin 为 false，默认不是团队管理员
        isTeamAdmin: false,
        // 定义初始化用户信息的异步方法
        async initUserInfo() {
          // 先初始化团队套餐状态
          get().initTeamPlanStatus();

          try {
            // 调用 API 通过 token 获取用户登录信息
            const res = await getTokenLogin();
            // 使用获取到的用户信息设置 store 中的用户状态
            get().setUserInfo(res);

            //设置html的fontsize（这段代码被注释掉了）
            const html = document?.querySelector('html');
            if (html) {
              // html.style.fontSize = '16px';
            }

            // 返回用户信息
            return res;
          } catch (error) {
            // 如果初始化失败，在控制台打印错误信息
            console.log('[Init user] error', error);
          }
        },
        // 定义设置用户信息的方法
        setUserInfo(user: UserType | null) {
          set((state) => {
            // 设置用户信息，如果 user 存在则使用，否则设为 null
            state.userInfo = user ? user : null;
            // 根据用户团队权限设置是否为团队管理员
            // hasManagePer 为 true 表示有管理权限
            state.isTeamAdmin = !!user?.team?.permission?.hasManagePer;
            // 获取用户的语言设置
            const lang = user?.language;
            if (lang) {
              // 将用户语言映射为系统支持的语言格式
              const mappedLang = getLangMapping(lang);
              // 将语言设置保存到本地存储
              setLangToStorage(mappedLang);
            }
          });
        },
        // 定义更新用户信息的异步方法
        async updateUserInfo(user: UserUpdateParams) {
          // 先保存旧的用户信息，用于在 API 调用失败时回滚
          const oldInfo = (get().userInfo ? { ...get().userInfo } : null) as UserType | null;
          // 先在本地更新用户信息（乐观更新）
          set((state) => {
            // 如果没有用户信息，则不进行更新
            if (!state.userInfo) return;
            // 合并旧信息和新信息，新信息覆盖旧信息
            state.userInfo = {
              ...state.userInfo,
              ...user
            };
          });
          try {
            // 调用 API 更新用户信息到服务器
            await putUserInfo(user);
          } catch (error) {
            // 如果 API 调用失败，回滚到旧的用户信息
            set((state) => {
              state.userInfo = oldInfo;
            });
            // 将错误继续抛出，让调用者处理
            return Promise.reject(error);
          }
        },
        // team 相关状态和方法
        // 初始化 teamPlanStatus 为 null
        teamPlanStatus: null,
        // 定义初始化团队套餐状态的异步方法
        async initTeamPlanStatus() {
          // 调用 API 获取团队套餐状态
          return getTeamPlanStatus().then((res) => {
            // 将获取到的套餐状态保存到 store 中
            set((state) => {
              state.teamPlanStatus = res;
            });
            // 返回套餐状态
            return res;
          });
        },
        // 团队成员分组列表，初始化为空数组（这个属性在 State 类型中没有定义）
        teamMemberGroups: [],
        // 团队组织列表，初始化为空数组
        teamOrgs: []
      })),
      // persist 中间件的配置选项
      {
        // 本地存储中的键名，用于标识这个 store 的数据
        name: 'userStore',
        // 自定义需要持久化的状态
        // partialize 函数接收完整的 state，返回需要持久化的部分
        partialize: (state) => ({
          // 只持久化 systemMsgReadId
          systemMsgReadId: state.systemMsgReadId,
          // 只持久化 isUpdateNotification
          isUpdateNotification: state.isUpdateNotification
        })
      }
    )
  )
);
