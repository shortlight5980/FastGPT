import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as tokenLoginApi from '@/pages/api/support/user/account/tokenLogin';
import { MongoUser } from '@fastgpt/service/support/user/schema';
import { MongoTeam } from '@fastgpt/service/support/user/team/teamSchema';
import { MongoTeamMember } from '@fastgpt/service/support/user/team/teamMemberSchema';
import { UserStatusEnum } from '@fastgpt/global/support/user/constant';
import { pushTrack } from '@fastgpt/service/common/middle/tracks/utils';
import { initTeamFreePlan } from '@fastgpt/service/support/wallet/sub/utils';
import { Call } from '@test/utils/request';
import { MongoAccountDeletion } from '@fastgpt/service/support/user/accountDeletion/schema';
import { AccountDeletionStatusEnum } from '@fastgpt/global/support/user/accountDeletion/constants';

const authCertMock = vi.hoisted(() => vi.fn());
const setCookieMock = vi.hoisted(() => vi.fn());
const createUserSessionMock = vi.hoisted(() => vi.fn());

vi.mock('@fastgpt/service/support/permission/auth/common', () => ({
  authCert: authCertMock,
  setCookie: setCookieMock
}));
vi.mock('@fastgpt/service/support/user/session', () => ({
  createUserSession: createUserSessionMock
}));

describe('tokenLogin API', () => {
  let testUser: any;
  let testTeam: any;
  let testTmb: any;

  beforeEach(async () => {
    testUser = await MongoUser.create({
      username: 'testuser',
      password: 'testpassword',
      status: UserStatusEnum.active
    });
    testTeam = await MongoTeam.create({
      name: 'Test Team',
      ownerId: testUser._id
    });
    await initTeamFreePlan({ teamId: String(testTeam._id) });
    testTmb = await MongoTeamMember.create({
      teamId: testTeam._id,
      userId: testUser._id,
      status: 'active',
      role: 'owner'
    });
    await MongoUser.findByIdAndUpdate(testUser._id, {
      lastLoginTmbId: testTmb._id
    });
    vi.clearAllMocks();
    createUserSessionMock.mockResolvedValue('healed-token');
    authCertMock.mockResolvedValue({
      userId: String(testUser._id),
      teamId: String(testTeam._id),
      tmbId: String(testTmb._id),
      isRoot: false
    });
  });

  it('should return user detail on valid token', async () => {
    const res = await Call(tokenLoginApi.default, {
      auth: {
        userId: String(testUser._id),
        teamId: String(testTeam._id),
        tmbId: String(testTmb._id),
        isRoot: false,
        sessionId: 'session123'
      } as any
    });

    expect(res.code).toBe(200);
    expect(res.data).toBeDefined();
    expect(res.data.team).toBeDefined();
    expect(res.data.team.teamId).toBe(String(testTeam._id));
    expect(res.data.team.tmbId).toBe(String(testTmb._id));
  });

  it('should return owner permissions for root session', async () => {
    const res = await Call(tokenLoginApi.default, {
      auth: {
        userId: String(testUser._id),
        teamId: String(testTeam._id),
        tmbId: String(testTmb._id),
        isRoot: true,
        sessionId: 'session123'
      } as any
    });

    expect(res.code).toBe(200);
    expect(res.data.permission.isOwner).toBe(true);
    expect(res.data.permission.hasAppCreatePer).toBe(true);
    expect(res.data.permission.hasSkillCreatePer).toBe(true);
    expect(res.data.team.permission.isOwner).toBe(true);
    expect(res.data.team.permission.hasAppCreatePer).toBe(true);
    expect(res.data.team.permission.hasSkillCreatePer).toBe(true);
  });

  it('should call pushTrack.dailyUserActive', async () => {
    await Call(tokenLoginApi.default, {
      auth: {
        userId: String(testUser._id),
        teamId: String(testTeam._id),
        tmbId: String(testTmb._id),
        isRoot: false,
        sessionId: 'session123'
      } as any
    });

    expect(pushTrack.dailyUserActive).toHaveBeenCalledWith({
      uid: String(testUser._id),
      teamId: String(testTeam._id),
      tmbId: String(testTmb._id)
    });
  });

  it('should mask openaiAccount key but keep baseUrl', async () => {
    await MongoTeamMember.findByIdAndUpdate(testTmb._id, {
      openaiAccount: { key: 'sk-secret-key', baseUrl: 'https://api.openai.com' }
    });

    const res = await Call(tokenLoginApi.default, {
      auth: {
        userId: String(testUser._id),
        teamId: String(testTeam._id),
        tmbId: String(testTmb._id),
        isRoot: false,
        sessionId: 'session123'
      } as any
    });

    expect(res.code).toBe(200);
    if (res.data.team.openaiAccount) {
      expect(res.data.team.openaiAccount.key).toBe('');
      expect(res.data.team.openaiAccount.baseUrl).toBe('https://api.openai.com');
    }
  });

  it('should mask all values in externalWorkflowVariables', async () => {
    await MongoTeamMember.findByIdAndUpdate(testTmb._id, {
      externalWorkflowVariables: { SECRET: 'top-secret', API_KEY: 'sk-123' }
    });

    const res = await Call(tokenLoginApi.default, {
      auth: {
        userId: String(testUser._id),
        teamId: String(testTeam._id),
        tmbId: String(testTmb._id),
        isRoot: false,
        sessionId: 'session123'
      } as any
    });

    expect(res.code).toBe(200);
    if (res.data.team.externalWorkflowVariables) {
      Object.values(res.data.team.externalWorkflowVariables).forEach((val) => {
        expect(val).toBe('');
      });
    }
  });

  it('should reject request without authentication', async () => {
    authCertMock.mockRejectedValueOnce(new Error('unAuthorization'));

    const res = await Call(tokenLoginApi.default, {});

    expect(res.code).toBe(500);
  });

  it('passes account-deletion allow flags to authCert', async () => {
    await Call(tokenLoginApi.default, {
      auth: {
        userId: String(testUser._id),
        teamId: String(testTeam._id),
        tmbId: String(testTmb._id),
        isRoot: false,
        sessionId: 'session123'
      } as any
    });

    expect(authCertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        authToken: true,
        allowUserAccountDeletionPending: true,
        allowCurrentUserOwnedTeamAccountDeletionPending: true,
        allowCurrentSessionTeamAccountDeletionPending: true
      })
    );
  });

  it('returns current team account deletion state for non-owner members of an owner-pending team', async () => {
    const owner = await MongoUser.create({
      username: 'owner-pending-token@example.com',
      password: 'testpassword',
      status: UserStatusEnum.active
    });
    const team = await MongoTeam.create({
      name: 'Owner Pending Team',
      ownerId: owner._id
    });
    const ownerTmb = await MongoTeamMember.create({
      teamId: team._id,
      userId: owner._id,
      status: 'active',
      role: 'owner'
    });
    const member = await MongoUser.create({
      username: 'member-pending-token@example.com',
      password: 'testpassword',
      status: UserStatusEnum.active,
      lastLoginTmbId: testTmb._id
    });
    const memberTmb = await MongoTeamMember.create({
      teamId: team._id,
      userId: member._id,
      status: 'active',
      role: 'member'
    });
    await MongoAccountDeletion.create({
      userId: owner._id,
      usernameSnapshot: owner.username,
      status: AccountDeletionStatusEnum.pending,
      requestedAt: new Date('2026-06-01T00:00:00.000Z'),
      scheduledDeleteAt: new Date('2026-06-16T00:00:00.000Z'),
      ownerTeamIds: [team._id]
    });

    authCertMock.mockResolvedValueOnce({
      userId: String(member._id),
      teamId: String(team._id),
      tmbId: String(memberTmb._id),
      isRoot: false
    });

    const res = await Call(tokenLoginApi.default, {
      auth: {
        userId: String(member._id),
        teamId: String(team._id),
        tmbId: String(memberTmb._id),
        isRoot: false,
        sessionId: 'session456'
      } as any
    });

    expect(res.code).toBe(200);
    expect(res.data.teamAccountDeletion).toMatchObject({
      status: AccountDeletionStatusEnum.pending,
      ownerUserId: String(owner._id),
      requestedAt: new Date('2026-06-01T00:00:00.000Z'),
      scheduledDeleteAt: new Date('2026-06-16T00:00:00.000Z')
    });
    expect(res.data.accountDeletion).toBeUndefined();
    expect(ownerTmb).toBeTruthy();
  });

  it('heals stale team sessions to another active membership and refreshes cookie', async () => {
    const fallbackTeam = await MongoTeam.create({
      name: 'Fallback Team',
      ownerId: testUser._id
    });
    await initTeamFreePlan({ teamId: String(fallbackTeam._id) });
    const fallbackTmb = await MongoTeamMember.create({
      teamId: fallbackTeam._id,
      userId: testUser._id,
      status: 'active',
      role: 'owner'
    });

    await MongoTeamMember.deleteOne({ _id: testTmb._id });
    authCertMock.mockResolvedValueOnce({
      userId: String(testUser._id),
      teamId: String(testTeam._id),
      tmbId: String(testTmb._id),
      isRoot: false
    });

    const res = await Call(tokenLoginApi.default, {
      auth: {
        userId: String(testUser._id),
        teamId: String(testTeam._id),
        tmbId: String(testTmb._id),
        isRoot: false,
        sessionId: 'session-stale'
      } as any
    });

    expect(res.code).toBe(200);
    expect(res.data.team.teamId).toBe(String(fallbackTeam._id));
    expect(res.data.team.tmbId).toBe(String(fallbackTmb._id));
    expect(createUserSessionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: String(testUser._id),
        teamId: String(fallbackTeam._id),
        tmbId: String(fallbackTmb._id)
      })
    );
    expect(setCookieMock).toHaveBeenCalledWith(expect.anything(), 'healed-token');

    const updatedUser = await MongoUser.findById(testUser._id).lean();
    expect(String(updatedUser?.lastLoginTmbId)).toBe(String(fallbackTmb._id));
  });
});
