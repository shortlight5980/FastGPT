import { NextAPI } from '@/service/middleware/entry';
import {
  SendAccountCancellationCodeBodySchema,
  SendAccountCancellationCodeResponseSchema,
  type SendAccountCancellationCodeResponseType
} from '@fastgpt/global/openapi/support/user/account/cancellation/api';
import { UserAuthTypeEnum } from '@fastgpt/global/support/user/auth/constants';
import { POST } from '@fastgpt/service/common/api/plusRequest';
import { parseApiInput } from '@fastgpt/service/common/zod/requestParseError';
import { authCert } from '@fastgpt/service/support/permission/auth/common';
import type { ApiRequestProps } from '@fastgpt/service/type/next';
import { pickAccountCancellationForwardHeaders } from '@/service/support/user/accountCancellation';
import { getAccountCancellationStatus } from '@fastgpt/service/support/user/accountDeletion';
import { AccountDeletionVerifyMethodEnum } from '@fastgpt/global/support/user/accountDeletion/constants';

async function handler(req: ApiRequestProps): Promise<SendAccountCancellationCodeResponseType> {
  const { userId } = await authCert({
    req,
    authToken: true,
    allowUserAccountDeletionPending: true,
    allowCurrentUserOwnedTeamAccountDeletionPending: true
  });

  const { body } = parseApiInput({
    req,
    bodySchema: SendAccountCancellationCodeBodySchema
  });
  const status = await getAccountCancellationStatus({ userId });
  if (status.status !== 'none' || !status.canRequestCancellation) {
    return Promise.reject('当前账号已在注销流程中');
  }
  if (
    !status.availableVerifyMethods.some((method) => method === AccountDeletionVerifyMethodEnum.code)
  ) {
    return Promise.reject('当前账号不支持验证码注销');
  }
  if (!status.authAccount) {
    return Promise.reject('当前账号不支持验证码注销');
  }

  const result = await POST<SendAccountCancellationCodeResponseType>(
    '/support/user/inform/sendAuthCode',
    {
      ...body,
      type: UserAuthTypeEnum.accountDeletion
    },
    {
      headers: pickAccountCancellationForwardHeaders(req)
    }
  );

  return SendAccountCancellationCodeResponseSchema.parse(result);
}

export default NextAPI(handler);
