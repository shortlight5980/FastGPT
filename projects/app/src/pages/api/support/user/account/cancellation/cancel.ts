import { NextAPI } from '@/service/middleware/entry';
import {
  CancelAccountCancellationResponseSchema,
  type CancelAccountCancellationResponseType
} from '@fastgpt/global/openapi/support/user/account/cancellation/api';
import { authCert } from '@fastgpt/service/support/permission/auth/common';
import { cancelAccountDeletion } from '@fastgpt/service/support/user/accountDeletion';
import type { ApiRequestProps, ApiResponseType } from '@fastgpt/service/type/next';

async function handler(
  req: ApiRequestProps,
  _res: ApiResponseType
): Promise<CancelAccountCancellationResponseType> {
  const { userId } = await authCert({
    req,
    authToken: true,
    allowUserAccountDeletionPending: true,
    allowCurrentUserOwnedTeamAccountDeletionPending: true
  });

  return CancelAccountCancellationResponseSchema.parse(await cancelAccountDeletion({ userId }));
}

export default NextAPI(handler);
