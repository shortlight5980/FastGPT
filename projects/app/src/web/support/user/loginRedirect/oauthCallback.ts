import { OAuthEnum } from '@fastgpt/global/support/user/constant';

/**
 * 同一条 OAuth 回调在开发模式、状态恢复或重复渲染时可能被执行多次。
 * 这里按当前回调 URL 做一次性 claim，避免重复调用 loginout / oauthLogin。
 */
const handledOAuthCallbackKeys = new Set<string>();

export const buildOAuthCallbackRequestKey = (asPath: string) => {
  return asPath.split('#')[0];
};

export const claimOAuthCallbackRequest = (key: string) => {
  if (!key || handledOAuthCallbackKeys.has(key)) {
    return false;
  }

  handledOAuthCallbackKeys.add(key);
  return true;
};

export const claimOAuthCallbackByPath = (asPath: string) => {
  return claimOAuthCallbackRequest(buildOAuthCallbackRequestKey(asPath));
};

export type LoginProviderOAuthCallbackBranch =
  | 'waiting'
  | 'duplicate'
  | 'accountCancellation'
  | 'login';

const hasOAuthCredentialProps = (props: Record<string, string>) => {
  return Boolean(props.code || props.token);
};

/**
 * Next router 首次渲染时 query 可能还是空对象，必须等路由就绪且回调参数出现后
 * 才能 claim 一次性 OAuth 回调，避免把空 query 当成真实回调消费。
 */
export const isLoginProviderOAuthCallbackReady = ({
  routerReady,
  props,
  state,
  authType,
  provider
}: {
  routerReady: boolean;
  props: Record<string, string>;
  state?: string;
  authType?: 'login' | 'accountCancellation';
  provider?: OAuthEnum;
}) => {
  if (!routerReady || !hasOAuthCredentialProps(props)) {
    return false;
  }

  if (provider === OAuthEnum.sso) {
    return true;
  }

  if (authType === 'accountCancellation' || provider) {
    return Boolean(state);
  }

  return true;
};

/**
 * 判断登录 provider 页面当前是否可以消费 OAuth 回调，以及应进入哪个业务分支。
 *
 * loginStore 来自 zustand persist，未来 storage 如果变成异步 hydrate，
 * 这里必须先等待 hydrate 完成；否则账号注销 OAuth 回调会在 authType 恢复前
 * 被普通登录分支 claim 掉，导致一次性 callback 提前失效。
 */
export const getLoginProviderOAuthCallbackBranch = ({
  isCallbackReady,
  initd,
  loginStoreHydrated,
  isOauthLogging,
  authType
}: {
  isCallbackReady: boolean;
  initd: boolean;
  loginStoreHydrated: boolean;
  isOauthLogging: boolean;
  authType?: 'login' | 'accountCancellation';
}): LoginProviderOAuthCallbackBranch => {
  if (!isCallbackReady || !initd || !loginStoreHydrated) {
    return 'waiting';
  }

  if (isOauthLogging) {
    return 'duplicate';
  }

  if (authType === 'accountCancellation') {
    return 'accountCancellation';
  }

  return 'login';
};

type AccountCancellationOAuthCallbackClaimResult =
  | {
      status: 'duplicate';
    }
  | {
      status: 'invalid_state';
    }
  | {
      status: 'ok';
      state: string;
    };

/**
 * 统一处理账号注销 OAuth 回调的“一次性消费 + state 归一化”。
 * 这样 provider 登录分支和注销分支都能复用同一套 dedupe 机制，避免某个分支遗漏。
 */
export const claimAccountCancellationOAuthCallback = ({
  asPath,
  provider,
  state,
  expectedState
}: {
  asPath: string;
  provider: OAuthEnum;
  state?: string;
  expectedState: string;
}): AccountCancellationOAuthCallbackClaimResult => {
  if (!claimOAuthCallbackByPath(asPath)) {
    return {
      status: 'duplicate'
    };
  }

  const normalizedState = provider === OAuthEnum.sso ? state || expectedState : state;

  if (!normalizedState || (provider !== OAuthEnum.sso && normalizedState !== expectedState)) {
    return {
      status: 'invalid_state'
    };
  }

  return {
    status: 'ok',
    state: normalizedState
  };
};

type HandleAccountCancellationOAuthCallbackResult = 'duplicate' | 'invalid_state' | 'confirmed';

/**
 * 执行账号注销 OAuth 回调的分支协调。
 * 这里把“一次性 claim + state 校验 + 后续动作派发”收敛到一个可测试的纯协调层，
 * 避免页面 effect 重复执行时再次消费一次性的服务端 state。
 */
export const handleAccountCancellationOAuthCallback = async ({
  asPath,
  provider,
  state,
  expectedState,
  props,
  onInvalidState,
  onConfirm
}: {
  asPath: string;
  provider: OAuthEnum;
  state?: string;
  expectedState: string;
  props: Record<string, string>;
  onInvalidState: () => void | Promise<void>;
  onConfirm: (params: {
    provider: OAuthEnum;
    state: string;
    props: Record<string, string>;
  }) => Promise<void>;
}): Promise<HandleAccountCancellationOAuthCallbackResult> => {
  const callbackResult = claimAccountCancellationOAuthCallback({
    asPath,
    provider,
    state,
    expectedState
  });

  if (callbackResult.status === 'duplicate') {
    return 'duplicate';
  }

  if (callbackResult.status === 'invalid_state') {
    await onInvalidState();
    return 'invalid_state';
  }

  await onConfirm({
    provider,
    state: callbackResult.state,
    props
  });
  return 'confirmed';
};
