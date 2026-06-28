import { describe, expect, it, vi } from 'vitest';
import {
  claimAccountCancellationOAuthCallback,
  claimOAuthCallbackByPath,
  buildOAuthCallbackRequestKey,
  claimOAuthCallbackRequest,
  getLoginProviderOAuthCallbackBranch,
  handleAccountCancellationOAuthCallback
} from '../../../../src/web/support/user/loginRedirect/oauthCallback';
import { OAuthEnum } from '@fastgpt/global/support/user/constant';

describe('OAuth callback dedupe', () => {
  it('waits for loginStore hydration before routing account cancellation callbacks', () => {
    expect(
      getLoginProviderOAuthCallbackBranch({
        hasProps: true,
        initd: true,
        loginStoreHydrated: false,
        isOauthLogging: false,
        authType: undefined
      })
    ).toBe('waiting');

    expect(
      getLoginProviderOAuthCallbackBranch({
        hasProps: true,
        initd: true,
        loginStoreHydrated: true,
        isOauthLogging: false,
        authType: 'accountCancellation'
      })
    ).toBe('accountCancellation');
  });

  it('normalizes hash fragment from callback request key', () => {
    expect(
      buildOAuthCallbackRequestKey('/login/provider?code=oauth-code&state=oauth-state#_=_')
    ).toBe('/login/provider?code=oauth-code&state=oauth-state');
  });

  it('claims the same callback request only once', () => {
    const key = buildOAuthCallbackRequestKey('/login/provider?code=oauth-code&state=oauth-state');

    expect(claimOAuthCallbackRequest(key)).toBe(true);
    expect(claimOAuthCallbackRequest(key)).toBe(false);
  });

  it('claims the same callback path only once', () => {
    const asPath = '/login/provider?code=oauth-path-code&state=oauth-path-state#_=_';

    expect(claimOAuthCallbackByPath(asPath)).toBe(true);
    expect(claimOAuthCallbackByPath(asPath)).toBe(false);
  });

  it('dedupes account cancellation oauth callbacks before confirming the one-time state', () => {
    const asPath = '/login/provider?code=cancel-code&state=cancel-state';

    expect(
      claimAccountCancellationOAuthCallback({
        asPath,
        provider: OAuthEnum.github,
        state: 'cancel-state',
        expectedState: 'cancel-state'
      })
    ).toEqual({
      status: 'ok',
      state: 'cancel-state'
    });

    expect(
      claimAccountCancellationOAuthCallback({
        asPath,
        provider: OAuthEnum.github,
        state: 'cancel-state',
        expectedState: 'cancel-state'
      })
    ).toEqual({
      status: 'duplicate'
    });
  });

  it('accepts SSO account cancellation callbacks that restore state from loginStore', () => {
    expect(
      claimAccountCancellationOAuthCallback({
        asPath: '/login/provider?code=sso-cancel-code',
        provider: OAuthEnum.sso,
        state: undefined,
        expectedState: 'restored-state'
      })
    ).toEqual({
      status: 'ok',
      state: 'restored-state'
    });
  });

  it('rejects invalid non-SSO account cancellation states after claiming the callback', () => {
    expect(
      claimAccountCancellationOAuthCallback({
        asPath: '/login/provider?code=cancel-code&state=unexpected',
        provider: OAuthEnum.github,
        state: 'unexpected',
        expectedState: 'cancel-state'
      })
    ).toEqual({
      status: 'invalid_state'
    });
  });

  it('only confirms account cancellation once when the same callback is handled repeatedly', async () => {
    const onInvalidState = vi.fn();
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    const params = {
      asPath: '/login/provider?code=repeat-cancel-code&state=repeat-cancel-state',
      provider: OAuthEnum.github,
      state: 'repeat-cancel-state',
      expectedState: 'repeat-cancel-state',
      props: {
        code: 'repeat-cancel-code',
        source: 'account-cancel'
      },
      onInvalidState,
      onConfirm
    } as const;

    await expect(handleAccountCancellationOAuthCallback(params)).resolves.toBe('confirmed');
    await expect(handleAccountCancellationOAuthCallback(params)).resolves.toBe('duplicate');

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledWith({
      provider: OAuthEnum.github,
      state: 'repeat-cancel-state',
      props: {
        code: 'repeat-cancel-code',
        source: 'account-cancel'
      }
    });
    expect(onInvalidState).not.toHaveBeenCalled();
  });

  it('runs the invalid-state branch without calling confirm', async () => {
    const onInvalidState = vi.fn().mockResolvedValue(undefined);
    const onConfirm = vi.fn().mockResolvedValue(undefined);

    await expect(
      handleAccountCancellationOAuthCallback({
        asPath: '/login/provider?code=invalid-cancel-code&state=wrong-state',
        provider: OAuthEnum.github,
        state: 'wrong-state',
        expectedState: 'cancel-state',
        props: {
          code: 'invalid-cancel-code'
        },
        onInvalidState,
        onConfirm
      })
    ).resolves.toBe('invalid_state');

    expect(onInvalidState).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
