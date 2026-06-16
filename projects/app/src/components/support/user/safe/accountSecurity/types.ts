import type { ReactNode } from 'react';
import type { OAuthEnum } from '@fastgpt/global/support/user/constant';
import {
  UserAccountVerifyMethodEnum,
  type AccountSecurityVerifyStatus,
  type UserAccountVerifyMethodType
} from '@fastgpt/global/support/user/auth/account';

export const AccountSecurityVerifyMethodEnum = UserAccountVerifyMethodEnum;
export type AccountSecurityVerifyMethod = UserAccountVerifyMethodType;
export type AccountSecurityStatus = AccountSecurityVerifyStatus;

export type AccountSecurityCodeSendParams = {
  captcha: string;
  googleToken: string;
};

export type AccountSecurityCodeSubmitParams = {
  code: string;
};

export type AccountSecurityWechatQRCode = {
  code: string;
  codeUrl: string;
};

export type AccountSecurityOAuthStartResult = {
  url: string;
  state: string;
};

export type AccountSecurityCodeHandlers<TSubmitResult> = {
  onSendCode: (params: AccountSecurityCodeSendParams) => Promise<unknown> | unknown;
  onSubmitCode: (params: AccountSecurityCodeSubmitParams) => Promise<TSubmitResult> | TSubmitResult;
};

export type AccountSecurityOAuthHandlers = {
  onStartOAuth: (params: {
    provider: `${OAuthEnum}`;
  }) => Promise<AccountSecurityOAuthStartResult> | AccountSecurityOAuthStartResult;
  onOAuthStarted?: (params: AccountSecurityOAuthStartResult & { provider: `${OAuthEnum}` }) => void;
  autoRedirect?: boolean;
};

export type AccountSecurityWechatHandlers<TSubmitResult> = {
  getQRCode: () => Promise<AccountSecurityWechatQRCode> | AccountSecurityWechatQRCode;
  checkQRCode: (params: { code: string }) => Promise<TSubmitResult | null | undefined>;
};

export type AccountSecurityVerifyCopy = {
  accountPlaceholder?: string;
  codePlaceholder?: string;
  submitText?: string;
  cancelText?: string;
  resendCodeText?: (count: number) => string;
  sendCodeSuccessToast?: string | null;
  verifyErrorText?: string;
  oauthErrorText?: string;
  oauthButtonText?: (providerName: string) => string;
  wechatTip?: ReactNode;
  wechatQRCodeErrorText?: string;
  wechatProviderName?: string;
};
