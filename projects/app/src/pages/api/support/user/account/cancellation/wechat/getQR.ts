import { NextAPI } from '@/service/middleware/entry';
import {
  GetAccountCancellationWechatQRResponseSchema,
  type GetAccountCancellationWechatQRResponseType
} from '@fastgpt/global/openapi/support/user/account/cancellation/api';
import { GET } from '@fastgpt/service/common/api/plusRequest';
import { authCert } from '@fastgpt/service/support/permission/auth/common';
import { AccountDeletionVerifyMethodEnum } from '@fastgpt/global/support/user/accountDeletion/constants';
import { getAccountCancellationStatus } from '@fastgpt/service/support/user/accountDeletion';
import type { ApiRequestProps, ApiResponseType } from '@fastgpt/service/type/next';

async function handler(
  req: ApiRequestProps,
  _res: ApiResponseType
): Promise<GetAccountCancellationWechatQRResponseType> {
  const { userId } = await authCert({
    req,
    authToken: true,
    allowUserAccountDeletionPending: true,
    allowCurrentUserOwnedTeamAccountDeletionPending: true
  });
  const status = await getAccountCancellationStatus({ userId });
  if (
    !status.availableVerifyMethods.some(
      (method) => method === AccountDeletionVerifyMethodEnum.wechat
    )
  ) {
    return Promise.reject('当前账号不支持微信注销');
  }

  return GetAccountCancellationWechatQRResponseSchema.parse(
    await GET<GetAccountCancellationWechatQRResponseType>('/support/user/account/login/wx/getQR')
  );
}

export default NextAPI(handler);
