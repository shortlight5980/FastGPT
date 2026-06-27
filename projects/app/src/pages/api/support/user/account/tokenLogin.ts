import type { NextApiResponse } from 'next';
import { authCert, setCookie } from '@fastgpt/service/support/permission/auth/common';
import { getUserDetail } from '@fastgpt/service/support/user/controller';
import type { ApiRequestProps } from '@fastgpt/service/type/next';
import { NextAPI } from '@/service/middleware/entry';
import { pushTrack } from '@fastgpt/service/common/middle/tracks/utils';
import type { UserType } from '@fastgpt/global/support/user/type';
import { createUserSession } from '@fastgpt/service/support/user/session';
import { getClientIpFromRequest } from '@fastgpt/service/common/security/clientIp';
import { MongoUser } from '@fastgpt/service/support/user/schema';

async function handler(req: ApiRequestProps, res: NextApiResponse): Promise<UserType> {
  const { tmbId, userId, teamId, isRoot } = await authCert({
    req,
    authToken: true,
    allowUserAccountDeletionPending: true,
    allowCurrentUserOwnedTeamAccountDeletionPending: true,
    allowCurrentSessionTeamAccountDeletionPending: true
  });
  const user = await getUserDetail({ tmbId, userId, isRoot });

  if (user.team.tmbId !== tmbId || user.team.teamId !== teamId) {
    await MongoUser.findByIdAndUpdate(userId, {
      lastLoginTmbId: user.team.tmbId
    });
    const token = await createUserSession({
      userId,
      teamId: user.team.teamId,
      tmbId: user.team.tmbId,
      isRoot,
      ip: getClientIpFromRequest(req)
    });
    setCookie(res, token);
  }

  pushTrack.dailyUserActive({
    uid: userId,
    teamId: user.team.teamId,
    tmbId: user.team.tmbId
  });

  // Remove sensitive information
  if (user.team.openaiAccount) {
    user.team.openaiAccount = {
      key: '',
      baseUrl: user.team.openaiAccount.baseUrl
    };
  }
  if (user.team.externalWorkflowVariables) {
    user.team.externalWorkflowVariables = Object.fromEntries(
      Object.keys(user.team.externalWorkflowVariables).map((key) => [key, ''])
    );
  }

  return user;
}
export default NextAPI(handler);
