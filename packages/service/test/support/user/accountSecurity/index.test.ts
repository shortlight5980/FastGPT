import { afterEach, describe, expect, it, vi } from 'vitest';
import { OAuthEnum } from '@fastgpt/global/support/user/constant';
import { UserAuthTypeEnum } from '@fastgpt/global/support/user/auth/constants';
import { MongoUserAuth } from '@fastgpt/service/support/user/auth/schema';

describe('support/user/accountSecurity', () => {
  const originalFeConfigs = global.feConfigs;

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
    global.feConfigs = originalFeConfigs;
  });

  describe('getAccountSecurityOAuthCallbackUrl', () => {
    it('uses origin header first', async () => {
      const { getAccountSecurityOAuthCallbackUrl } =
        await import('@fastgpt/service/support/user/accountSecurity');

      expect(
        getAccountSecurityOAuthCallbackUrl({
          headers: {
            origin: 'https://fastgpt.example.com',
            host: 'ignored.example.com'
          }
        } as any)
      ).toBe('https://fastgpt.example.com/login/provider');
    });

    it('falls back to forwarded proto and host', async () => {
      const { getAccountSecurityOAuthCallbackUrl } =
        await import('@fastgpt/service/support/user/accountSecurity');

      expect(
        getAccountSecurityOAuthCallbackUrl({
          headers: {
            'x-forwarded-proto': 'https',
            'x-forwarded-host': 'proxy.example.com'
          }
        } as any)
      ).toBe('https://proxy.example.com/login/provider');
    });

    it('accepts configured custom domains stored as full URLs when validating forwarded host', async () => {
      global.feConfigs = {
        customApiDomain: 'https://api.example.com/api',
        customSharePageDomain: 'https://share.example.com'
      } as any;

      const { getAccountSecurityOAuthCallbackUrl } =
        await import('@fastgpt/service/support/user/accountSecurity');

      expect(
        getAccountSecurityOAuthCallbackUrl({
          headers: {
            'x-forwarded-proto': 'https',
            'x-forwarded-host': 'api.example.com'
          }
        } as any)
      ).toBe('https://api.example.com/login/provider');
    });

    it('validates origin header with the same trusted hostname rules', async () => {
      vi.stubEnv('FE_DOMAIN', 'https://fastgpt.example.com');
      vi.resetModules();
      global.feConfigs = {
        customApiDomain: 'https://api.example.com/api'
      } as any;

      const { getAccountSecurityOAuthCallbackUrl } =
        await import('@fastgpt/service/support/user/accountSecurity');

      expect(
        getAccountSecurityOAuthCallbackUrl({
          headers: {
            origin: 'https://fastgpt.example.com'
          }
        } as any)
      ).toBe('https://fastgpt.example.com/login/provider');

      expect(() =>
        getAccountSecurityOAuthCallbackUrl({
          headers: {
            origin: 'https://evil.example.com'
          }
        } as any)
      ).toThrow('Untrusted hostname in callback URL: evil.example.com');
    });

    it('appends NEXT_PUBLIC_BASE_URL when deployed under a sub path', async () => {
      vi.stubEnv('NEXT_PUBLIC_BASE_URL', '/fastgpt');
      vi.resetModules();

      const { getAccountSecurityOAuthCallbackUrl } =
        await import('@fastgpt/service/support/user/accountSecurity');

      expect(
        getAccountSecurityOAuthCallbackUrl({
          headers: {
            origin: 'https://fastgpt.example.com'
          }
        } as any)
      ).toBe('https://fastgpt.example.com/fastgpt/login/provider');
    });

    it('throws when origin can not be resolved', async () => {
      const { getAccountSecurityOAuthCallbackUrl } =
        await import('@fastgpt/service/support/user/accountSecurity');

      expect(() => getAccountSecurityOAuthCallbackUrl({ headers: {} } as any)).toThrow(
        'Missing request origin'
      );
    });
  });

  describe('buildAccountSecurityOAuthUrl', () => {
    it('builds provider OAuth URLs with state and encoded callback', async () => {
      const { buildAccountSecurityOAuthUrl } =
        await import('@fastgpt/service/support/user/accountSecurity');
      global.feConfigs = {
        oauth: {
          github: 'github-client',
          google: 'google-client',
          microsoft: {
            clientId: 'microsoft-client',
            tenantId: 'organizations'
          }
        }
      } as any;

      await expect(
        buildAccountSecurityOAuthUrl({
          provider: OAuthEnum.github,
          state: 'state-id',
          callbackUrl: 'https://fastgpt.example.com/login/provider'
        })
      ).resolves.toContain('client_id=github-client');

      await expect(
        buildAccountSecurityOAuthUrl({
          provider: OAuthEnum.google,
          state: 'state-id',
          callbackUrl: 'https://fastgpt.example.com/login/provider'
        })
      ).resolves.toContain('accounts.google.com');

      await expect(
        buildAccountSecurityOAuthUrl({
          provider: OAuthEnum.microsoft,
          state: 'state-id',
          callbackUrl: 'https://fastgpt.example.com/login/provider'
        })
      ).resolves.toContain('login.microsoftonline.com/organizations');
    });
  });

  describe('consumeAccountSecurityOAuthState', () => {
    it('deletes and returns payload for matched state', async () => {
      const { consumeAccountSecurityOAuthState, createAccountSecurityOAuthState } =
        await import('@fastgpt/service/support/user/accountSecurity');
      const state = await createAccountSecurityOAuthState({
        userId: 'user-1',
        provider: OAuthEnum.github,
        purpose: UserAuthTypeEnum.updatePassword,
        payload: {
          newPsw: 'hashed-password'
        }
      });

      await expect(
        consumeAccountSecurityOAuthState<{ newPsw: string }>({
          state,
          userId: 'user-1',
          provider: OAuthEnum.github,
          purpose: UserAuthTypeEnum.updatePassword
        })
      ).resolves.toEqual({
        newPsw: 'hashed-password'
      });

      await expect(
        MongoUserAuth.findOne({
          key: state,
          type: UserAuthTypeEnum.updatePassword
        })
      ).resolves.toBeNull();
    });

    it('rejects missing state without deleting anything', async () => {
      const existed = await MongoUserAuth.create({
        key: 'other-state',
        type: UserAuthTypeEnum.updatePassword,
        openid: JSON.stringify({
          userId: 'user-1',
          provider: OAuthEnum.github
        })
      });

      const { consumeAccountSecurityOAuthState } =
        await import('@fastgpt/service/support/user/accountSecurity');
      await expect(
        consumeAccountSecurityOAuthState({
          state: 'missing-state',
          userId: 'user-1',
          provider: OAuthEnum.github,
          purpose: UserAuthTypeEnum.updatePassword
        })
      ).rejects.toBe('Invalid OAuth state');

      await expect(MongoUserAuth.findById(existed._id)).resolves.toBeTruthy();
    });

    it('rejects mismatched user or provider after consuming state', async () => {
      await MongoUserAuth.create({
        key: 'state-id',
        type: UserAuthTypeEnum.updatePassword,
        openid: JSON.stringify({
          userId: 'other-user',
          provider: OAuthEnum.github
        })
      });

      const { consumeAccountSecurityOAuthState } =
        await import('@fastgpt/service/support/user/accountSecurity');
      await expect(
        consumeAccountSecurityOAuthState({
          state: 'state-id',
          userId: 'user-1',
          provider: OAuthEnum.google,
          purpose: UserAuthTypeEnum.updatePassword
        })
      ).rejects.toBe('Invalid OAuth state');

      await expect(
        MongoUserAuth.findOne({
          key: 'state-id',
          type: UserAuthTypeEnum.updatePassword
        })
      ).resolves.toBeNull();
    });

    it('rejects expired state even if TTL cleanup has not run yet', async () => {
      await MongoUserAuth.create({
        key: 'expired-state',
        type: UserAuthTypeEnum.updatePassword,
        openid: JSON.stringify({
          userId: 'user-1',
          provider: OAuthEnum.github
        }),
        expiredTime: new Date(Date.now() - 60_000)
      });

      const { consumeAccountSecurityOAuthState } =
        await import('@fastgpt/service/support/user/accountSecurity');
      await expect(
        consumeAccountSecurityOAuthState({
          state: 'expired-state',
          userId: 'user-1',
          provider: OAuthEnum.github,
          purpose: UserAuthTypeEnum.updatePassword
        })
      ).rejects.toBe('Invalid OAuth state');

      await expect(
        MongoUserAuth.findOne({
          key: 'expired-state',
          type: UserAuthTypeEnum.updatePassword
        })
      ).resolves.toBeTruthy();
    });
  });

  describe('assertAccountSecurityOAuthStateOwner', () => {
    it('validates matched state ownership without consuming state', async () => {
      const { assertAccountSecurityOAuthStateOwner, createAccountSecurityOAuthState } =
        await import('@fastgpt/service/support/user/accountSecurity');
      const state = await createAccountSecurityOAuthState({
        userId: 'user-1',
        provider: OAuthEnum.github,
        purpose: UserAuthTypeEnum.updatePassword
      });

      await expect(
        assertAccountSecurityOAuthStateOwner({
          state,
          userId: 'user-1',
          provider: OAuthEnum.github,
          purpose: UserAuthTypeEnum.updatePassword
        })
      ).resolves.toBeUndefined();

      await expect(
        MongoUserAuth.findOne({
          key: state,
          type: UserAuthTypeEnum.updatePassword
        })
      ).resolves.toBeTruthy();
    });

    it('rejects mismatched ownership without consuming state', async () => {
      const record = await MongoUserAuth.create({
        key: 'state-id',
        type: UserAuthTypeEnum.updatePassword,
        openid: JSON.stringify({
          userId: 'user-1',
          provider: OAuthEnum.github
        })
      });
      const { assertAccountSecurityOAuthStateOwner } =
        await import('@fastgpt/service/support/user/accountSecurity');

      await expect(
        assertAccountSecurityOAuthStateOwner({
          state: 'state-id',
          userId: 'other-user',
          provider: OAuthEnum.github,
          purpose: UserAuthTypeEnum.updatePassword
        })
      ).rejects.toBe('Invalid OAuth state');

      await expect(MongoUserAuth.findById(record._id)).resolves.toBeTruthy();
    });

    it('rejects expired state ownership check without consuming state', async () => {
      const record = await MongoUserAuth.create({
        key: 'expired-owner-state',
        type: UserAuthTypeEnum.updatePassword,
        openid: JSON.stringify({
          userId: 'user-1',
          provider: OAuthEnum.github
        }),
        expiredTime: new Date(Date.now() - 60_000)
      });
      const { assertAccountSecurityOAuthStateOwner } =
        await import('@fastgpt/service/support/user/accountSecurity');

      await expect(
        assertAccountSecurityOAuthStateOwner({
          state: 'expired-owner-state',
          userId: 'user-1',
          provider: OAuthEnum.github,
          purpose: UserAuthTypeEnum.updatePassword
        })
      ).rejects.toBe('Invalid OAuth state');

      await expect(MongoUserAuth.findById(record._id)).resolves.toBeTruthy();
    });
  });
});
