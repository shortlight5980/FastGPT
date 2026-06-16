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
