import React, { useCallback, useMemo, useState } from 'react';
import AuthPageShell from '@/pageComponents/login/AuthPageShell';
import CancelPendingPanel from './CancelPendingPanel';
import { useQuery } from '@tanstack/react-query';
import {
  cancelAccountCancellation,
  checkAccountCancellationWechat,
  getAccountCancellationStatus,
  getAccountCancellationWechatQR,
  sendAccountCancellationCode,
  startAccountCancellationOAuth,
  submitAccountCancellationByCode
} from '@/web/support/user/api';
import { useRequest } from '@fastgpt/web/hooks/useRequest';
import { useToast } from '@fastgpt/web/hooks/useToast';
import type {
  AccountCancellationActiveResponseType,
  AccountCancellationPendingResponseType,
  AccountCancellationStatusResponseType
} from '@fastgpt/global/openapi/support/user/account/cancellation/api';
import { AccountDeletionStatusEnum } from '@fastgpt/global/support/user/accountDeletion/constants';
import { useUserStore } from '@/web/support/user/useUserStore';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import {
  AccountSecurityInlineAlert,
  type AccountSecurityStatus
} from '@/components/support/user/safe/accountSecurity';
import { useSystemStore } from '@/web/common/system/useSystemStore';
import type { OAuthEnum } from '@fastgpt/global/support/user/constant';
import AccountCancellationVerifyPanel from './AccountCancellationVerifyPanel';

const isActiveCancellationStatus = (
  status: AccountCancellationStatusResponseType['status']
): status is AccountCancellationActiveResponseType['status'] =>
  [AccountDeletionStatusEnum.pending, AccountDeletionStatusEnum.finalizing].includes(
    status as AccountDeletionStatusEnum
  );

const CancelAccountPage = () => {
  const router = useRouter();
  const { t } = useTranslation();
  const { toast } = useToast();
  const { userInfo, setUserInfo, initUserInfo } = useUserStore();
  const { setLoginStore } = useSystemStore();
  const [inlineError, setInlineError] = useState('');
  const [pendingData, setPendingData] = useState<AccountCancellationActiveResponseType>();

  const { data, isLoading, refetch } = useQuery(
    ['accountCancellationStatus'],
    getAccountCancellationStatus,
    {
      onSuccess(data: AccountCancellationStatusResponseType) {
        if (isActiveCancellationStatus(data.status) && data.requestedAt && data.scheduledDeleteAt) {
          setPendingData({
            status: data.status,
            requestedAt: data.requestedAt,
            scheduledDeleteAt: data.scheduledDeleteAt
          });
        }
      },
      onError() {
        setInlineError(t('account_info:account_cancellation_status_error'));
      }
    }
  );

  const { runAsync: onCancel, loading: canceling } = useRequest(
    async () => {
      await cancelAccountCancellation();
      await initUserInfo();
      setPendingData(undefined);
      await refetch();
      router.replace('/account/info');
    },
    {
      successToast: t('account_info:account_cancellation_cancel_success'),
      onError() {
        setInlineError(t('account_info:account_cancellation_cancel_error'));
      }
    }
  );

  const handleSubmitted = useCallback(
    (pending: AccountCancellationPendingResponseType) => {
      toast({
        status: 'success',
        title: t('account_info:account_cancellation_verify_success')
      });
      setInlineError('');
      setPendingData(pending);
      setUserInfo(null);
      router.replace('/login?lastRoute=/account/cancel');
    },
    [router, setUserInfo, t, toast]
  );

  const handleVerifyError = useCallback(
    (message: string) => {
      const title = message || t('account_info:account_cancellation_verify_error');
      setInlineError('');
      toast({
        status: 'warning',
        title
      });
    },
    [t, toast]
  );

  const accountSecurityStatus = useMemo<AccountSecurityStatus>(() => {
    if (!data) {
      return {
        canVerify: false,
        availableVerifyMethods: [],
        maskedAccount: userInfo?.username || ''
      };
    }

    return {
      canVerify: data.canRequestCancellation,
      availableVerifyMethods: data.availableVerifyMethods,
      oauthProvider: data.oauthProvider,
      maskedAccount: data.maskedAccount || userInfo?.username || '',
      authAccount: data.authAccount
    };
  }, [data, userInfo?.username]);

  return (
    <AuthPageShell showBack={!pendingData}>
      <AccountSecurityInlineAlert text={inlineError} />
      {pendingData ? (
        <CancelPendingPanel data={pendingData} onCancel={onCancel} loading={canceling} />
      ) : (
        <AccountCancellationVerifyPanel<AccountCancellationPendingResponseType>
          status={accountSecurityStatus}
          loading={isLoading}
          code={{
            onSendCode: sendAccountCancellationCode,
            onSubmitCode: submitAccountCancellationByCode
          }}
          wechat={{
            getQRCode: getAccountCancellationWechatQR,
            checkQRCode: checkAccountCancellationWechat
          }}
          oauth={{
            onStartOAuth: ({ provider }) =>
              startAccountCancellationOAuth({
                provider: provider as OAuthEnum
              }),
            onOAuthStarted: ({ provider, state }) => {
              setLoginStore({
                provider: provider as OAuthEnum,
                lastRoute: '/account/cancel',
                state,
                authType: 'accountCancellation'
              });
            }
          }}
          onSubmitted={handleSubmitted}
          onError={handleVerifyError}
          onCancel={() => router.replace('/account/info')}
        />
      )}
    </AuthPageShell>
  );
};

export default CancelAccountPage;
