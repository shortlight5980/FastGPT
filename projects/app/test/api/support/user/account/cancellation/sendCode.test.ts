import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as sendCodeApi from '@/pages/api/support/user/account/cancellation/sendCode';
import * as wechatGetQRApi from '@/pages/api/support/user/account/cancellation/wechat/getQR';
import * as wechatCheckApi from '@/pages/api/support/user/account/cancellation/wechat/check';
import * as oauthStartApi from '@/pages/api/support/user/account/cancellation/oauth/start';
import * as oauthConfirmApi from '@/pages/api/support/user/account/cancellation/oauth/confirm';
import { GET, POST } from '@fastgpt/service/common/api/plusRequest';
import { UserAuthTypeEnum } from '@fastgpt/global/support/user/auth/constants';
import { OAuthEnum } from '@fastgpt/global/support/user/constant';
import { AccountDeletionVerifyMethodEnum } from '@fastgpt/global/support/user/accountDeletion/constants';
import { Call } from '@test/utils/request';
import {
  createAccountDeletionOAuthState,
  getAccountCancellationStatus
} from '@fastgpt/service/support/user/accountDeletion';
import { MongoUser } from '@fastgpt/service/support/user/schema';

const authCertMock = vi.hoisted(() => vi.fn());

vi.mock('@fastgpt/service/support/permission/auth/common', () => ({
  authCert: authCertMock
}));

vi.mock('@fastgpt/service/common/api/plusRequest', () => ({
  GET: vi.fn().mockResolvedValue({
    code: 'wx-code',
    codeUrl: 'https://example.com/wx.png'
  }),
  POST: vi.fn().mockResolvedValue({
    message: '发送验证码成功'
  })
}));

vi.mock('@fastgpt/service/support/user/accountDeletion', async (importOriginal) => {
  const mod =
    await importOriginal<typeof import('@fastgpt/service/support/user/accountDeletion')>();
  return {
    ...mod,
    getAccountCancellationStatus: vi.fn(mod.getAccountCancellationStatus),
    createAccountDeletionOAuthState: vi.fn().mockResolvedValue('oauth-state')
  };
});

describe('account cancellation sendCode API', () => {
  beforeEach(() => {
    authCertMock.mockReset();
    authCertMock.mockImplementation(async ({ req }: any) => ({
      userId: req?.auth?.userId,
      teamId: req?.auth?.teamId,
      tmbId: req?.auth?.tmbId,
      isRoot: req?.auth?.isRoot ?? false,
      sessionId: req?.auth?.sessionId
    }));
    vi.mocked(getAccountCancellationStatus).mockReset();
    vi.mocked(getAccountCancellationStatus).mockImplementation(async (props) => {
      const mod = await vi.importActual<
        typeof import('@fastgpt/service/support/user/accountDeletion')
      >('@fastgpt/service/support/user/accountDeletion');
      return mod.getAccountCancellationStatus(props);
    });
    vi.mocked(GET).mockReset();
    vi.mocked(GET).mockResolvedValue({
      code: 'wx-code',
      codeUrl: 'https://example.com/wx.png'
    });
    vi.mocked(POST).mockReset();
    vi.mocked(POST).mockResolvedValue({
      message: '发送验证码成功'
    });
    vi.mocked(createAccountDeletionOAuthState).mockReset();
    vi.mocked(createAccountDeletionOAuthState).mockResolvedValue('oauth-state');
    global.feConfigs = {
      ...(global.feConfigs || {}),
      accountCancellation: {
        enabled: true
      },
      oauth: {
        ...(global.feConfigs?.oauth || {}),
        github: 'github-client-id',
        wecom: true
      },
      sso: {
        ...(global.feConfigs?.sso || {}),
        url: 'https://sso.example.com'
      }
    } as any;
  });

  it('should validate body and forward account deletion code request to pro service', async () => {
    const user = await MongoUser.create({
      username: 'user1@example.com',
      contact: 'user1@example.com',
      password: '123456'
    });
    const res = await Call(sendCodeApi.default, {
      auth: {
        userId: String(user._id),
        teamId: 'team-1',
        tmbId: 'tmb-1',
        isRoot: false,
        sessionId: 'session-1'
      } as any,
      headers: {
        cookie: 'fastgpt_token=session-1',
        token: 'session-1',
        host: 'ignored.example.com'
      },
      body: {
        captcha: 'captcha123',
        googleToken: 'google-token'
      }
    });

    expect(res.code).toBe(200);
    expect(res.data).toEqual({
      message: '发送验证码成功'
    });
    expect(POST).toHaveBeenCalledWith(
      '/support/user/inform/sendAuthCode',
      {
        captcha: 'captcha123',
        googleToken: 'google-token',
        type: UserAuthTypeEnum.accountDeletion
      },
      {
        headers: {
          cookie: 'fastgpt_token=session-1',
          token: 'session-1'
        }
      }
    );
  });

  it('should reject invalid body before forwarding', async () => {
    const user = await MongoUser.create({
      username: 'invalid-body@example.com',
      contact: 'invalid-body@example.com',
      password: '123456'
    });
    const res = await Call(sendCodeApi.default, {
      auth: {
        userId: String(user._id),
        teamId: 'team-1',
        tmbId: 'tmb-1',
        isRoot: false,
        sessionId: 'session-1'
      } as any,
      body: {
        googleToken: 'google-token'
      }
    });

    expect(res.code).toBe(500);
    expect(POST).not.toHaveBeenCalled();
  });

  it('should reject code request for non-contact usernames even when contact is bound', async () => {
    const user = await MongoUser.create({
      username: 'adminuser',
      contact: '13800003911',
      password: '123456'
    });
    const res = await Call(sendCodeApi.default, {
      auth: {
        userId: String(user._id),
        teamId: 'team-1',
        tmbId: 'tmb-1',
        isRoot: false,
        sessionId: 'session-1'
      } as any,
      body: {
        captcha: 'captcha123',
        googleToken: 'google-token'
      }
    });

    expect(res.code).toBe(500);
    expect(POST).not.toHaveBeenCalled();
  });

  it('should reject code request when server status has no auth account', async () => {
    vi.mocked(getAccountCancellationStatus).mockResolvedValueOnce({
      status: 'none',
      canRequestCancellation: true,
      availableVerifyMethods: [AccountDeletionVerifyMethodEnum.code],
      maskedAccount: 'us***r@example.com'
    });

    const res = await Call(sendCodeApi.default, {
      auth: {
        userId: 'user-without-auth-account',
        teamId: 'team-1',
        tmbId: 'tmb-1',
        isRoot: false,
        sessionId: 'session-1'
      } as any,
      body: {
        captcha: 'captcha123',
        googleToken: 'google-token'
      }
    });

    expect(res.code).toBe(500);
    expect(POST).not.toHaveBeenCalled();
  });

  it('should reject code request when account cancellation is already pending', async () => {
    vi.mocked(getAccountCancellationStatus).mockResolvedValueOnce({
      status: 'pending',
      canRequestCancellation: false,
      availableVerifyMethods: [AccountDeletionVerifyMethodEnum.code],
      maskedAccount: 'us***r@example.com',
      authAccount: 'user@example.com',
      requestedAt: new Date('2026-06-01T00:00:00.000Z'),
      scheduledDeleteAt: new Date('2026-06-16T00:00:00.000Z')
    });

    const res = await Call(sendCodeApi.default, {
      auth: {
        userId: 'pending-user',
        teamId: 'team-1',
        tmbId: 'tmb-1',
        isRoot: false,
        sessionId: 'session-1'
      } as any,
      body: {
        captcha: 'captcha123',
        googleToken: 'google-token'
      }
    });

    expect(res.code).toBe(500);
    expect(POST).not.toHaveBeenCalled();
  });

  it('should forward wechat QR and check requests', async () => {
    const user = await MongoUser.create({
      username: 'wechat-openid',
      password: '123456'
    });
    vi.mocked(POST).mockResolvedValueOnce({
      status: 'pending',
      requestedAt: new Date('2026-06-01T00:00:00.000Z'),
      scheduledDeleteAt: new Date('2026-06-16T00:00:00.000Z')
    });

    const qrRes = await Call(wechatGetQRApi.default, {
      auth: {
        userId: String(user._id),
        teamId: 'team-1',
        tmbId: 'tmb-1',
        isRoot: false,
        sessionId: 'session-1'
      } as any
    });
    expect(qrRes.data).toEqual({
      code: 'wx-code',
      codeUrl: 'https://example.com/wx.png'
    });
    expect(GET).toHaveBeenCalledWith('/support/user/account/login/wx/getQR');

    const checkRes = await Call(wechatCheckApi.default, {
      auth: {
        userId: String(user._id),
        teamId: 'team-1',
        tmbId: 'tmb-1',
        isRoot: false,
        sessionId: 'session-1'
      } as any,
      headers: {
        token: 'session-1'
      },
      body: {
        code: 'wx-code'
      }
    });

    expect(checkRes.code).toBe(200);
    expect(POST).toHaveBeenCalledWith(
      '/support/user/account/cancellation/wechat/check',
      {
        code: 'wx-code'
      },
      {
        headers: {
          token: 'session-1'
        }
      }
    );
  });

  it('should keep polling wechat verification when pro service has no result yet', async () => {
    const user = await MongoUser.create({
      username: 'wechat-openid-pending',
      password: '123456'
    });
    vi.mocked(POST).mockResolvedValueOnce(null);

    const checkRes = await Call(wechatCheckApi.default, {
      auth: {
        userId: String(user._id),
        teamId: 'team-1',
        tmbId: 'tmb-1',
        isRoot: false,
        sessionId: 'session-1'
      } as any,
      headers: {
        token: 'session-1'
      },
      body: {
        code: 'wx-code'
      }
    });

    expect(checkRes.code).toBe(200);
    expect(checkRes.data).toBeNull();
    expect(POST).toHaveBeenCalledWith(
      '/support/user/account/cancellation/wechat/check',
      {
        code: 'wx-code'
      },
      {
        headers: {
          token: 'session-1'
        }
      }
    );
  });

  it('should create oauth state and forward oauth confirm requests', async () => {
    const user = await MongoUser.create({
      username: 'git-fastgpt',
      password: '123456'
    });
    vi.mocked(POST)
      .mockResolvedValueOnce({
        status: 'pending',
        requestedAt: new Date('2026-06-01T00:00:00.000Z'),
        scheduledDeleteAt: new Date('2026-06-16T00:00:00.000Z')
      })
      .mockResolvedValueOnce({
        status: 'pending',
        requestedAt: '2026-06-01T00:00:00.000Z',
        scheduledDeleteAt: '2026-06-16T00:00:00.000Z'
      });

    const startRes = await Call(oauthStartApi.default, {
      auth: {
        userId: String(user._id),
        teamId: 'team-1',
        tmbId: 'tmb-1',
        isRoot: false,
        sessionId: 'session-1'
      } as any,
      headers: {
        origin: 'https://fastgpt.example.com'
      },
      body: {
        provider: OAuthEnum.github
      }
    });

    expect(startRes.code).toBe(200);
    expect(authCertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        authToken: true,
        allowUserAccountDeletionPending: true,
        allowCurrentUserOwnedTeamAccountDeletionPending: true
      })
    );
    expect(createAccountDeletionOAuthState).toHaveBeenCalledWith({
      userId: String(user._id),
      provider: OAuthEnum.github
    });
    expect(startRes.data.url).toContain('https://github.com/login/oauth/authorize');
    expect(startRes.data.url).toContain('state=oauth-state');
    expect(startRes.data.url).toContain(
      encodeURIComponent('https://fastgpt.example.com/login/provider')
    );
    expect(startRes.data.state).toBe('oauth-state');

    const confirmRes = await Call(oauthConfirmApi.default, {
      auth: {
        userId: String(user._id),
        teamId: 'team-1',
        tmbId: 'tmb-1',
        isRoot: false,
        sessionId: 'session-1'
      } as any,
      headers: {
        token: 'session-1'
      },
      body: {
        provider: OAuthEnum.github,
        state: 'oauth-state',
        callbackUrl: 'https://fastgpt.example.com/login/provider',
        props: {
          code: 'oauth-code'
        }
      }
    });

    expect(confirmRes.code).toBe(200);
    expect(authCertMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        authToken: true,
        allowUserAccountDeletionPending: true,
        allowCurrentUserOwnedTeamAccountDeletionPending: true
      })
    );
    expect(confirmRes.data).toEqual({
      status: 'pending',
      requestedAt: new Date('2026-06-01T00:00:00.000Z'),
      scheduledDeleteAt: new Date('2026-06-16T00:00:00.000Z')
    });
    expect(POST).toHaveBeenCalledWith(
      '/support/user/account/cancellation/oauth/confirm',
      {
        provider: OAuthEnum.github,
        state: 'oauth-state',
        callbackUrl: 'https://fastgpt.example.com/login/provider',
        props: {
          code: 'oauth-code'
        }
      },
      {
        headers: {
          token: 'session-1'
        }
      }
    );
  });

  it('should pass cancellation state when starting SSO verification', async () => {
    const user = await MongoUser.create({
      username: 'custom-userid',
      password: '123456'
    });
    vi.mocked(POST).mockResolvedValueOnce('https://sso.example.com/login/oauth?state=oauth-state');

    const startRes = await Call(oauthStartApi.default, {
      auth: {
        userId: String(user._id),
        teamId: 'team-1',
        tmbId: 'tmb-1',
        isRoot: false,
        sessionId: 'session-1'
      } as any,
      headers: {
        origin: 'https://fastgpt.example.com'
      },
      body: {
        provider: OAuthEnum.sso
      }
    });

    expect(startRes.code).toBe(200);
    expect(authCertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        authToken: true,
        allowUserAccountDeletionPending: true,
        allowCurrentUserOwnedTeamAccountDeletionPending: true
      })
    );
    expect(startRes.data).toEqual({
      url: 'https://sso.example.com/login/oauth?state=oauth-state',
      state: 'oauth-state'
    });
    expect(createAccountDeletionOAuthState).toHaveBeenCalledWith({
      userId: String(user._id),
      provider: OAuthEnum.sso
    });
    expect(POST).toHaveBeenCalledWith('/support/user/account/login/getAuthURL', {
      redirectUri: 'https://fastgpt.example.com/login/provider',
      isWecomWorkTerminal: false,
      state: 'oauth-state'
    });
  });
});
