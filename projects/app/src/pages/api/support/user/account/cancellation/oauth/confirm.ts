import { NextAPI } from '@/service/middleware/entry';
import { pickAccountCancellationForwardHeaders } from '@/service/support/user/accountCancellation';
import {
  AccountCancellationPendingResponseSchema,
  ConfirmAccountCancellationOAuthBodySchema,
  type AccountCancellationPendingResponseType
} from '@fastgpt/global/openapi/support/user/account/cancellation/api';
import { POST } from '@fastgpt/service/common/api/plusRequest';
import { parseApiInput } from '@fastgpt/service/common/zod/requestParseError';
import { authCert } from '@fastgpt/service/support/permission/auth/common';
import type { ApiRequestProps, ApiResponseType } from '@fastgpt/service/type/next';

async function handler(
  req: ApiRequestProps,
  _res: ApiResponseType
): Promise<AccountCancellationPendingResponseType> {
  await authCert({
    req,
    authToken: true,
    allowUserAccountDeletionPending: true,
    allowCurrentUserOwnedTeamAccountDeletionPending: true
  });

  const { body } = parseApiInput({
    req,
    bodySchema: ConfirmAccountCancellationOAuthBodySchema
  });

  return AccountCancellationPendingResponseSchema.parse(
    await POST<AccountCancellationPendingResponseType>(
      '/support/user/account/cancellation/oauth/confirm',
      body,
      {
        headers: pickAccountCancellationForwardHeaders(req)
      }
    )
  );
}

export default NextAPI(handler);
