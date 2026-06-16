import React, { useMemo } from 'react';
import { Box, Button, Center } from '@chakra-ui/react';
import { useTranslation } from 'next-i18next';
import Loading from '@fastgpt/web/components/common/MyLoading';
import {
  AccountSecurityCodeForm,
  AccountSecurityOAuthButton,
  AccountSecurityVerifyMethodEnum,
  AccountSecurityWechatPanel,
  type AccountSecurityCodeHandlers,
  type AccountSecurityOAuthHandlers,
  type AccountSecurityStatus,
  type AccountSecurityVerifyMethod,
  type AccountSecurityWechatHandlers
} from '@/components/support/user/safe/accountSecurity';

const accountCancellationVerifyMethodOrder = [
  AccountSecurityVerifyMethodEnum.code,
  AccountSecurityVerifyMethodEnum.wechat,
  AccountSecurityVerifyMethodEnum.oauth
] as const;

type AccountCancellationVerifyPanelProps<TSubmitResult = unknown> = {
  status?: AccountSecurityStatus;
  loading?: boolean;
  width?: string | number;
  showTitle?: boolean;
  selectedVerifyMethod?: AccountSecurityVerifyMethod;
  code?: AccountSecurityCodeHandlers<TSubmitResult>;
  oauth?: AccountSecurityOAuthHandlers;
  wechat?: AccountSecurityWechatHandlers<TSubmitResult>;
  onSubmitted: (data: TSubmitResult) => void;
  onError?: (message: string) => void;
  onCancel?: () => void;
};

const hasAccountCancellationVerifyHandlers = <TSubmitResult,>({
  method,
  code,
  oauth,
  wechat
}: {
  method: AccountSecurityVerifyMethod;
  code?: AccountSecurityCodeHandlers<TSubmitResult>;
  oauth?: AccountSecurityOAuthHandlers;
  wechat?: AccountSecurityWechatHandlers<TSubmitResult>;
}) => {
  if (method === AccountSecurityVerifyMethodEnum.code) return !!code;
  if (method === AccountSecurityVerifyMethodEnum.oauth) return !!oauth;
  if (method === AccountSecurityVerifyMethodEnum.wechat) return !!wechat;
  return false;
};

const AccountCancellationVerifyPanel = <TSubmitResult,>({
  status,
  loading = false,
  width = '380px',
  showTitle = true,
  selectedVerifyMethod,
  code,
  oauth,
  wechat,
  onSubmitted,
  onError,
  onCancel
}: AccountCancellationVerifyPanelProps<TSubmitResult>) => {
  const { t } = useTranslation();
  const statusAvailableVerifyMethods = status?.availableVerifyMethods;
  const statusCanVerify = status?.canVerify;
  const account = status?.maskedAccount;
  const authAccount = status?.authAccount;

  const availableVerifyMethods = useMemo(() => {
    if (statusAvailableVerifyMethods) return statusAvailableVerifyMethods;

    return accountCancellationVerifyMethodOrder.filter((method) =>
      hasAccountCancellationVerifyHandlers({
        method,
        code,
        oauth,
        wechat
      })
    );
  }, [code, oauth, statusAvailableVerifyMethods, wechat]);

  const verifyMethod = useMemo(() => {
    const canUseVerify = statusCanVerify ?? true;
    if (!canUseVerify) return;

    const methodWithHandler = accountCancellationVerifyMethodOrder.find(
      (method) =>
        availableVerifyMethods.includes(method) &&
        hasAccountCancellationVerifyHandlers({
          method,
          code,
          oauth,
          wechat
        })
    );

    if (
      selectedVerifyMethod &&
      availableVerifyMethods.includes(selectedVerifyMethod) &&
      hasAccountCancellationVerifyHandlers({
        method: selectedVerifyMethod,
        code,
        oauth,
        wechat
      })
    ) {
      return selectedVerifyMethod;
    }

    return methodWithHandler;
  }, [availableVerifyMethods, code, oauth, selectedVerifyMethod, statusCanVerify, wechat]);

  const renderVerifyPanel = () => {
    if (verifyMethod === AccountSecurityVerifyMethodEnum.wechat && wechat) {
      return (
        <AccountSecurityWechatPanel
          {...wechat}
          wechatTip={t('account_info:account_cancellation_wechat_tip', '微信扫码验证')}
          wechatQRCodeErrorText={t(
            'account_info:account_cancellation_wechat_qr_error',
            '获取微信二维码失败，请稍后重试'
          )}
          verifyErrorText={t(
            'account_info:account_cancellation_verify_error',
            '身份验证失败，请重试'
          )}
          queryKeyPrefix="accountCancellationWechat"
          onSubmitted={onSubmitted}
          onError={onError}
        />
      );
    }

    if (verifyMethod === AccountSecurityVerifyMethodEnum.oauth && oauth) {
      return (
        <AccountSecurityOAuthButton
          {...oauth}
          account={account}
          accountPlaceholder={t('account_info:account_cancellation_account', '账号')}
          oauthErrorText={t(
            'account_info:account_cancellation_oauth_error',
            '获取第三方验证链接失败，请稍后重试'
          )}
          oauthButtonText={(providerName) =>
            t('account_info:account_cancellation_oauth_button', {
              provider: providerName,
              defaultValue: `前往${providerName}验证`
            })
          }
          wechatProviderName={t('account_info:account_cancellation_verify_wechat', '微信扫码')}
          provider={status?.oauthProvider}
          onError={onError}
        />
      );
    }

    if (verifyMethod === AccountSecurityVerifyMethodEnum.code && code) {
      return (
        <AccountSecurityCodeForm
          {...code}
          account={account}
          authAccount={authAccount}
          requireAuthAccount
          accountPlaceholder={t('account_info:account_cancellation_account', '账号')}
          codePlaceholder={t('account_info:account_cancellation_code', '验证码')}
          submitText={t('account_info:account_cancellation_confirm', '确认注销')}
          resendCodeText={(count) =>
            t('account_info:account_cancellation_resend_countdown', {
              count,
              defaultValue: `重新获取（${count}）`
            })
          }
          sendCodeSuccessToast={t('user:password.code_sended', '验证码已发送')}
          verifyErrorText={t(
            'account_info:account_cancellation_verify_error',
            '身份验证失败，请重试'
          )}
          onSubmitted={onSubmitted}
          onError={onError}
        />
      );
    }

    return null;
  };

  if (loading) {
    return (
      <Center minH={'240px'} w={width} maxW={'100%'}>
        <Loading fixed={false} />
      </Center>
    );
  }

  if (!verifyMethod) {
    return (
      <Box w={width} maxW={'100%'} textAlign={'center'}>
        <Box fontWeight={'medium'} fontSize={'20px'} lineHeight={'30px'}>
          {t('account_info:account_cancellation_unavailable_title', '当前账号不支持注销')}
        </Box>
        <Box mt={3} color={'myGray.600'} fontSize={'14px'} lineHeight={'22px'}>
          {t(
            'account_info:account_cancellation_unavailable_desc',
            '请确认账号类型和系统注销开关是否满足要求。'
          )}
        </Box>
        {onCancel && (
          <Button mt={8} w={'100%'} h={'40px'} onClick={onCancel}>
            {t('common:back', '返回')}
          </Button>
        )}
      </Box>
    );
  }

  const verifyPanelMarginTop = verifyMethod === AccountSecurityVerifyMethodEnum.code ? 9 : 6;

  return (
    <Box w={width} maxW={'100%'}>
      {showTitle && (
        <Box fontWeight={'medium'} fontSize={'20px'} lineHeight={'30px'} textAlign={'center'}>
          {t('account_info:account_cancellation_title', '账号注销')}
        </Box>
      )}
      <Box mt={verifyPanelMarginTop}>{renderVerifyPanel()}</Box>
    </Box>
  );
};

export default AccountCancellationVerifyPanel;
