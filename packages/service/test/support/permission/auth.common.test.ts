import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Types } from 'mongoose';
import { createUserSession } from '@fastgpt/service/support/user/session';
import { MongoAccountDeletion } from '@fastgpt/service/support/user/accountDeletion/schema';
import { assertAccountUsable } from '@fastgpt/service/support/user/accountDeletion/check';
import { AccountDeletionStatusEnum } from '@fastgpt/global/support/user/accountDeletion/constants';
import { TeamErrEnum } from '@fastgpt/global/common/error/code/team';
import { UserErrEnum } from '@fastgpt/global/common/error/code/user';
import { getUser } from '@test/datas/users';
import { MongoTeamMember } from '@fastgpt/service/support/user/team/teamMemberSchema';

vi.unmock('@fastgpt/service/support/permission/auth/common');

const { parseHeaderCert } = await import('@fastgpt/service/support/permission/auth/common');

describe('permission auth common', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('allows escaping from the current pending team while still blocking switching into another pending team', async () => {
    const pendingOwner = await getUser('auth-pending-owner@example.com');
    const member = await getUser('auth-pending-member@example.com', pendingOwner.teamId);
    const availableOwner = await getUser('auth-available-owner@example.com');
    const targetPendingOwner = await getUser('auth-target-pending-owner@example.com');

    await MongoTeamMember.create({
      userId: member.userId,
      teamId: availableOwner.teamId,
      name: 'member',
      status: 'active'
    });
    const targetPendingMembership = await MongoTeamMember.create({
      userId: member.userId,
      teamId: targetPendingOwner.teamId,
      name: 'member',
      status: 'active'
    });

    await MongoAccountDeletion.create({
      _id: new Types.ObjectId(),
      userId: pendingOwner.userId,
      usernameSnapshot: 'auth-pending-owner@example.com',
      status: AccountDeletionStatusEnum.pending,
      requestedAt: new Date('2026-06-01T00:00:00.000Z'),
      scheduledDeleteAt: new Date('2026-06-16T00:00:00.000Z'),
      ownerTeamIds: [pendingOwner.teamId]
    });
    await MongoAccountDeletion.create({
      _id: new Types.ObjectId(),
      userId: targetPendingOwner.userId,
      usernameSnapshot: 'auth-target-pending-owner@example.com',
      status: AccountDeletionStatusEnum.pending,
      requestedAt: new Date('2026-06-02T00:00:00.000Z'),
      scheduledDeleteAt: new Date('2026-06-17T00:00:00.000Z'),
      ownerTeamIds: [targetPendingOwner.teamId]
    });

    const sessionToken = await createUserSession({
      userId: member.userId,
      teamId: pendingOwner.teamId,
      tmbId: member.tmbId,
      ip: '127.0.0.1'
    });

    await expect(
      parseHeaderCert({
        req: {
          headers: {
            token: sessionToken
          }
        } as any,
        authToken: true,
        allowUserAccountDeletionPending: true,
        allowCurrentSessionTeamAccountDeletionPending: true
      })
    ).resolves.toMatchObject({
      userId: member.userId,
      teamId: pendingOwner.teamId,
      tmbId: member.tmbId,
      sessionId: sessionToken
    });

    await expect(
      parseHeaderCert({
        req: {
          headers: {
            token: sessionToken
          }
        } as any,
        authToken: true,
        allowUserAccountDeletionPending: true
      })
    ).rejects.toBe(TeamErrEnum.accountDeletionPending);

    await expect(
      assertAccountUsable({
        userId: member.userId,
        teamId: targetPendingOwner.teamId,
        tmbId: String(targetPendingMembership._id)
      })
    ).rejects.toBe(TeamErrEnum.accountDeletionPending);
  });

  it('allows owner-pending self only when both user-pending and owner-team escape flags are enabled', async () => {
    const owner = await getUser('auth-self-pending-owner@example.com');

    await MongoAccountDeletion.create({
      _id: new Types.ObjectId(),
      userId: owner.userId,
      usernameSnapshot: 'auth-self-pending-owner@example.com',
      status: AccountDeletionStatusEnum.pending,
      requestedAt: new Date('2026-06-01T00:00:00.000Z'),
      scheduledDeleteAt: new Date('2026-06-16T00:00:00.000Z'),
      ownerTeamIds: [owner.teamId]
    });

    const sessionToken = await createUserSession({
      userId: owner.userId,
      teamId: owner.teamId,
      tmbId: owner.tmbId,
      ip: '127.0.0.1'
    });

    await expect(
      parseHeaderCert({
        req: {
          headers: {
            token: sessionToken
          }
        } as any,
        authToken: true,
        allowCurrentUserOwnedTeamAccountDeletionPending: true
      })
    ).rejects.toBe(UserErrEnum.accountDeletionPending);

    await expect(
      parseHeaderCert({
        req: {
          headers: {
            token: sessionToken
          }
        } as any,
        authToken: true,
        allowUserAccountDeletionPending: true,
        allowCurrentUserOwnedTeamAccountDeletionPending: true
      })
    ).resolves.toMatchObject({
      userId: owner.userId,
      teamId: owner.teamId,
      tmbId: owner.tmbId,
      sessionId: sessionToken
    });
  });
});
