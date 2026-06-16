import { NextAPI } from '@/service/middleware/entry';
import {
  AccountCancellationStatusResponseSchema,
  type AccountCancellationStatusResponseType
} from '@fastgpt/global/openapi/support/user/account/cancellation/api';
import { authCert } from '@fastgpt/service/support/permission/auth/common';
import { getAccountCancellationStatus } from '@fastgpt/service/support/user/accountDeletion';
import type { ApiRequestProps, ApiResponseType } from '@fastgpt/service/type/next';

async function handler(
  req: ApiRequestProps,
  _res: ApiResponseType
): Promise<AccountCancellationStatusResponseType> {
  const { userId } = await authCert({
    req,
    authToken: true,
    allowUserAccountDeletionPending: true,
    allowCurrentUserOwnedTeamAccountDeletionPending: true
  });

  return AccountCancellationStatusResponseSchema.parse(
    await getAccountCancellationStatus({ userId })
  );
}

export default NextAPI(handler);
