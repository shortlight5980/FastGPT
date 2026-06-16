import React, { useState } from 'react';
import { Box, Center } from '@chakra-ui/react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'next-i18next';
import Loading from '@fastgpt/web/components/common/MyLoading';
import MyImage from '@fastgpt/web/components/common/Image/MyImage';
import type {
  AccountSecurityVerifyCopy,
  AccountSecurityWechatHandlers
} from '@/components/support/user/safe/accountSecurity/types';

type AccountSecurityWechatPanelProps<TSubmitResult> = AccountSecurityWechatHandlers<TSubmitResult> &
  Pick<AccountSecurityVerifyCopy, 'wechatTip' | 'wechatQRCodeErrorText' | 'verifyErrorText'> & {
    queryKeyPrefix?: string;
    onSubmitted: (data: TSubmitResult) => void;
    onError?: (message: string) => void;
  };

const AccountSecurityWechatPanel = <TSubmitResult,>({
  queryKeyPrefix = 'accountSecurityWechat',
  wechatTip,
  wechatQRCodeErrorText,
  verifyErrorText,
  getQRCode,
  checkQRCode,
  onSubmitted,
  onError
}: AccountSecurityWechatPanelProps<TSubmitResult>) => {
  const { t } = useTranslation();
  const [submitted, setSubmitted] = useState(false);

  const { data: wechatInfo } = useQuery([`${queryKeyPrefix}QR`], getQRCode, {
    onError() {
      onError?.(
        wechatQRCodeErrorText ??
          t('account_info:account_security_wechat_qr_error', '获取微信二维码失败')
      );
    }
  });

  useQuery(
    [`${queryKeyPrefix}Check`, wechatInfo?.code],
    () =>
      checkQRCode({
        code: wechatInfo?.code || ''
      }),
    {
      refetchInterval: submitted ? false : 3 * 1000,
      enabled: !!wechatInfo?.code && !submitted,
      onSuccess(data: TSubmitResult | null | undefined) {
        if (data) {
          setSubmitted(true);
          onSubmitted(data);
        }
      },
      onError() {
        onError?.(verifyErrorText ?? t('account_info:account_security_verify_error', '验证失败'));
      }
    }
  );

  return (
    <Box textAlign={'center'}>
      <Box fontSize={'14px'} color={'myGray.600'} mb={5}>
        {wechatTip ?? t('account_info:account_security_wechat_tip', '请使用微信扫码完成验证')}
      </Box>
      <Center>
        {wechatInfo?.codeUrl ? (
          <Box
            border={'base'}
            borderRadius={'md'}
            p={'3.2px'}
            bg={'#FBFBFB'}
            overflow={'hidden'}
            w={'220px'}
            h={'220px'}
          >
            <MyImage w={'100%'} h={'100%'} src={wechatInfo.codeUrl} alt="qrcode" />
          </Box>
        ) : (
          <Center w={'220px'} h={'220px'} position={'relative'}>
            <Loading fixed={false} />
          </Center>
        )}
      </Center>
    </Box>
  );
};

export default AccountSecurityWechatPanel;
