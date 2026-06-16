import React, { useMemo } from 'react';
import { Box, Button, Input } from '@chakra-ui/react';
import { useTranslation } from 'next-i18next';
import { OAuthEnum } from '@fastgpt/global/support/user/constant';
import { useRequest } from '@fastgpt/web/hooks/useRequest';
import { useSystemStore } from '@/web/common/system/useSystemStore';
import type {
  AccountSecurityOAuthHandlers,
  AccountSecurityVerifyCopy
} from '@/components/support/user/safe/accountSecurity/types';

type AccountSecurityOAuthButtonProps = AccountSecurityOAuthHandlers &
  Pick<
    AccountSecurityVerifyCopy,
    'accountPlaceholder' | 'oauthErrorText' | 'oauthButtonText' | 'wechatProviderName'
  > & {
    account?: string;
    provider?: `${OAuthEnum}`;
    onError?: (message: string) => void;
  };

const AccountSecurityOAuthButton = ({
  account,
  accountPlaceholder,
  oauthErrorText,
  oauthButtonText,
  wechatProviderName,
  provider,
  onStartOAuth,
  onOAuthStarted,
  autoRedirect = true,
  onError
}: AccountSecurityOAuthButtonProps) => {
  const { t } = useTranslation();
  const { feConfigs } = useSystemStore();

  const providerName = useMemo(
    () =>
      ({
        [OAuthEnum.sso]: feConfigs?.sso?.title || 'SSO',
        [OAuthEnum.google]: 'Google',
        [OAuthEnum.github]: 'GitHub',
        [OAuthEnum.microsoft]: feConfigs?.oauth?.microsoft?.customButton || 'Microsoft',
        [OAuthEnum.wecom]: t('common:core.chat.logs.wecom'),
        [OAuthEnum.wechat]:
          wechatProviderName ?? t('account_info:account_security_verify_wechat', '微信')
      })[provider || OAuthEnum.github],
    [feConfigs, provider, t, wechatProviderName]
  );

  const { runAsync, loading } = useRequest(
    async () => {
      if (!provider) {
        return Promise.reject(
          oauthErrorText ?? t('account_info:account_security_oauth_error', '第三方验证失败')
        );
      }
      const result = await onStartOAuth({ provider });
      onOAuthStarted?.({ ...result, provider });
      if (autoRedirect) {
        location.replace(result.url);
      }
    },
    {
      errorToast: '',
      onError(err) {
        const fallback =
          oauthErrorText ?? t('account_info:account_security_oauth_error', '第三方验证失败');
        onError?.(typeof err === 'string' ? err : fallback);
      }
    }
  );

  return (
    <Box>
      <Input
        value={account || ''}
        isReadOnly
        bg={'myGray.50'}
        h={'40px'}
        color={'myGray.500'}
        placeholder={accountPlaceholder ?? t('account_info:user_account')}
      />
      <Button
        mt={12}
        variant={'primary'}
        w={'100%'}
        h={'40px'}
        borderRadius={'sm'}
        fontWeight={'medium'}
        isLoading={loading}
        onClick={() => runAsync()}
      >
        {oauthButtonText?.(providerName) ??
          t('account_info:account_security_oauth_button', {
            provider: providerName,
            defaultValue: `前往${providerName}验证`
          })}
      </Button>
    </Box>
  );
};

export default AccountSecurityOAuthButton;
