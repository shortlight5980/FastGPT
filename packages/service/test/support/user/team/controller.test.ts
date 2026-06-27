import { beforeEach, describe, expect, it } from 'vitest';
import { MongoUser } from '../../../../support/user/schema';
import { MongoTeam } from '../../../../support/user/team/teamSchema';
import { MongoTeamMember } from '../../../../support/user/team/teamMemberSchema';
import { getUserDefaultTeam } from '../../../../support/user/team/controller';
import { TeamMemberRoleEnum } from '@fastgpt/global/support/user/team/constant';
import { Types } from 'mongoose';

describe('team controller', () => {
  beforeEach(() => {
    global.feConfigs = {
      ...(global.feConfigs || {})
    } as any;
  });

  it('normalizes null notificationAccount from legacy team records', async () => {
    const user = await MongoUser.create({
      username: 'legacy-team-user@example.com',
      password: '123456'
    });
    const team = await MongoTeam.create({
      name: 'Legacy Team',
      ownerId: user._id,
      notificationAccount: null
    });
    await MongoTeamMember.create({
      userId: user._id,
      teamId: team._id,
      role: TeamMemberRoleEnum.owner,
      status: 'active',
      name: 'Owner'
    });

    const result = await getUserDefaultTeam({ userId: String(user._id) });

    expect(result.notificationAccount).toBeUndefined();
  });

  it('skips dangling team memberships when resolving user default team', async () => {
    const user = await MongoUser.create({
      username: 'fallback-team-user@example.com',
      password: '123456'
    });
    await MongoTeamMember.create({
      userId: user._id,
      teamId: new Types.ObjectId(),
      role: TeamMemberRoleEnum.owner,
      status: 'active',
      name: 'Dangling Owner'
    });
    const validTeam = await MongoTeam.create({
      name: 'Valid Team',
      ownerId: user._id
    });
    const validMember = await MongoTeamMember.create({
      userId: user._id,
      teamId: validTeam._id,
      role: TeamMemberRoleEnum.owner,
      status: 'active',
      name: 'Valid Owner'
    });

    const result = await getUserDefaultTeam({ userId: String(user._id) });

    expect(result.teamId).toBe(String(validTeam._id));
    expect(result.tmbId).toBe(String(validMember._id));
  });
});
