import { DELETE, GET, POST, PUT } from '@/web/common/api/request';
import { hashStr } from '@fastgpt/global/common/string/tools';
import type { UserAuthTypeEnum } from '@fastgpt/global/support/user/auth/constants';
import type { UserUpdateParams } from '@/types/user';
import type { UserType } from '@fastgpt/global/support/user/type';
import type { SearchResult } from '@fastgpt/global/support/user/api';
import type {
  PreLoginResponseType,
  LoginByPasswordBodyType,
  OauthLoginBodyType,
  FastLoginBodyType,
  WxLoginBodyType,
  GetWXLoginQRResponseType
} from '@fastgpt/global/openapi/support/user/account/login/api';
import type {
  UpdatePasswordByCodeBodyType,
  UpdatePasswordByOldBodyType
} from '@fastgpt/global/openapi/support/user/account/password/api';
import type { AccountRegisterBodyType } from '@fastgpt/global/openapi/support/user/account/register/api';
import type { LangEnum } from '@fastgpt/global/common/i18n/type';
import type { LoginSuccessResponseType } from '@fastgpt/global/openapi/support/user/account/login/api';
import type {
  AccountCancellationPendingResponseType,
  AccountCancellationStatusResponseType,
  CheckAccountCancellationWechatBodyType,
  CheckAccountCancellationWechatResponseType,
  ConfirmAccountCancellationOAuthBodyType,
  GetAccountCancellationWechatQRResponseType,
  SendAccountCancellationCodeBodyType,
  StartAccountCancellationOAuthBodyType,
  StartAccountCancellationOAuthResponseType,
  SubmitAccountCancellationByCodeBodyType
} from '@fastgpt/global/openapi/support/user/account/cancellation/api';

/* ===== Auth code ===== */
export const sendAuthCode = (data: {
  username: string;
  type: `${UserAuthTypeEnum}`;
  googleToken: string;
  captcha: string;
  lang: `${LangEnum}`;
}) => POST(`/proApi/support/user/inform/sendAuthCode`, data);
export const getCaptchaPic = (username: string) =>
  GET<{
    captchaImage: string;
  }>('/proApi/support/user/account/captcha/getImgCaptcha', { username });

/* ===== login ===== */
export const getPreLogin = (username: string) =>
  GET<PreLoginResponseType>('/support/user/account/preLogin', { username });

export const getTokenLogin = () =>
  GET<UserType>('/support/user/account/tokenLogin', {}, { maxQuantity: 1 });
export const oauthLogin = (params: OauthLoginBodyType) =>
  POST<LoginSuccessResponseType>('/proApi/support/user/account/login/oauth', params);
export const postFastLogin = (params: FastLoginBodyType) =>
  POST<LoginSuccessResponseType>('/proApi/support/user/account/login/fastLogin', params);
export const ssoLogin = (params: any) =>
  GET<LoginSuccessResponseType>('/proApi/support/user/account/sso', params);
export const postLogin = ({ password, ...props }: LoginByPasswordBodyType) =>
  POST<LoginSuccessResponseType>('/support/user/account/loginByPassword', {
    ...props,
    password: hashStr(password)
  });
// wx login
export const getWXLoginQR = () =>
  GET<GetWXLoginQRResponseType>('/proApi/support/user/account/login/wx/getQR');

export const getWXLoginResult = (params: WxLoginBodyType) =>
  POST<LoginSuccessResponseType>(`/proApi/support/user/account/login/wx/getResult`, params);
export const loginOut = () => GET('/support/user/account/loginout');

/* ===== register ===== */
export const postRegister = ({
  username,
  password,
  code,
  inviterId,
  bd_vid,
  msclkid,
  fastgpt_sem,
  language
}: AccountRegisterBodyType) =>
  POST<LoginSuccessResponseType>(`/proApi/support/user/account/register/emailAndPhone`, {
    username,
    code,
    inviterId,
    bd_vid,
    msclkid,
    fastgpt_sem,
    language,
    password: hashStr(password)
  });

/* =====  password ===== */
export const postFindPassword = ({
  username,
  code,
  password,
  ...props
}: UpdatePasswordByCodeBodyType) =>
  POST<LoginSuccessResponseType>(`/proApi/support/user/account/password/updateByCode`, {
    username,
    code,
    ...props,
    password: hashStr(password)
  });
export const updatePasswordByOld = ({ oldPsw, newPsw }: UpdatePasswordByOldBodyType) =>
  POST('/support/user/account/updatePasswordByOld', {
    oldPsw: hashStr(oldPsw),
    newPsw: hashStr(newPsw)
  });
export const resetPassword = (newPsw: string) =>
  POST('/support/user/account/resetExpiredPsw', {
    newPsw: hashStr(newPsw)
  });
// Check the whether password has expired
export const getCheckPswExpired = () => GET<boolean>('/support/user/account/checkPswExpired');

/* ===== notification account ===== */
export const updateNotificationAccount = (data: { account: string; verifyCode: string }) =>
  PUT('/proApi/support/user/team/updateNotificationAccount', data);
export const updateContact = (data: { contact: string; verifyCode: string }) => {
  return PUT('/proApi/support/user/account/updateContact', data);
};

/* ===== user info ===== */
export const putUserInfo = (data: UserUpdateParams) => PUT('/support/user/account/update', data);

/* ===== account cancellation ===== */
export const getAccountCancellationStatus = () =>
  GET<AccountCancellationStatusResponseType>('/support/user/account/cancellation/status');

export const sendAccountCancellationCode = (data: SendAccountCancellationCodeBodyType) =>
  POST('/support/user/account/cancellation/sendCode', data);

export const submitAccountCancellationByCode = (data: SubmitAccountCancellationByCodeBodyType) =>
  POST<AccountCancellationPendingResponseType>(
    '/support/user/account/cancellation/submitByCode',
    data
  );

export const getAccountCancellationWechatQR = () =>
  POST<GetAccountCancellationWechatQRResponseType>(
    '/support/user/account/cancellation/wechat/getQR'
  );

export const checkAccountCancellationWechat = (data: CheckAccountCancellationWechatBodyType) =>
  POST<CheckAccountCancellationWechatResponseType>(
    '/support/user/account/cancellation/wechat/check',
    data
  );

export const startAccountCancellationOAuth = (data: StartAccountCancellationOAuthBodyType) =>
  POST<StartAccountCancellationOAuthResponseType>(
    '/support/user/account/cancellation/oauth/start',
    data
  );

export const confirmAccountCancellationOAuth = (data: ConfirmAccountCancellationOAuthBodyType) =>
  POST<AccountCancellationPendingResponseType>(
    '/support/user/account/cancellation/oauth/confirm',
    data
  );

export const cancelAccountCancellation = () =>
  DELETE<{ success: boolean }>('/support/user/account/cancellation/cancel');

export const postSyncMembers = () => POST('/proApi/support/user/sync');

export const GetSearchUserGroupOrg = (
  searchKey: string,
  options?: {
    members?: boolean;
    orgs?: boolean;
    groups?: boolean;
  }
) =>
  GET<SearchResult>('/proApi/support/user/search', { searchKey, ...options }, { maxQuantity: 1 });

export const ExportMembers = () => GET<{ csv: string }>('/proApi/support/user/team/member/export');
