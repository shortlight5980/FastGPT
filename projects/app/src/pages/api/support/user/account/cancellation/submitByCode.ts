import { NextAPI } from '@/service/middleware/entry';
import {
  AccountCancellationPendingResponseSchema,
  SubmitAccountCancellationByCodeBodySchema,
  type AccountCancellationPendingResponseType
} from '@fastgpt/global/openapi/support/user/account/cancellation/api';
import { parseApiInput } from '@fastgpt/service/common/zod/requestParseError';
import { authCert } from '@fastgpt/service/support/permission/auth/common';
import { submitAccountDeletionByCode } from '@fastgpt/service/support/user/accountDeletion';
import type { ApiRequestProps, ApiResponseType } from '@fastgpt/service/type/next';

async function handler(
  req: ApiRequestProps,
  _res: ApiResponseType
): Promise<AccountCancellationPendingResponseType> {
  const { userId } = await authCert({
    req,
    authToken: true,
    allowUserAccountDeletionPending: true,
    allowCurrentUserOwnedTeamAccountDeletionPending: true
  });
  const { code } = parseApiInput({
    req,
    bodySchema: SubmitAccountCancellationByCodeBodySchema
  }).body;

  return AccountCancellationPendingResponseSchema.parse(
    await submitAccountDeletionByCode({ userId, code })
  );
}

export default NextAPI(handler);
