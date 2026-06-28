import { beforeEach, describe, expect, it, vi } from 'vitest';
import { addDays } from 'date-fns';
import {
  cancelAccountDeletion,
  consumeAccountDeletionOAuthState,
  createAccountDeletionOAuthState,
  formatAccountDeletionPendingResponse,
  getAccountCancellationStatus,
  maskAccount,
  submitAccountDeletion,
  submitAccountDeletionByOAuth,
  submitAccountDeletionByWechat
} from '../../../../support/user/accountDeletion';
import { assertAccountUsable } from '../../../../support/user/accountDeletion/check';
import { MongoAccountDeletion } from '../../../../support/user/accountDeletion/schema';
import { MongoUser } from '../../../../support/user/schema';
import { MongoTeam } from '../../../../support/user/team/teamSchema';
import { MongoTeamMember } from '../../../../support/user/team/teamMemberSchema';
import { AccountDeletionStatusEnum } from '@fastgpt/global/support/user/accountDeletion/constants';
import { AccountDeletionVerifyMethodEnum } from '@fastgpt/global/support/user/accountDeletion/constants';
import { TeamMemberRoleEnum } from '@fastgpt/global/support/user/team/constant';
import { UserErrEnum } from '@fastgpt/global/common/error/code/user';
import { TeamErrEnum } from '@fastgpt/global/common/error/code/team';
import { OAuthEnum } from '@fastgpt/global/support/user/constant';

describe('accountDeletion service', () => {
  beforeEach(() => {
    vi.setSystemTime(new Date('2026-06-01T00:00:00.000Z'));
    global.feConfigs = {
      ...(global.feConfigs || {}),
      accountCancellation: {
        enabled: true
      },
      oauth: {
        ...(global.feConfigs?.oauth || {}),
        github: 'github-client-id',
        google: 'google-client-id',
        microsoft: {
          clientId: 'microsoft-client-id'
        },
        wecom: true
      },
      sso: {
        ...(global.feConfigs?.sso || {}),
        url: 'https://sso.example.com'
      }
    } as any;
  });

  const createPendingDeletionRecord = async ({
    userId,
    usernameSnapshot,
    ownerTeamIds = []
  }: {
    userId: string;
    usernameSnapshot: string;
    ownerTeamIds?: string[];
  }) => {
    const requestedAt = new Date('2026-06-01T00:00:00.000Z');
    return MongoAccountDeletion.create({
      userId,
      usernameSnapshot,
      status: AccountDeletionStatusEnum.pending,
      verifyMethod: AccountDeletionVerifyMethodEnum.code,
      requestedAt,
      scheduledDeleteAt: addDays(requestedAt, 15),
      ownerTeamIds
    });
  };

  it('masks email and phone account values', () => {
    expect(maskAccount('alice@example.com')).toBe('al***e@example.com');
    expect(maskAccount('13800003911')).toBe('138****3911');
    expect(maskAccount('git-fastgpt')).toBe('git****tgpt');
    expect(maskAccount('1234567')).toBe('1234567');
    expect(maskAccount()).toBe('');
  });

  it('throws on invalid pending response records', () => {
    expect(() =>
      formatAccountDeletionPendingResponse({
        requestedAt: new Date()
      } as any)
    ).toThrow('Invalid account deletion pending record');
  });

  it('returns cancellable status with server-derived verification methods', async () => {
    const user = await MongoUser.create({
      username: 'user@example.com',
      contact: '13800003911',
      password: '123456'
    });

    const status = await getAccountCancellationStatus({ userId: String(user._id) });

    expect(status).toMatchObject({
      status: 'none',
      maskedAccount: 'us***r@example.com',
      authAccount: 'user@example.com',
      canRequestCancellation: true,
      availableVerifyMethods: [AccountDeletionVerifyMethodEnum.code]
    });
  });

  it('returns unsupported status for disabled cancellation or non-contact usernames', async () => {
    const adminUser = await MongoUser.create({
      username: 'adminuser',
      password: '123456'
    });

    const adminStatus = await getAccountCancellationStatus({ userId: String(adminUser._id) });
    expect(adminStatus).toMatchObject({
      status: 'none',
      canRequestCancellation: false,
      availableVerifyMethods: []
    });

    global.feConfigs.accountCancellation = { enabled: false };
    const emailUser = await MongoUser.create({
      username: 'disabled@example.com',
      password: '123456'
    });
    const disabledStatus = await getAccountCancellationStatus({ userId: String(emailUser._id) });
    expect(disabledStatus).toMatchObject({
      status: 'none',
      canRequestCancellation: false,
      availableVerifyMethods: []
    });
  });

  it('returns a single third-party verification method inferred from username prefix', async () => {
    const user = await MongoUser.create({
      username: 'git-fastgpt',
      contact: 'fastgpt@example.com',
      password: '123456'
    });

    const status = await getAccountCancellationStatus({ userId: String(user._id) });

    expect(status).toMatchObject({
      status: 'none',
      maskedAccount: 'git****tgpt',
      authAccount: 'git-fastgpt',
      canRequestCancellation: true,
      availableVerifyMethods: [AccountDeletionVerifyMethodEnum.oauth],
      oauthProvider: OAuthEnum.github
    });
  });

  it('returns wechat verification directly for wechat accounts', async () => {
    const user = await MongoUser.create({
      username: 'wechat-openid-1',
      contact: 'wechat@example.com',
      password: '123456'
    });

    const status = await getAccountCancellationStatus({ userId: String(user._id) });

    expect(status).toMatchObject({
      status: 'none',
      maskedAccount: 'wec****id-1',
      authAccount: 'wechat-openid-1',
      canRequestCancellation: true,
      availableVerifyMethods: [AccountDeletionVerifyMethodEnum.wechat]
    });
  });

  it('uses sso for unknown prefixed accounts and ignores contact fallback', async () => {
    const ssoUser = await MongoUser.create({
      username: 'custom-userid',
      contact: 'sso-contact@example.com',
      password: '123456'
    });

    await expect(
      getAccountCancellationStatus({ userId: String(ssoUser._id) })
    ).resolves.toMatchObject({
      maskedAccount: 'cus****erid',
      authAccount: 'custom-userid',
      canRequestCancellation: true,
      availableVerifyMethods: [AccountDeletionVerifyMethodEnum.oauth],
      oauthProvider: OAuthEnum.sso
    });

    const adminUser = await MongoUser.create({
      username: 'adminuser',
      contact: '13800003911',
      password: '123456'
    });

    await expect(
      getAccountCancellationStatus({ userId: String(adminUser._id) })
    ).resolves.toMatchObject({
      canRequestCancellation: false,
      availableVerifyMethods: [],
      maskedAccount: ''
    });
    await expect(
      getAccountCancellationStatus({ userId: String(adminUser._id) })
    ).resolves.not.toHaveProperty('authAccount');
  });

  it('uses internal wecom first and falls back to sso for wecom accounts', async () => {
    const user = await MongoUser.create({
      username: 'wecom-userid',
      password: '123456'
    });

    await expect(getAccountCancellationStatus({ userId: String(user._id) })).resolves.toMatchObject(
      {
        availableVerifyMethods: [AccountDeletionVerifyMethodEnum.oauth],
        oauthProvider: OAuthEnum.wecom
      }
    );

    global.feConfigs.oauth = {
      ...(global.feConfigs.oauth || {}),
      wecom: false
    };
    await expect(getAccountCancellationStatus({ userId: String(user._id) })).resolves.toMatchObject(
      {
        availableVerifyMethods: [AccountDeletionVerifyMethodEnum.oauth],
        oauthProvider: OAuthEnum.sso
      }
    );

    global.feConfigs.sso = {};
    await expect(getAccountCancellationStatus({ userId: String(user._id) })).resolves.toMatchObject(
      {
        canRequestCancellation: false,
        availableVerifyMethods: []
      }
    );
  });

  it('submits account deletion once and captures owner teams', async () => {
    const user = await MongoUser.create({
      username: 'deleteme@example.com',
      contact: 'deleteme@example.com',
      password: '123456'
    });
    const ownerTeam = await MongoTeam.create({
      name: 'Owner Team',
      ownerId: user._id
    });
    await MongoTeamMember.create({
      userId: user._id,
      teamId: ownerTeam._id,
      role: TeamMemberRoleEnum.owner,
      status: 'active'
    });

    const pending = await submitAccountDeletion({
      userId: String(user._id),
      verifyMethod: AccountDeletionVerifyMethodEnum.code
    });

    expect(pending).toEqual({
      status: AccountDeletionStatusEnum.pending,
      requestedAt: new Date('2026-06-01T00:00:00.000Z'),
      scheduledDeleteAt: addDays(new Date('2026-06-01T00:00:00.000Z'), 15)
    });

    const record = await MongoAccountDeletion.findOne({ userId: user._id }).lean();
    expect(record?.status).toBe(AccountDeletionStatusEnum.pending);
    expect(record?.ownerTeamIds.map(String)).toEqual([String(ownerTeam._id)]);

    const again = await submitAccountDeletion({
      userId: String(user._id),
      verifyMethod: AccountDeletionVerifyMethodEnum.code
    });
    expect(again).toEqual(pending);
    expect(await MongoAccountDeletion.countDocuments({ userId: user._id })).toBe(1);

    await MongoAccountDeletion.updateOne(
      { userId: user._id },
      { $set: { status: AccountDeletionStatusEnum.finalizing } }
    );
    const finalizingAgain = await submitAccountDeletion({
      userId: String(user._id),
      verifyMethod: AccountDeletionVerifyMethodEnum.code
    });
    expect(finalizingAgain).toEqual({
      ...pending,
      status: AccountDeletionStatusEnum.finalizing
    });
    expect(await MongoAccountDeletion.countDocuments({ userId: user._id })).toBe(1);

    await expect(getAccountCancellationStatus({ userId: String(user._id) })).resolves.toMatchObject(
      {
        status: AccountDeletionStatusEnum.finalizing,
        canRequestCancellation: false,
        availableVerifyMethods: [AccountDeletionVerifyMethodEnum.code]
      }
    );
  });

  it('cancels pending account deletion', async () => {
    const user = await MongoUser.create({
      username: 'cancel@example.com',
      password: '123456'
    });
    await submitAccountDeletion({
      userId: String(user._id),
      verifyMethod: AccountDeletionVerifyMethodEnum.code
    });

    await expect(cancelAccountDeletion({ userId: String(user._id) })).resolves.toEqual({
      success: true
    });
    expect(await MongoAccountDeletion.findOne({ userId: user._id })).toBeNull();
  });

  it('returns pending status with canRequestCancellation false once cancellation has started', async () => {
    const user = await MongoUser.create({
      username: 'pending-status@example.com',
      password: '123456'
    });

    await submitAccountDeletion({
      userId: String(user._id),
      verifyMethod: AccountDeletionVerifyMethodEnum.code
    });

    await expect(getAccountCancellationStatus({ userId: String(user._id) })).resolves.toMatchObject(
      {
        status: AccountDeletionStatusEnum.pending,
        canRequestCancellation: false,
        availableVerifyMethods: [AccountDeletionVerifyMethodEnum.code]
      }
    );
  });

  it('submits account deletion by wechat only when username matches', async () => {
    const user = await MongoUser.create({
      username: 'wechat-openid-1',
      password: '123456'
    });

    await expect(
      submitAccountDeletionByWechat({
        userId: String(user._id),
        username: 'wechat-openid-2'
      })
    ).rejects.toBe('Wechat account mismatch');

    const pending = await submitAccountDeletionByWechat({
      userId: String(user._id),
      username: 'wechat-openid-1'
    });
    expect(pending.status).toBe(AccountDeletionStatusEnum.pending);

    const record = await MongoAccountDeletion.findOne({ userId: user._id }).lean();
    expect(record?.verifyMethod).toBe(AccountDeletionVerifyMethodEnum.wechat);
    expect(record?.verifyProvider).toBe(OAuthEnum.wechat);
  });

  it('submits account deletion by oauth and records provider after state validation', async () => {
    const user = await MongoUser.create({
      username: 'git-fastgpt',
      password: '123456'
    });
    const state = await createAccountDeletionOAuthState({
      userId: String(user._id),
      provider: OAuthEnum.github
    });

    await expect(
      consumeAccountDeletionOAuthState({
        state,
        userId: String(user._id),
        provider: OAuthEnum.github
      })
    ).resolves.toBeUndefined();

    await expect(
      consumeAccountDeletionOAuthState({
        state,
        userId: String(user._id),
        provider: OAuthEnum.github
      })
    ).rejects.toBe('Invalid OAuth state');

    await expect(
      submitAccountDeletionByOAuth({
        userId: String(user._id),
        username: 'git-other',
        provider: OAuthEnum.github
      })
    ).rejects.toBe('OAuth account mismatch');

    await expect(
      submitAccountDeletionByOAuth({
        userId: String(user._id),
        username: 'git-fastgpt',
        provider: OAuthEnum.google
      })
    ).rejects.toBe('OAuth provider mismatch');

    const pending = await submitAccountDeletionByOAuth({
      userId: String(user._id),
      username: 'git-fastgpt',
      provider: OAuthEnum.github
    });
    expect(pending.status).toBe(AccountDeletionStatusEnum.pending);

    const record = await MongoAccountDeletion.findOne({ userId: user._id }).lean();
    expect(record?.verifyMethod).toBe(AccountDeletionVerifyMethodEnum.oauth);
    expect(record?.verifyProvider).toBe(OAuthEnum.github);
  });

  it('blocks pending users and owner teams unless explicitly allowed per dimension', async () => {
    const user = await MongoUser.create({
      username: 'blocked@example.com',
      password: '123456'
    });
    const team = await MongoTeam.create({
      name: 'Blocked Team',
      ownerId: user._id
    });
    await MongoTeamMember.create({
      userId: user._id,
      teamId: team._id,
      role: TeamMemberRoleEnum.owner,
      status: 'active'
    });

    await submitAccountDeletion({
      userId: String(user._id),
      verifyMethod: AccountDeletionVerifyMethodEnum.code
    });

    // 默认：两个维度都拦截
    await expect(assertAccountUsable({ userId: String(user._id) })).rejects.toBe(
      UserErrEnum.accountDeletionPending
    );
    await expect(assertAccountUsable({ teamId: String(team._id) })).rejects.toBe(
      TeamErrEnum.accountDeletionPending
    );

    // allowUserAccountDeletionPending 只跳过 userId 检查，teamId 仍应被拦截
    await expect(
      assertAccountUsable({
        userId: String(user._id),
        teamId: String(team._id),
        allowUserAccountDeletionPending: true
      })
    ).rejects.toBe(TeamErrEnum.accountDeletionPending);

    // allowTeamAccountDeletionPending 只跳过 teamId 检查，userId 仍应被拦截
    await expect(
      assertAccountUsable({
        userId: String(user._id),
        teamId: String(team._id),
        allowTeamAccountDeletionPending: true
      })
    ).rejects.toBe(UserErrEnum.accountDeletionPending);

    // 两个 flag 同时开启才能完全跳过
    await expect(
      assertAccountUsable({
        userId: String(user._id),
        teamId: String(team._id),
        allowUserAccountDeletionPending: true,
        allowTeamAccountDeletionPending: true
      })
    ).resolves.toBeUndefined();
  });

  it('allows the current pending owner to access its own pending team when explicitly enabled', async () => {
    const owner = await MongoUser.create({
      username: 'owner-pending@example.com',
      password: '123456'
    });
    const memberUser = await MongoUser.create({
      username: 'member-blocked@example.com',
      password: '123456'
    });
    const team = await MongoTeam.create({
      name: 'Owned Pending Team',
      ownerId: owner._id
    });
    await MongoTeamMember.create({
      userId: owner._id,
      teamId: team._id,
      role: TeamMemberRoleEnum.owner,
      status: 'active'
    });
    await MongoTeamMember.create({
      userId: memberUser._id,
      teamId: team._id,
      role: 'member',
      status: 'active'
    });

    await createPendingDeletionRecord({
      userId: String(owner._id),
      usernameSnapshot: owner.username,
      ownerTeamIds: [String(team._id)]
    });

    await expect(
      assertAccountUsable({
        userId: String(owner._id),
        teamId: String(team._id),
        allowUserAccountDeletionPending: true,
        allowCurrentUserOwnedTeamAccountDeletionPending: true
      })
    ).resolves.toBeUndefined();

    await expect(
      assertAccountUsable({
        userId: String(memberUser._id),
        teamId: String(team._id),
        allowCurrentUserOwnedTeamAccountDeletionPending: true
      })
    ).rejects.toBe(TeamErrEnum.accountDeletionPending);
  });

  it('allows accessing the current pending team only when explicitly using the session-team escape hatch', async () => {
    const owner = await MongoUser.create({
      username: 'owner-session-pending@example.com',
      password: '123456'
    });
    const memberUser = await MongoUser.create({
      username: 'member-session-pending@example.com',
      password: '123456'
    });
    const team = await MongoTeam.create({
      name: 'Session Pending Team',
      ownerId: owner._id
    });
    await MongoTeamMember.create({
      userId: owner._id,
      teamId: team._id,
      role: TeamMemberRoleEnum.owner,
      status: 'active'
    });
    await MongoTeamMember.create({
      userId: memberUser._id,
      teamId: team._id,
      role: 'member',
      status: 'active'
    });

    await createPendingDeletionRecord({
      userId: String(owner._id),
      usernameSnapshot: owner.username,
      ownerTeamIds: [String(team._id)]
    });

    await expect(
      assertAccountUsable({
        userId: String(memberUser._id),
        teamId: String(team._id),
        allowCurrentSessionTeamAccountDeletionPending: true
      })
    ).resolves.toBeUndefined();
  });

  it('blocks pending non-owner users when teamId and tmbId are provided together', async () => {
    const owner = await MongoUser.create({
      username: 'owner@example.com',
      password: '123456'
    });
    const pendingUser = await MongoUser.create({
      username: 'pending-member@example.com',
      password: '123456'
    });
    const team = await MongoTeam.create({
      name: 'Shared Team',
      ownerId: owner._id
    });
    await MongoTeamMember.create({
      userId: owner._id,
      teamId: team._id,
      role: TeamMemberRoleEnum.owner,
      status: 'active'
    });
    const member = await MongoTeamMember.create({
      userId: pendingUser._id,
      teamId: team._id,
      role: 'member',
      status: 'active'
    });

    await createPendingDeletionRecord({
      userId: String(pendingUser._id),
      usernameSnapshot: pendingUser.username
    });

    await expect(
      assertAccountUsable({
        teamId: String(team._id),
        tmbId: String(member._id)
      })
    ).rejects.toBe(UserErrEnum.accountDeletionPending);
  });
});
