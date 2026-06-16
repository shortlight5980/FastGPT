import { NextAPI } from '@/service/middleware/entry';
import { pickAccountCancellationForwardHeaders } from '@/service/support/user/accountCancellation';
import {
  CheckAccountCancellationWechatBodySchema,
  CheckAccountCancellationWechatResponseSchema,
  type CheckAccountCancellationWechatResponseType
} from '@fastgpt/global/openapi/support/user/account/cancellation/api';
import { POST } from '@fastgpt/service/common/api/plusRequest';
import { parseApiInput } from '@fastgpt/service/common/zod/requestParseError';
import { authCert } from '@fastgpt/service/support/permission/auth/common';
import { AccountDeletionVerifyMethodEnum } from '@fastgpt/global/support/user/accountDeletion/constants';
import { getAccountCancellationStatus } from '@fastgpt/service/support/user/accountDeletion';
import type { ApiRequestProps, ApiResponseType } from '@fastgpt/service/type/next';

async function handler(
  req: ApiRequestProps,
  _res: ApiResponseType
): Promise<CheckAccountCancellationWechatResponseType> {
  const { userId } = await authCert({
    req,
    authToken: true,
    allowUserAccountDeletionPending: true,
    allowCurrentUserOwnedTeamAccountDeletionPending: true
  });

  const { body } = parseApiInput({
    req,
    bodySchema: CheckAccountCancellationWechatBodySchema
  });
  const status = await getAccountCancellationStatus({ userId });
  if (
    !status.availableVerifyMethods.some(
      (method) => method === AccountDeletionVerifyMethodEnum.wechat
    )
  ) {
    return Promise.reject('当前账号不支持微信注销');
  }

  return CheckAccountCancellationWechatResponseSchema.parse(
    await POST<CheckAccountCancellationWechatResponseType>(
      '/support/user/account/cancellation/wechat/check',
      body,
      {
        headers: pickAccountCancellationForwardHeaders(req)
      }
    )
  );
}

export default NextAPI(handler);
