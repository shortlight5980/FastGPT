import { describe, expect, it } from 'vitest';
import { TeamPermission } from '@fastgpt/global/support/permission/user/controller';
import { UserTeamListResponseSchema } from '@fastgpt/global/openapi/support/user/team/api';

describe('UserTeamListResponseSchema', () => {
  it('accepts deprecated member role values from historical team member records', () => {
    const result = UserTeamListResponseSchema.parse([
      {
        userId: 'user-id',
        teamId: 'team-id',
        teamName: 'Team',
        memberName: 'Member',
        avatar: '',
        tmbId: 'tmb-id',
        role: 'member',
        status: 'active',
        permission: new TeamPermission({})
      }
    ]);

    expect(result[0].role).toBe('member');
  });
});
