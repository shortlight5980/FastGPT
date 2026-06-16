import { describe, expect, it } from 'vitest';
import { OAuthEnum } from '@fastgpt/global/support/user/constant';
import {
  AccountDeletionVerifyMethodEnum,
  AccountDeletionVerifyModeEnum
} from '@fastgpt/global/support/user/accountDeletion/constants';
import {
  buildAccountSecurityVerifyStatus,
  getUserAccountContactType,
  isValidUserAccountContact,
  maskUserAccount,
  resolveAccountCancellation,
  resolveUserAccountVerify,
  UserAccountContactTypeEnum,
  UserAccountVerifyMethodEnum
} from '@fastgpt/global/support/user/auth/account';

describe('support/user/auth/account', () => {
  describe('getUserAccountContactType', () => {
    it('detects email and phone account contacts', () => {
      expect(getUserAccountContactType(' fastgpt@example.com ')).toBe(
        UserAccountContactTypeEnum.email
      );
      expect(getUserAccountContactType('user+tag@example.technology')).toBe(
        UserAccountContactTypeEnum.email
      );
      expect(getUserAccountContactType('13800003911')).toBe(UserAccountContactTypeEnum.phone);
      expect(getUserAccountContactType('+8613800003911')).toBeUndefined();
      expect(getUserAccountContactType('admin-user')).toBeUndefined();
      expect(isValidUserAccountContact('admin-user')).toBe(false);
    });
  });

  describe('maskUserAccount', () => {
    it('masks email and phone while leaving unsupported names unchanged', () => {
      expect(maskUserAccount('ab@example.com')).toBe('a***@example.com');
      expect(maskUserAccount('alice@example.com')).toBe('al***e@example.com');
      expect(maskUserAccount('13800003911')).toBe('138****3911');
      expect(maskUserAccount('git-fastgpt')).toBe('git****tgpt');
      expect(maskUserAccount('root')).toBe('root');
      expect(maskUserAccount()).toBe('');
    });
  });

  describe('resolveUserAccountVerify', () => {
    it('uses verification code for email or phone accounts', () => {
      expect(resolveUserAccountVerify({ username: 'user@example.com' })).toEqual({
        availableVerifyMethods: [UserAccountVerifyMethodEnum.code],
        authAccount: 'user@example.com'
      });
    });

    it('uses configured OAuth provider for known third-party accounts', () => {
      expect(
        resolveUserAccountVerify({
          username: 'git-octocat',
          isGithubOAuthEnabled: true,
          allowOldPasswordFallback: true
        })
      ).toEqual({
        availableVerifyMethods: [UserAccountVerifyMethodEnum.oauth],
        oauthProvider: OAuthEnum.github
      });

      expect(
        resolveUserAccountVerify({
          username: 'wecom-user',
          isInternalWecomEnabled: false,
          isSsoEnabled: true
        })
      ).toEqual({
        availableVerifyMethods: [UserAccountVerifyMethodEnum.oauth],
        oauthProvider: OAuthEnum.sso
      });

      expect(
        resolveUserAccountVerify({
          username: 'microsoft-user',
          isMicrosoftOAuthEnabled: true
        })
      ).toEqual({
        availableVerifyMethods: [UserAccountVerifyMethodEnum.oauth],
        oauthProvider: OAuthEnum.microsoft
      });

      expect(
        resolveUserAccountVerify({
          username: 'feishu-user',
          isSsoEnabled: true
        })
      ).toEqual({
        availableVerifyMethods: [UserAccountVerifyMethodEnum.oauth],
        oauthProvider: OAuthEnum.sso
      });
    });

    it('honors old-password fallback only when the scene allows it', () => {
      expect(
        resolveUserAccountVerify({
          username: '',
          allowOldPasswordFallback: true
        })
      ).toEqual({
        availableVerifyMethods: [UserAccountVerifyMethodEnum.oldPassword]
      });

      expect(
        resolveUserAccountVerify({
          username: 'plain-admin',
          isSsoEnabled: false,
          allowOldPasswordFallback: true
        })
      ).toEqual({
        availableVerifyMethods: [UserAccountVerifyMethodEnum.oldPassword]
      });

      expect(
        resolveUserAccountVerify({
          username: 'plain-admin',
          isSsoEnabled: false,
          allowOldPasswordFallback: false
        })
      ).toEqual({
        availableVerifyMethods: []
      });

      expect(
        resolveUserAccountVerify({
          username: 'custom-user',
          isSsoEnabled: true,
          allowOldPasswordFallback: true
        })
      ).toEqual({
        availableVerifyMethods: [UserAccountVerifyMethodEnum.oauth],
        oauthProvider: OAuthEnum.sso
      });
    });

    it('returns unsupported when the matching external provider is disabled', () => {
      expect(resolveUserAccountVerify({ username: 'google-user' })).toEqual({
        availableVerifyMethods: []
      });
      expect(resolveUserAccountVerify({ username: 'wechat-user' })).toEqual({
        availableVerifyMethods: []
      });
    });
  });

  describe('buildAccountSecurityVerifyStatus', () => {
    it('builds display status from resolver result', () => {
      expect(
        buildAccountSecurityVerifyStatus({
          username: 'user@example.com'
        })
      ).toEqual({
        canVerify: true,
        availableVerifyMethods: [UserAccountVerifyMethodEnum.code],
        maskedAccount: 'us***r@example.com',
        authAccount: 'user@example.com',
        oauthProvider: undefined
      });
    });
  });

  describe('resolveAccountCancellation', () => {
    it('blocks all account types when cancellation is disabled', () => {
      expect(
        resolveAccountCancellation({
          username: 'fastgpt@example.com',
          enabled: false
        })
      ).toEqual({
        verifyMode: AccountDeletionVerifyModeEnum.unsupported,
        availableVerifyMethods: []
      });
    });

    it('uses code verification for email or phone usernames only', () => {
      expect(
        resolveAccountCancellation({
          username: '13800003911',
          enabled: true
        })
      ).toEqual({
        verifyMode: AccountDeletionVerifyModeEnum.code,
        availableVerifyMethods: [AccountDeletionVerifyMethodEnum.code],
        authAccount: '13800003911'
      });

      expect(
        resolveAccountCancellation({
          username: 'admin-user',
          contact: '13800003911',
          enabled: true
        })
      ).toEqual({
        verifyMode: AccountDeletionVerifyModeEnum.unsupported,
        availableVerifyMethods: []
      });
    });

    it('resolves known third-party prefixes without contact fallback', () => {
      expect(
        resolveAccountCancellation({
          username: 'git-fastgpt',
          contact: 'fastgpt@example.com',
          enabled: true,
          isGithubOAuthEnabled: true
        })
      ).toMatchObject({
        verifyMode: AccountDeletionVerifyModeEnum.oauth,
        availableVerifyMethods: [AccountDeletionVerifyMethodEnum.oauth],
        authAccount: 'git-fastgpt',
        oauthProvider: OAuthEnum.github
      });
      expect(
        resolveAccountCancellation({
          username: 'git-fastgpt',
          contact: 'fastgpt@example.com',
          enabled: true,
          isGithubOAuthEnabled: false
        })
      ).toEqual({
        verifyMode: AccountDeletionVerifyModeEnum.unsupported,
        availableVerifyMethods: []
      });

      expect(
        resolveAccountCancellation({
          username: 'wechat-openid',
          contact: 'fastgpt@example.com',
          enabled: true
        })
      ).toMatchObject({
        verifyMode: AccountDeletionVerifyModeEnum.wechat,
        availableVerifyMethods: [AccountDeletionVerifyMethodEnum.wechat],
        authAccount: 'wechat-openid'
      });
    });

    it('uses sso for unknown hyphenated prefixes only when sso is enabled', () => {
      expect(
        resolveAccountCancellation({
          username: 'custom-userid',
          enabled: true,
          isSsoEnabled: true
        })
      ).toMatchObject({
        verifyMode: AccountDeletionVerifyModeEnum.oauth,
        availableVerifyMethods: [AccountDeletionVerifyMethodEnum.oauth],
        authAccount: 'custom-userid',
        oauthProvider: OAuthEnum.sso
      });

      expect(
        resolveAccountCancellation({
          username: 'plainusername',
          enabled: true,
          isSsoEnabled: true
        })
      ).toEqual({
        verifyMode: AccountDeletionVerifyModeEnum.unsupported,
        availableVerifyMethods: []
      });

      expect(
        resolveAccountCancellation({
          username: 'custom-userid',
          enabled: true,
          isSsoEnabled: false
        })
      ).toEqual({
        verifyMode: AccountDeletionVerifyModeEnum.unsupported,
        availableVerifyMethods: []
      });
    });

    it('requires third-party OAuth provider config for prefixed accounts', () => {
      expect(
        resolveAccountCancellation({
          username: 'git-fastgpt',
          enabled: true,
          isGithubOAuthEnabled: false
        })
      ).toEqual({
        verifyMode: AccountDeletionVerifyModeEnum.unsupported,
        availableVerifyMethods: []
      });

      expect(
        resolveAccountCancellation({
          username: 'google-fastgpt',
          enabled: true,
          isGoogleOAuthEnabled: true
        })
      ).toMatchObject({
        verifyMode: AccountDeletionVerifyModeEnum.oauth,
        oauthProvider: OAuthEnum.google
      });

      expect(
        resolveAccountCancellation({
          username: 'microsoft-fastgpt',
          enabled: true,
          isMicrosoftOAuthEnabled: true
        })
      ).toMatchObject({
        verifyMode: AccountDeletionVerifyModeEnum.oauth,
        oauthProvider: OAuthEnum.microsoft
      });
    });

    it('uses internal wecom first and falls back to sso for wecom accounts', () => {
      expect(
        resolveAccountCancellation({
          username: 'wecom-userid',
          enabled: true,
          isInternalWecomEnabled: true,
          isSsoEnabled: true
        })
      ).toMatchObject({
        verifyMode: AccountDeletionVerifyModeEnum.oauth,
        oauthProvider: OAuthEnum.wecom
      });

      expect(
        resolveAccountCancellation({
          username: 'wecom-userid',
          enabled: true,
          isInternalWecomEnabled: false,
          isSsoEnabled: true
        })
      ).toMatchObject({
        verifyMode: AccountDeletionVerifyModeEnum.oauth,
        oauthProvider: OAuthEnum.sso
      });

      expect(
        resolveAccountCancellation({
          username: 'wecom-userid',
          enabled: true,
          isInternalWecomEnabled: false,
          isSsoEnabled: false
        })
      ).toEqual({
        verifyMode: AccountDeletionVerifyModeEnum.unsupported,
        availableVerifyMethods: []
      });
    });

    it('requires sso for feishu and dingtalk prefixed accounts', () => {
      expect(
        resolveAccountCancellation({
          username: 'feishu-userid',
          enabled: true,
          isSsoEnabled: true
        })
      ).toMatchObject({
        verifyMode: AccountDeletionVerifyModeEnum.oauth,
        oauthProvider: OAuthEnum.sso
      });

      expect(
        resolveAccountCancellation({
          username: 'dingtalk-openid',
          enabled: true,
          isSsoEnabled: false
        })
      ).toEqual({
        verifyMode: AccountDeletionVerifyModeEnum.unsupported,
        availableVerifyMethods: []
      });
    });
  });
});
