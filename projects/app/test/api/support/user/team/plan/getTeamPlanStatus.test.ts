import { beforeEach, describe, expect, it, vi } from 'vitest';
import handler from '@/pages/api/support/user/team/plan/getTeamPlanStatus';
import { Call } from '@test/utils/request';
import { getUser } from '@test/datas/users';
import { MongoAccountDeletion } from '@fastgpt/service/support/user/accountDeletion/schema';
import { AccountDeletionStatusEnum } from '@fastgpt/global/support/user/accountDeletion/constants';
import { MongoTeamMember } from '@fastgpt/service/support/user/team/teamMemberSchema';

const authCertMock = vi.hoisted(() => vi.fn());
const getTeamPlanStatusMock = vi.hoisted(() => vi.fn());
const getVectorCountByTeamIdMock = vi.hoisted(() => vi.fn());

vi.mock('@fastgpt/service/support/permission/auth/common', () => ({
  authCert: authCertMock
}));

vi.mock('@fastgpt/service/support/wallet/sub/utils', () => ({
  getTeamPlanStatus: getTeamPlanStatusMock
}));

vi.mock('@fastgpt/service/common/vectorDB/controller', () => ({
  getVectorCountByTeamId: getVectorCountByTeamIdMock
}));

describe('api/support/user/team/plan/getTeamPlanStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authCertMock.mockResolvedValue({
      teamId: 'team-1'
    });
    getTeamPlanStatusMock.mockResolvedValue({
      plan: 'free'
    });
    getVectorCountByTeamIdMock.mockResolvedValue(0);
  });

  it('passes pending escape auth flags for owner and current-session team members', async () => {
    const res = await Call(handler, {
      auth: {
        userId: 'user-1',
        teamId: 'team-1',
        tmbId: 'tmb-1',
        isRoot: false,
        sessionId: 'session-1'
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
    expect(res.code).toBe(200);
  });

  it('allows owner-pending self and current-session team members to reach the handler path', async () => {
    const owner = await getUser('plan-owner-pending@example.com');
    const member = await getUser('plan-member-pending@example.com', owner.teamId);
    const availableOwner = await getUser('plan-available-owner@example.com');

    await MongoTeamMember.create({
      userId: member.userId,
      teamId: availableOwner.teamId,
      name: 'member',
      status: 'active'
    });

    await MongoAccountDeletion.create({
      userId: owner.userId,
      usernameSnapshot: 'plan-owner-pending@example.com',
      status: AccountDeletionStatusEnum.pending,
      requestedAt: new Date('2026-06-01T00:00:00.000Z'),
      scheduledDeleteAt: new Date('2026-06-16T00:00:00.000Z'),
      ownerTeamIds: [owner.teamId]
    });

    authCertMock.mockResolvedValueOnce({
      teamId: owner.teamId
    });
    const ownerRes = await Call(handler, {
      auth: {
        userId: owner.userId,
        teamId: owner.teamId,
        tmbId: owner.tmbId,
        isRoot: false,
        sessionId: 'owner-session'
      } as any
    });
    expect(ownerRes.code).toBe(200);

    authCertMock.mockResolvedValueOnce({
      teamId: owner.teamId
    });
    const memberRes = await Call(handler, {
      auth: {
        userId: member.userId,
        teamId: owner.teamId,
        tmbId: member.tmbId,
        isRoot: false,
        sessionId: 'member-session'
      } as any
    });
    expect(memberRes.code).toBe(200);
  });
});
