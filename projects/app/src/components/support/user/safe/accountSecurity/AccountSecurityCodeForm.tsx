import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Box, Button, FormControl, Input } from '@chakra-ui/react';
import { useDisclosure } from '@chakra-ui/react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'next-i18next';
import { useRequest } from '@fastgpt/web/hooks/useRequest';
import SendCodeAuthModal from '@/components/support/user/safe/SendCodeAuthModal';
import { getClientToken } from '@/web/support/user/hooks/useSendCode';
import { useSystemStore } from '@/web/common/system/useSystemStore';
import type {
  AccountSecurityCodeHandlers,
  AccountSecurityVerifyCopy
} from '@/components/support/user/safe/accountSecurity/types';
import { getErrText } from '@fastgpt/global/common/error/utils';

type FormType = {
  code: string;
};

type AccountSecurityCodeFormProps<TSubmitResult> = AccountSecurityCodeHandlers<TSubmitResult> &
  Pick<
    AccountSecurityVerifyCopy,
    | 'accountPlaceholder'
    | 'codePlaceholder'
    | 'submitText'
    | 'resendCodeText'
    | 'sendCodeSuccessToast'
    | 'verifyErrorText'
  > & {
    account?: string;
    authAccount?: string;
    requireAuthAccount?: boolean;
    onSubmitted: (data: TSubmitResult) => void;
    onError?: (message: string) => void;
  };

const AccountSecurityCodeForm = <TSubmitResult,>({
  account,
  authAccount,
  accountPlaceholder,
  codePlaceholder,
  submitText,
  resendCodeText,
  sendCodeSuccessToast,
  verifyErrorText,
  onSendCode,
  onSubmitCode,
  onSubmitted,
  requireAuthAccount = false,
  onError
}: AccountSecurityCodeFormProps<TSubmitResult>) => {
  const { t } = useTranslation();
  const { feConfigs } = useSystemStore();
  const [codeCountDown, setCodeCountDown] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval>>();
  const {
    isOpen: isOpenCodeAuthModal,
    onOpen: onOpenCodeAuthModal,
    onClose: onCloseCodeAuthModal
  } = useDisclosure();
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors }
  } = useForm<FormType>();
  const code = watch('code');
  const captchaUsername = requireAuthAccount ? authAccount : authAccount || account;

  const { runAsync: sendCode, loading: codeSending } = useRequest(
    async ({ captcha }: { username: string; captcha: string }) => {
      if (codeCountDown > 0) return;
      const googleToken = await getClientToken(feConfigs.googleClientVerKey);
      await onSendCode({ captcha, googleToken });
      setCodeCountDown(60);
    },
    {
      ...(sendCodeSuccessToast !== null
        ? { successToast: sendCodeSuccessToast ?? t('user:password.code_sended') }
        : {}),
      errorToast: '',
      onError(err) {
        const fallback =
          verifyErrorText ?? t('account_info:account_security_verify_error', '验证失败');
        onError?.(getErrText(err, fallback));
      }
    }
  );

  useEffect(() => {
    if (codeCountDown <= 0) return;

    timer.current = setInterval(() => {
      setCodeCountDown((count) => {
        if (count <= 1) {
          if (timer.current) clearInterval(timer.current);
          return 0;
        }
        return count - 1;
      });
    }, 1000);

    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [codeCountDown]);

  const sendCodeText = useMemo(() => {
    if (codeSending) return t('common:support.user.auth.Sending Code');
    if (codeCountDown > 0) {
      return (
        resendCodeText?.(codeCountDown) ??
        t('account_info:account_security_resend_countdown', {
          count: codeCountDown,
          defaultValue: `重新获取（${codeCountDown}）`
        })
      );
    }
    return t('common:support.user.auth.get_code');
  }, [codeCountDown, codeSending, resendCodeText, t]);

  const { runAsync: submitCode, loading } = useRequest(
    async ({ code }: FormType) => {
      const result = await onSubmitCode({ code });
      onSubmitted(result);
    },
    {
      errorToast: '',
      onError(err) {
        const fallback =
          verifyErrorText ?? t('account_info:account_security_verify_error', '验证失败');
        onError?.(getErrText(err, fallback));
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
      <FormControl mt={6} isInvalid={!!errors.code} position={'relative'}>
        <Input
          bg={'white'}
          h={'40px'}
          maxLength={6}
          inputMode={'numeric'}
          placeholder={codePlaceholder ?? t('user:password.verification_code')}
          {...register('code', {
            required: true,
            pattern: /^\d{6}$/
          })}
        />
        <Box
          position={'absolute'}
          right={3}
          top={'50%'}
          transform={'translateY(-50%)'}
          fontSize={'12px'}
          fontWeight={'medium'}
          color={codeCountDown > 0 ? 'myGray.400' : 'primary.700'}
          cursor={codeCountDown > 0 ? 'default' : 'pointer'}
          pointerEvents={codeCountDown > 0 ? 'none' : 'auto'}
          onClick={() => {
            if (codeCountDown > 0) return;
            if (!captchaUsername) {
              onError?.(
                verifyErrorText ?? t('account_info:account_security_verify_error', '验证失败')
              );
              return;
            }
            onOpenCodeAuthModal();
          }}
        >
          {sendCodeText}
        </Box>
      </FormControl>
      <Button
        mt={12}
        w={'100%'}
        h={'40px'}
        variant={'primary'}
        isDisabled={!/^\d{6}$/.test(code?.trim() || '')}
        isLoading={loading}
        onClick={handleSubmit(submitCode)}
      >
        {submitText ?? t('account_info:confirm')}
      </Button>
      {isOpenCodeAuthModal && captchaUsername && (
        <SendCodeAuthModal
          onClose={onCloseCodeAuthModal}
          username={captchaUsername}
          onSending={codeSending}
          onSendCode={sendCode}
        />
      )}
    </Box>
  );
};

export default AccountSecurityCodeForm;
