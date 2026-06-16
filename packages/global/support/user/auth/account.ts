import { OAuthEnum } from '../constant';
import {
  AccountDeletionVerifyMethodEnum,
  AccountDeletionVerifyModeEnum
} from '../accountDeletion/constants';

export const userAccountEmailReg = /^[^\s@]+@([A-Za-z0-9-]+\.)+[A-Za-z]{2,}$/;
export const userAccountPhoneReg = /^1[3456789]\d{9}$/;
export const userAccountEmailOrPhoneReg = new RegExp(
  `(${userAccountPhoneReg.source})|(${userAccountEmailReg.source})`
);

export enum UserAccountContactTypeEnum {
  email = 'email',
  phone = 'phone'
}

export enum UserAccountVerifyMethodEnum {
  code = 'code',
  wechat = 'wechat',
  oauth = 'oauth',
  oldPassword = 'oldPassword'
}

export type UserAccountVerifyMethodType = `${UserAccountVerifyMethodEnum}`;

export type AccountSecurityVerifyStatus = {
  canVerify: boolean;
  availableVerifyMethods: UserAccountVerifyMethodType[];
  maskedAccount?: string;
  authAccount?: string;
  oauthProvider?: `${OAuthEnum}`;
};

export type AccountSecurityResolverConfig = {
  isGithubOAuthEnabled?: boolean;
  isGoogleOAuthEnabled?: boolean;
  isMicrosoftOAuthEnabled?: boolean;
  isInternalWecomEnabled?: boolean;
  isWechatOAuthEnabled?: boolean;
  isSsoEnabled?: boolean;
};

export type UserAccountVerifyResolveResult = {
  availableVerifyMethods: UserAccountVerifyMethodEnum[];
  authAccount?: string;
  oauthProvider?: OAuthEnum;
};

export type AccountCancellationResolverConfig = AccountSecurityResolverConfig & {
  enabled?: boolean;
};

export type AccountCancellationResolverInput = AccountCancellationResolverConfig & {
  username?: string | null;
  contact?: string | null;
};

export type AccountCancellationResolveResult =
  | {
      verifyMode: AccountDeletionVerifyModeEnum.unsupported;
      availableVerifyMethods: [];
      authAccount?: undefined;
      oauthProvider?: undefined;
    }
  | {
      verifyMode: AccountDeletionVerifyModeEnum.code;
      availableVerifyMethods: [AccountDeletionVerifyMethodEnum.code];
      authAccount: string;
      oauthProvider?: undefined;
    }
  | {
      verifyMode: AccountDeletionVerifyModeEnum.wechat;
      availableVerifyMethods: [AccountDeletionVerifyMethodEnum.wechat];
      authAccount?: string;
      oauthProvider?: undefined;
    }
  | {
      verifyMode: AccountDeletionVerifyModeEnum.oauth;
      availableVerifyMethods: [AccountDeletionVerifyMethodEnum.oauth];
      authAccount?: string;
      oauthProvider: `${OAuthEnum}`;
    };

export const getUserAccountContactType = (account?: string | null) => {
  const trimAccount = account?.trim();
  if (!trimAccount) return undefined;
  if (userAccountEmailReg.test(trimAccount)) return UserAccountContactTypeEnum.email;
  if (userAccountPhoneReg.test(trimAccount)) return UserAccountContactTypeEnum.phone;
  return undefined;
};

export const isValidUserAccountContact = (account?: string | null) =>
  !!getUserAccountContactType(account);

/**
 * 判断账号名是否属于邮箱或手机号注册账号。
 * 第三方/OAuth/微信等账号通常不是联系方式本身，登录后需要再引导绑定联系方式。
 */
export const isEmailOrPhoneAccount = (username?: string | null) => {
  return !!getUserAccountContactType(username);
};

export const maskUserAccount = (account?: string | null) => {
  const trimAccount = account?.trim();
  if (!trimAccount) return '';

  if (userAccountEmailReg.test(trimAccount)) {
    const [name, domain] = trimAccount.split('@');
    if (!domain) return trimAccount;
    const maskedName =
      name.length <= 2 ? `${name[0] ?? ''}***` : `${name.slice(0, 2)}***${name.slice(-1)}`;
    return `${maskedName}@${domain}`;
  }

  if (userAccountPhoneReg.test(trimAccount)) {
    return `${trimAccount.slice(0, 3)}****${trimAccount.slice(-4)}`;
  }

  if (trimAccount.length > 7) {
    return `${trimAccount.slice(0, 3)}****${trimAccount.slice(-4)}`;
  }

  return trimAccount;
};

const unsupportedAccountCancellation = (): AccountCancellationResolveResult => ({
  verifyMode: AccountDeletionVerifyModeEnum.unsupported,
  availableVerifyMethods: []
});

const resolveOAuthVerify = ({
  provider,
  fallback
}: {
  provider?: OAuthEnum;
  fallback: UserAccountVerifyResolveResult;
}): UserAccountVerifyResolveResult => {
  if (!provider) return fallback;

  return {
    availableVerifyMethods: [UserAccountVerifyMethodEnum.oauth],
    oauthProvider: provider
  };
};

/**
 * 根据账号名推导高敏操作可用的身份验证方式。
 * 邮箱/手机号账号走验证码，已知第三方账号回到对应登录渠道验证；
 * 普通账号是否允许旧密码兜底由具体业务通过 allowOldPasswordFallback 决定。
 */
export const resolveUserAccountVerify = ({
  username,
  allowOldPasswordFallback = false,
  isGithubOAuthEnabled,
  isGoogleOAuthEnabled,
  isMicrosoftOAuthEnabled,
  isInternalWecomEnabled,
  isWechatOAuthEnabled,
  isSsoEnabled
}: AccountSecurityResolverConfig & {
  username?: string | null;
  allowOldPasswordFallback?: boolean;
}): UserAccountVerifyResolveResult => {
  const account = username?.trim();
  const oldPasswordFallback: UserAccountVerifyResolveResult = {
    availableVerifyMethods: allowOldPasswordFallback
      ? [UserAccountVerifyMethodEnum.oldPassword]
      : []
  };
  const unsupported: UserAccountVerifyResolveResult = {
    availableVerifyMethods: []
  };

  if (!account) return oldPasswordFallback;

  if (isEmailOrPhoneAccount(account)) {
    return {
      availableVerifyMethods: [UserAccountVerifyMethodEnum.code],
      authAccount: account
    };
  }

  if (account.startsWith('wechat-')) {
    if (!isWechatOAuthEnabled) return unsupported;
    return {
      availableVerifyMethods: [UserAccountVerifyMethodEnum.wechat],
      authAccount: account
    };
  }
  if (account.startsWith('git-')) {
    return resolveOAuthVerify({
      provider: isGithubOAuthEnabled ? OAuthEnum.github : undefined,
      fallback: unsupported
    });
  }
  if (account.startsWith('google-')) {
    return resolveOAuthVerify({
      provider: isGoogleOAuthEnabled ? OAuthEnum.google : undefined,
      fallback: unsupported
    });
  }
  if (account.startsWith('microsoft-')) {
    return resolveOAuthVerify({
      provider: isMicrosoftOAuthEnabled ? OAuthEnum.microsoft : undefined,
      fallback: unsupported
    });
  }
  if (account.startsWith('feishu-') || account.startsWith('dingtalk-')) {
    return resolveOAuthVerify({
      provider: isSsoEnabled ? OAuthEnum.sso : undefined,
      fallback: unsupported
    });
  }
  if (account.startsWith('wecom-')) {
    return resolveOAuthVerify({
      provider: isInternalWecomEnabled ? OAuthEnum.wecom : isSsoEnabled ? OAuthEnum.sso : undefined,
      fallback: unsupported
    });
  }

  if (/^[^-]+-.+$/.test(account)) {
    return resolveOAuthVerify({
      provider: isSsoEnabled ? OAuthEnum.sso : undefined,
      fallback: oldPasswordFallback
    });
  }

  return oldPasswordFallback;
};

/**
 * 把账号验证方式解析结果转成前端面板和业务 API 通用的状态结构。
 */
export const buildAccountSecurityVerifyStatus = ({
  username,
  allowOldPasswordFallback,
  ...config
}: AccountSecurityResolverConfig & {
  username?: string | null;
  allowOldPasswordFallback?: boolean;
}): AccountSecurityVerifyStatus => {
  const result = resolveUserAccountVerify({
    username,
    allowOldPasswordFallback,
    ...config
  });

  return {
    canVerify: result.availableVerifyMethods.length > 0,
    availableVerifyMethods: result.availableVerifyMethods,
    maskedAccount: maskUserAccount(result.authAccount || username),
    authAccount: result.authAccount,
    oauthProvider: result.oauthProvider
  };
};

/**
 * 根据用户名前缀、账号格式和系统配置推导注销身份验证方式。
 * 绑定的通知联系方式不参与判断，避免账号因修改 contact 而切换注销验证来源。
 * 注销场景不允许旧密码兜底，并且保留微信账号无需显式开启 OAuth 配置的旧行为。
 */
export const resolveAccountCancellation = ({
  username,
  enabled,
  isGithubOAuthEnabled,
  isGoogleOAuthEnabled,
  isMicrosoftOAuthEnabled,
  isInternalWecomEnabled,
  isSsoEnabled
}: AccountCancellationResolverInput): AccountCancellationResolveResult => {
  const account = username?.trim();
  if (!enabled || !account) return unsupportedAccountCancellation();

  const result = resolveUserAccountVerify({
    username: account,
    allowOldPasswordFallback: false,
    isGithubOAuthEnabled,
    isGoogleOAuthEnabled,
    isMicrosoftOAuthEnabled,
    isInternalWecomEnabled,
    isWechatOAuthEnabled: true,
    isSsoEnabled
  });

  if (
    result.availableVerifyMethods.includes(UserAccountVerifyMethodEnum.code) &&
    result.authAccount
  ) {
    return {
      verifyMode: AccountDeletionVerifyModeEnum.code,
      availableVerifyMethods: [AccountDeletionVerifyMethodEnum.code],
      authAccount: result.authAccount
    };
  }

  if (result.availableVerifyMethods.includes(UserAccountVerifyMethodEnum.wechat)) {
    return {
      verifyMode: AccountDeletionVerifyModeEnum.wechat,
      availableVerifyMethods: [AccountDeletionVerifyMethodEnum.wechat],
      authAccount: result.authAccount || account
    };
  }

  if (
    result.availableVerifyMethods.includes(UserAccountVerifyMethodEnum.oauth) &&
    result.oauthProvider
  ) {
    return {
      verifyMode: AccountDeletionVerifyModeEnum.oauth,
      availableVerifyMethods: [AccountDeletionVerifyMethodEnum.oauth],
      authAccount: account,
      oauthProvider: result.oauthProvider
    };
  }

  return unsupportedAccountCancellation();
};
