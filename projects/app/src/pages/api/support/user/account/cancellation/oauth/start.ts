import { NextAPI } from '@/service/middleware/entry';
import {
  buildAccountCancellationOAuthUrl,
  getAccountCancellationCallbackUrl
} from '@/service/support/user/accountCancellation';
import {
  StartAccountCancellationOAuthBodySchema,
  StartAccountCancellationOAuthResponseSchema,
  type StartAccountCancellationOAuthResponseType
} from '@fastgpt/global/openapi/support/user/account/cancellation/api';
import { OAuthEnum } from '@fastgpt/global/support/user/constant';
import { POST } from '@fastgpt/service/common/api/plusRequest';
import { parseApiInput } from '@fastgpt/service/common/zod/requestParseError';
import { authCert } from '@fastgpt/service/support/permission/auth/common';
import {
  createAccountDeletionOAuthState,
  getAccountCancellationStatus
} from '@fastgpt/service/support/user/accountDeletion';
import type { ApiRequestProps, ApiResponseType } from '@fastgpt/service/type/next';

async function handler(
  req: ApiRequestProps,
  _res: ApiResponseType
): Promise<StartAccountCancellationOAuthResponseType> {
  const { userId } = await authCert({
    req,
    authToken: true,
    allowUserAccountDeletionPending: true,
    allowCurrentUserOwnedTeamAccountDeletionPending: true
  });
  const { provider } = parseApiInput({
    req,
    bodySchema: StartAccountCancellationOAuthBodySchema
  }).body;
  const status = await getAccountCancellationStatus({ userId });
  if (status.oauthProvider !== provider) {
    return Promise.reject('OAuth provider mismatch');
  }

  const state = await createAccountDeletionOAuthState({
    userId,
    provider
  });
  const callbackUrl = getAccountCancellationCallbackUrl(req);
  const url =
    (await buildAccountCancellationOAuthUrl({
      provider,
      state,
      callbackUrl
    })) ||
    (await (async () => {
      if (provider === OAuthEnum.sso) {
        return POST<string>('/support/user/account/login/getAuthURL', {
          redirectUri: callbackUrl,
          isWecomWorkTerminal: false,
          state
        });
      }
      if (provider === OAuthEnum.wecom) {
        return POST<string>('/support/user/account/login/wecom/getRedirectUrl', {
          redirectUri: callbackUrl,
          isWecomWorkTerminal: false,
          state
        });
      }
      return Promise.reject('Unsupported OAuth provider');
    })());

  return StartAccountCancellationOAuthResponseSchema.parse({
    url,
    state
  });
}

export default NextAPI(handler);
