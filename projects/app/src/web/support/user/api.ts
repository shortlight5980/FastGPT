// 这是一个用户相关 API 请求的封装文件
// 主要功能是封装用户认证、登录、注册、密码管理、用户信息管理等 API 调用
// 导出多个 API 请求函数，供业务代码使用

// 导入自定义的 HTTP 请求方法
// GET：发送 GET 请求
// POST：发送 POST 请求
// PUT：发送 PUT 请求
import { GET, POST, PUT } from '@/web/common/api/request';
// 导入字符串哈希函数，用于对密码进行加密
import { hashStr } from '@fastgpt/global/common/string/tools';
// 导入用户认证类型枚举
import type { UserAuthTypeEnum } from '@fastgpt/global/support/user/auth/constants';
// 导入用户更新参数类型
import type { UserUpdateParams } from '@/types/user';
// 导入用户类型
import type { UserType } from '@fastgpt/global/support/user/type';
// 导入搜索结果类型
import type { SearchResult } from '@fastgpt/global/support/user/api';
// 导入登录相关的类型定义
import type {
  PreLoginResponseType,
  LoginByPasswordBodyType,
  OauthLoginBodyType,
  FastLoginBodyType,
  WxLoginBodyType,
  GetWXLoginQRResponseType
} from '@fastgpt/global/openapi/support/user/account/login/api';
// 导入通过旧密码更新密码的类型
import type { UpdatePasswordByOldBodyType } from '@fastgpt/global/openapi/support/user/account/password/api';
// 导入账号注册的类型
import type { AccountRegisterBodyType } from '@fastgpt/global/openapi/support/user/account/register/api';
// 导入语言枚举类型
import type { LangEnum } from '@fastgpt/global/common/i18n/type';
// 导入登录成功响应类型
import type { LoginSuccessResponseType } from '@fastgpt/global/openapi/support/user/account/login/api';

/* ===== 验证码相关 ===== */
// 发送验证码函数
// 接受包含用户名、认证类型、Google token、验证码和语言的参数
export const sendAuthCode = (data: {
  username: string;
  type: `${UserAuthTypeEnum}`;
  googleToken: string;
  captcha: string;
  lang: `${LangEnum}`;
}) => POST(`/proApi/support/user/inform/sendAuthCode`, data);
// 获取图片验证码函数
// 接受用户名作为参数，返回包含验证码图片的对象
export const getCaptchaPic = (username: string) =>
  GET<{
    captchaImage: string;
  }>('/proApi/support/user/account/captcha/getImgCaptcha', { username });

/* ===== 登录相关 ===== */
// 预登录函数，用于登录前的检查
// 接受用户名作为参数，返回预登录响应信息
export const getPreLogin = (username: string) =>
  GET<PreLoginResponseType>('/support/user/account/preLogin', { username });

// 通过 token 登录函数
// 不接受参数，返回用户信息
// maxQuantity: 1 表示最大请求次数为 1
export const getTokenLogin = () =>
  GET<UserType>('/support/user/account/tokenLogin', {}, { maxQuantity: 1 });
// OAuth 登录函数
// 接受 OAuth 登录参数，返回登录成功响应
export const oauthLogin = (params: OauthLoginBodyType) =>
  POST<LoginSuccessResponseType>('/proApi/support/user/account/login/oauth', params);
// 快速登录函数
// 接受快速登录参数，返回登录成功响应
export const postFastLogin = (params: FastLoginBodyType) =>
  POST<LoginSuccessResponseType>('/proApi/support/user/account/login/fastLogin', params);
// SSO 单点登录函数
// 接受 SSO 登录参数，返回登录成功响应
export const ssoLogin = (params: any) =>
  GET<LoginSuccessResponseType>('/proApi/support/user/account/sso', params);
// 密码登录函数
// 接受密码登录参数，对密码进行哈希处理后发送请求
export const postLogin = ({ password, ...props }: LoginByPasswordBodyType) =>
  POST<LoginSuccessResponseType>('/support/user/account/loginByPassword', {
    ...props,
    password: hashStr(password)
  });
// 微信登录相关
// 获取微信登录二维码函数
export const getWXLoginQR = () =>
  GET<GetWXLoginQRResponseType>('/proApi/support/user/account/login/wx/getQR');

// 获取微信登录结果函数
// 接受微信登录参数，返回登录成功响应
export const getWXLoginResult = (params: WxLoginBodyType) =>
  POST<LoginSuccessResponseType>(`/proApi/support/user/account/login/wx/getResult`, params);
// 登出函数
export const loginOut = () => GET('/support/user/account/loginout');

/* ===== 注册相关 ===== */
// 注册账号函数
// 接受注册参数，对密码进行哈希处理后发送请求
export const postRegister = ({
  username,
  password,
  code,
  inviterId,
  bd_vid,
  msclkid,
  fastgpt_sem
}: AccountRegisterBodyType) =>
  POST<LoginSuccessResponseType>(`/proApi/support/user/account/register/emailAndPhone`, {
    username,
    code,
    inviterId,
    bd_vid,
    msclkid,
    fastgpt_sem,
    password: hashStr(password)
  });

/* ===== 密码相关 ===== */
// 找回密码函数
// 接受用户名、验证码和新密码，对密码进行哈希处理后发送请求
export const postFindPassword = ({
  username,
  code,
  password
}: {
  username: string;
  code: string;
  password: string;
}) =>
  POST<LoginSuccessResponseType>(`/proApi/support/user/account/password/updateByCode`, {
    username,
    code,
    password: hashStr(password)
  });
// 通过旧密码更新新密码函数
// 接受旧密码和新密码，都进行哈希处理后发送请求
export const updatePasswordByOld = ({ oldPsw, newPsw }: UpdatePasswordByOldBodyType) =>
  POST('/support/user/account/updatePasswordByOld', {
    oldPsw: hashStr(oldPsw),
    newPsw: hashStr(newPsw)
  });
// 重置过期密码函数
// 接受新密码，进行哈希处理后发送请求
export const resetPassword = (newPsw: string) =>
  POST('/support/user/account/resetExpiredPsw', {
    newPsw: hashStr(newPsw)
  });
// 检查密码是否已过期函数
// 返回布尔值表示密码是否过期
export const getCheckPswExpired = () => GET<boolean>('/support/user/account/checkPswExpired');

/* ===== 通知账号相关 ===== */
// 更新通知账号函数
// 接受账号和验证码作为参数
export const updateNotificationAccount = (data: { account: string; verifyCode: string }) =>
  PUT('/proApi/support/user/team/updateNotificationAccount', data);
// 更新联系方式函数
// 接受联系人和验证码作为参数
export const updateContact = (data: { contact: string; verifyCode: string }) => {
  return PUT('/proApi/support/user/account/updateContact', data);
};

/* ===== 用户信息相关 ===== */
// 更新用户信息函数
// 接受用户更新参数
export const putUserInfo = (data: UserUpdateParams) => PUT('/support/user/account/update', data);

// 同步成员函数
export const postSyncMembers = () => POST('/proApi/support/user/sync');

// 搜索用户、分组、组织函数
// 接受搜索关键词和选项（成员、组织、分组）
export const GetSearchUserGroupOrg = (
  searchKey: string,
  options?: {
    members?: boolean;
    orgs?: boolean;
    groups?: boolean;
  }
) =>
  GET<SearchResult>('/proApi/support/user/search', { searchKey, ...options }, { maxQuantity: 1 });

// 导出成员函数
// 返回包含 CSV 数据的对象
export const ExportMembers = () => GET<{ csv: string }>('/proApi/support/user/team/member/export');
