import { addMinutes } from 'date-fns';
import { OAuthEnum } from '@fastgpt/global/support/user/constant';
import type { UserAuthTypeEnum } from '@fastgpt/global/support/user/auth/constants';
import {
  buildAccountSecurityVerifyStatus,
  UserAccountVerifyMethodEnum,
  type AccountSecurityVerifyStatus,
  type UserAccountVerifyMethodType
} from '@fastgpt/global/support/user/auth/account';
import { getNanoid } from '@fastgpt/global/common/string/tools';
import { POST } from '../../../common/api/plusRequest';
import { FastGPTProUrl } from '../../../common/system/constants';
import type { ApiRequestProps } from '../../../type/next';
import { authCode, addAuthCode } from '../auth/controller';
import { MongoUserAuth } from '../auth/schema';
import { MongoUser } from '../schema';
import { serviceEnv } from '../../../env';
import { stripUrlTrailingSlash } from '@fastgpt/global/common/string/url';
import type {
  GetWXLoginQRResponseType,
  LoginSuccessResponseType,
  OauthLoginBodyType,
  WxLoginBodyType
} from '@fastgpt/global/openapi/support/user/account/login/api';

export type AccountSecurityPurpose = UserAuthTypeEnum;

export type AccountSecurityVerifyConfig = {
  allowOldPasswordFallback?: boolean;
  allowedMethods?: UserAccountVerifyMethodType[];
};

const defaultAllowedVerifyMethods = [
  UserAccountVerifyMethodEnum.code,
  UserAccountVerifyMethodEnum.wechat,
  UserAccountVerifyMethodEnum.oauth,
  UserAccountVerifyMethodEnum.oldPassword
];

export const getCurrentAccountSecurityVerifyConfig = () => ({
  isGithubOAuthEnabled: !!global.feConfigs?.oauth?.github,
  isGoogleOAuthEnabled: !!global.feConfigs?.oauth?.google,
  isMicrosoftOAuthEnabled: !!global.feConfigs?.oauth?.microsoft?.clientId,
  isInternalWecomEnabled: !!global.feConfigs?.oauth?.wecom,
  isWechatOAuthEnabled: !!global.feConfigs?.oauth?.wechat,
  isSsoEnabled: !!global.feConfigs?.sso?.url
});

export function ensurePlusAccountVerifyConfigured() {
  if (!FastGPTProUrl) {
    return Promise.reject('The request was denied...');
  }
}

/**
 * 统一返回当前用户在高敏操作中可用的身份验证方式。
 * 业务方通过 allowedMethods 和 allowOldPasswordFallback 控制某个场景开放哪些验证方式。
 */
export async function getUserAccountSecurityVerifyStatus({
  userId,
  allowOldPasswordFallback = false,
  allowedMethods = defaultAllowedVerifyMethods
}: {
  userId: string;
} & AccountSecurityVerifyConfig): Promise<AccountSecurityVerifyStatus> {
  const user = await MongoUser.findById(userId, 'username').lean();

  if (!user || user.username === 'root') {
    return {
      canVerify: false,
      availableVerifyMethods: []
    };
  }

  const status = buildAccountSecurityVerifyStatus({
    username: user.username,
    allowOldPasswordFallback,
    ...getCurrentAccountSecurityVerifyConfig()
  });
  const availableVerifyMethods = status.availableVerifyMethods.filter((method) =>
    allowedMethods.includes(method)
  );

  return {
    ...status,
    canVerify: availableVerifyMethods.length > 0,
    availableVerifyMethods
  };
}

/**
 * 校验指定验证方式是否对当前用户和业务场景开放。
 * OAuth 验证额外检查 provider，避免把第三方账号验证串到其它登录渠道。
 */
export async function assertUserAccountVerifyMethod({
  userId,
  method,
  provider,
  allowOldPasswordFallback,
  allowedMethods
}: {
  userId: string;
  method: UserAccountVerifyMethodEnum;
  provider?: OAuthEnum;
} & AccountSecurityVerifyConfig) {
  const status = await getUserAccountSecurityVerifyStatus({
    userId,
    allowOldPasswordFallback,
    allowedMethods
  });

  if (!status.canVerify || !status.availableVerifyMethods.includes(method)) {
    return Promise.reject('Current account does not support this verification method');
  }

  if (method === UserAccountVerifyMethodEnum.oauth && status.oauthProvider !== provider) {
    return Promise.reject('OAuth provider mismatch');
  }

  return status;
}

/**
 * 校验当前账号收到的验证码。验证码 key 来自账号解析结果中的 authAccount，
 * purpose 用于隔离找回密码、修改密码、注销等不同验证码用途。
 */
export async function verifyUserAccountCode({
  userId,
  code,
  purpose,
  allowOldPasswordFallback,
  allowedMethods
}: {
  userId: string;
  code: string;
  purpose: AccountSecurityPurpose;
} & AccountSecurityVerifyConfig) {
  const status = await assertUserAccountVerifyMethod({
    userId,
    method: UserAccountVerifyMethodEnum.code,
    allowOldPasswordFallback,
    allowedMethods
  });

  if (!status.authAccount) {
    return Promise.reject('Current account can not receive verification code');
  }

  await authCode({
    key: status.authAccount,
    code,
    type: purpose
  });
}

export const getUserAccountWechatVerifyQR = async () => {
  await ensurePlusAccountVerifyConfigured();
  return POST<GetWXLoginQRResponseType>('/support/user/account/login/wx/getQR');
};

/**
 * 通过 Pro 微信扫码登录结果复核身份，只返回登录结果，不执行业务动作。
 * 调用方在返回 userId 一致后再决定是否改密、注销或执行其它高敏操作。
 */
export async function verifyUserAccountWechat({
  userId,
  code,
  allowOldPasswordFallback,
  allowedMethods
}: {
  userId: string;
  code: string;
} & AccountSecurityVerifyConfig) {
  await assertUserAccountVerifyMethod({
    userId,
    method: UserAccountVerifyMethodEnum.wechat,
    allowOldPasswordFallback,
    allowedMethods
  });
  await ensurePlusAccountVerifyConfigured();

  const result = await POST<LoginSuccessResponseType | undefined>(
    '/support/user/account/login/wx/getResult',
    {
      code
    } satisfies WxLoginBodyType
  );

  if (!result) return undefined;
  if (String(result.user?._id) !== String(userId)) {
    return Promise.reject('Wechat account mismatch');
  }

  return result;
}

export function getAccountSecurityOAuthCallbackUrl(req: ApiRequestProps) {
  const parseTrustedHostname = (value?: string) => {
    if (!value) return;

    const normalizedValue = value.trim();
    if (!normalizedValue) return;

    try {
      return new URL(
        normalizedValue.includes('://') ? normalizedValue : `https://${normalizedValue}`
      ).hostname;
    } catch {
      return;
    }
  };

  const trustedDomains = new Set(
    [
      global.feConfigs?.customApiDomain,
      global.feConfigs?.customSharePageDomain,
      serviceEnv.FE_DOMAIN
    ]
      .map(parseTrustedHostname)
      .filter((hostname): hostname is string => !!hostname)
  );

  const assertTrustedOrigin = (origin: string) => {
    try {
      const parsedOrigin = new URL(origin);
      if (trustedDomains.size > 0 && !trustedDomains.has(parsedOrigin.hostname)) {
        throw new Error(`Untrusted hostname in callback URL: ${parsedOrigin.hostname}`);
      }
      return parsedOrigin.origin;
    } catch (error) {
      if (error instanceof Error && error.message.startsWith('Untrusted hostname')) {
        throw error;
      }
      throw new Error('Invalid request origin');
    }
  };

  const origin = (() => {
    const headerOrigin = req.headers.origin;
    if (typeof headerOrigin === 'string' && headerOrigin) {
      return assertTrustedOrigin(headerOrigin);
    }

    const proto = req.headers['x-forwarded-proto'];
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const protocol = (Array.isArray(proto) ? proto[0] : proto || 'http').split(',')[0]?.trim();
    const hostValue = (Array.isArray(host) ? host[0] : host)?.split(',')[0]?.trim();
    if (hostValue) {
      return assertTrustedOrigin(`${protocol}://${hostValue}`);
    }

    return '';
  })();

  if (!origin) {
    throw new Error('Missing request origin');
  }

  const baseUrl = stripUrlTrailingSlash(serviceEnv.NEXT_PUBLIC_BASE_URL);

  return `${origin}${baseUrl}/login/provider`;
}

export const buildAccountSecurityOAuthUrl = async ({
  provider,
  state,
  callbackUrl
}: {
  provider: OAuthEnum;
  state: string;
  callbackUrl: string;
}) => {
  const redirectUri = encodeURIComponent(callbackUrl);

  if (provider === OAuthEnum.google) {
    const clientId = global.feConfigs?.oauth?.google;
    if (!clientId) return Promise.reject('Google OAuth is not configured');
    return `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&state=${state}&response_type=code&scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fuserinfo.profile%20https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fuserinfo.email%20openid&include_granted_scopes=true`;
  }

  if (provider === OAuthEnum.github) {
    const clientId = global.feConfigs?.oauth?.github;
    if (!clientId) return Promise.reject('Github OAuth is not configured');
    return `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&state=${state}&scope=user:email%20read:user`;
  }

  if (provider === OAuthEnum.microsoft) {
    const config = global.feConfigs?.oauth?.microsoft;
    if (!config?.clientId) return Promise.reject('Microsoft OAuth is not configured');
    return `https://login.microsoftonline.com/${config.tenantId || 'common'}/oauth2/v2.0/authorize?client_id=${config.clientId}&response_type=code&redirect_uri=${redirectUri}&response_mode=query&scope=https%3A%2F%2Fgraph.microsoft.com%2Fuser.read&state=${state}`;
  }

  await ensurePlusAccountVerifyConfigured();

  if (provider === OAuthEnum.sso) {
    return POST<string>('/support/user/account/login/getAuthURL', {
      redirectUri: callbackUrl,
      isWecomWorkTerminal: false,
      state
    });
  }

  if (provider === OAuthEnum.wecom) {
    return POST<string>('/support/user/account/login/wecom/getRedirectUrl', {
      redirectUri: callbackUrl,
      isWecomWorkTerminal: false,
      state
    });
  }

  return Promise.reject('Unsupported OAuth provider');
};

/**
 * 创建一次性 OAuth state。payload 由业务方决定，只要求可 JSON 序列化；
 * 后续 consume 会同时校验 userId 和 provider，防止跨账号或跨渠道复用 state。
 */
export async function createAccountSecurityOAuthState<TPayload extends Record<string, unknown>>({
  userId,
  provider,
  purpose,
  payload,
  expiresInMinutes = 10
}: {
  userId: string;
  provider: OAuthEnum;
  purpose: AccountSecurityPurpose;
  payload?: TPayload;
  expiresInMinutes?: number;
}) {
  const state = getNanoid(32);

  await addAuthCode({
    type: purpose,
    key: state,
    openid: JSON.stringify({ userId, provider, payload }),
    expiredTime: addMinutes(new Date(), expiresInMinutes)
  });

  return state;
}

export async function startAccountSecurityOAuth<TPayload extends Record<string, unknown>>({
  req,
  userId,
  provider,
  purpose,
  payload,
  allowOldPasswordFallback,
  allowedMethods
}: {
  req: ApiRequestProps;
  userId: string;
  provider: OAuthEnum;
  purpose: AccountSecurityPurpose;
  payload?: TPayload;
} & AccountSecurityVerifyConfig) {
  await assertUserAccountVerifyMethod({
    userId,
    method: UserAccountVerifyMethodEnum.oauth,
    provider,
    allowOldPasswordFallback,
    allowedMethods
  });

  const state = await createAccountSecurityOAuthState({
    userId,
    provider,
    purpose,
    payload
  });
  const callbackUrl = getAccountSecurityOAuthCallbackUrl(req);
  const url = await buildAccountSecurityOAuthUrl({ provider, state, callbackUrl });

  return { url, state };
}

export async function consumeAccountSecurityOAuthState<TPayload = unknown>({
  state,
  provider,
  userId,
  purpose
}: {
  state: string;
  provider: OAuthEnum;
  userId: string;
  purpose: AccountSecurityPurpose;
}) {
  const now = new Date();
  const record = await MongoUserAuth.findOneAndDelete({
    key: state,
    type: purpose,
    expiredTime: {
      $gt: now
    },
    openid: {
      $exists: true,
      $ne: ''
    }
  });

  if (!record?.openid) {
    return Promise.reject('Invalid OAuth state');
  }

  const data = JSON.parse(record.openid) as {
    userId?: string;
    provider?: OAuthEnum;
    payload?: TPayload;
  };

  if (data.userId !== userId || data.provider !== provider) {
    return Promise.reject('Invalid OAuth state');
  }

  return data.payload;
}

/**
 * 只校验 OAuth state 的业务归属，不消费一次性记录。
 * 用于需要先调用第三方接口再消费 state 的场景，避免第三方临时失败烧掉 state。
 */
export async function assertAccountSecurityOAuthStateOwner({
  state,
  provider,
  userId,
  purpose
}: {
  state: string;
  provider: OAuthEnum;
  userId: string;
  purpose: AccountSecurityPurpose;
}) {
  const now = new Date();
  const record = await MongoUserAuth.findOne({
    key: state,
    type: purpose,
    expiredTime: {
      $gt: now
    }
  }).lean();

  if (!record?.openid) {
    return Promise.reject('Invalid OAuth state');
  }

  const data = JSON.parse(record.openid) as {
    userId?: string;
    provider?: OAuthEnum;
  };

  if (data.userId !== userId || data.provider !== provider) {
    return Promise.reject('Invalid OAuth state');
  }
}

/**
 * 通过 Pro OAuth 登录结果复核身份，并消费一次性 state。
 * 返回业务方创建 state 时写入的 payload，具体业务动作仍由调用方执行。
 */
export async function verifyUserAccountOAuth<TPayload = unknown>({
  provider,
  callbackUrl,
  props,
  state,
  userId,
  purpose,
  allowOldPasswordFallback,
  allowedMethods
}: {
  provider: OAuthEnum;
  callbackUrl: string;
  props: Record<string, string>;
  state: string;
  userId: string;
  purpose: AccountSecurityPurpose;
} & AccountSecurityVerifyConfig) {
  await assertUserAccountVerifyMethod({
    userId,
    method: UserAccountVerifyMethodEnum.oauth,
    provider,
    allowOldPasswordFallback,
    allowedMethods
  });

  await ensurePlusAccountVerifyConfigured();

  const result = await POST<LoginSuccessResponseType>('/support/user/account/login/oauth', {
    type: provider,
    callbackUrl,
    props,
    language: 'zh-CN'
  } satisfies OauthLoginBodyType);

  if (String(result.user?._id) !== String(userId)) {
    return Promise.reject('OAuth account mismatch');
  }

  return consumeAccountSecurityOAuthState<TPayload>({
    state,
    provider,
    userId,
    purpose
  });
}
