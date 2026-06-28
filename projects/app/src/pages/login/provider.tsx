import React, { useCallback, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useSystemStore } from '@/web/common/system/useSystemStore';
import { useUserStore } from '@/web/support/user/useUserStore';
import { clearToken } from '@/web/support/user/auth';
import { confirmAccountCancellationOAuth, oauthLogin } from '@/web/support/user/api';
import { useToast } from '@fastgpt/web/hooks/useToast';
import Loading from '@fastgpt/web/components/common/MyLoading';
import { serviceSideProps } from '@/web/common/i18n/utils';
import { getErrText } from '@fastgpt/global/common/error/utils';
import { useTranslation } from 'next-i18next';
import { OAuthEnum } from '@fastgpt/global/support/user/constant';
import {
  getBdVId,
  getFastGPTSem,
  getInviterId,
  getMsclkid,
  removeFastGPTSem
} from '@/web/support/marketing/utils';
import { postAcceptInvitationLink } from '@/web/support/user/team/api';
import { retryFn } from '@fastgpt/global/common/system/utils';
import { validateRedirectUrl } from '@/web/common/utils/uri';
import type { LoginSuccessResponseType } from '@fastgpt/global/openapi/support/user/account/login/api';
import { useLoginRedirectAfterLogin } from '@/web/support/user/loginRedirect';
import type { LangEnum } from '@fastgpt/global/common/i18n/type';
import { getOAuthProviderCallbackUrl } from '@/web/support/user/loginRedirect/url';
import {
  claimOAuthCallbackByPath,
  getLoginProviderOAuthCallbackBranch,
  handleAccountCancellationOAuthCallback
} from '@/web/support/user/loginRedirect/oauthCallback';

let isOauthLogging = false;

const provider = () => {
  const { t, i18n } = useTranslation();
  const { initd, loginStore, loginStoreHydrated, setLoginStore } = useSystemStore();
  const { setUserInfo } = useUserStore();
  const router = useRouter();
  const { state, error, ...props } = router.query as Record<string, string>;
  const { toast } = useToast();
  const resolveLoginRedirect = useLoginRedirectAfterLogin();

  const lastRoute = loginStore?.lastRoute
    ? validateRedirectUrl(loginStore.lastRoute)
    : '/dashboard/agent';
  const lastTmbId = loginStore?.lastTmbId || '';
  const errorRedirectPage = lastRoute.startsWith('/chat') ? lastRoute : '/login';

  const loginSuccess = useCallback(
    async (res: LoginSuccessResponseType) => {
      const decodeLastRoute = validateRedirectUrl(lastRoute);

      const navigateTo = await (async () => {
        if (res.user.team.status !== 'active') {
          if (decodeLastRoute.includes('/account/team?invitelinkid=')) {
            const id = decodeLastRoute.split('invitelinkid=')[1];
            await postAcceptInvitationLink(id);
            return '/dashboard/agent';
          } else {
            toast({
              status: 'warning',
              title: t('common:not_active_team')
            });
          }
        }

        return decodeLastRoute;
      })();

      const targetRoute = navigateTo
        ? await resolveLoginRedirect({
            user: res.user,
            fallbackRoute: navigateTo,
            lastTmbId
          })
        : undefined;

      setUserInfo(res.user);

      if (targetRoute) {
        router.replace(targetRoute);
      }
    },
    [lastRoute, lastTmbId, resolveLoginRedirect, router, setUserInfo, t, toast]
  );

  const authProps = useCallback(
    async (props: Record<string, string>) => {
      try {
        const res = await oauthLogin({
          type: loginStore?.provider || OAuthEnum.sso,
          props,
          callbackUrl: getOAuthProviderCallbackUrl(location.origin),
          inviterId: getInviterId(),
          bd_vid: getBdVId(),
          msclkid: getMsclkid(),
          fastgpt_sem: getFastGPTSem(),
          language: i18n.language as LangEnum
        });

        if (!res) {
          toast({
            status: 'warning',
            title: t('common:support.user.login.error')
          });
          return setTimeout(() => {
            router.replace(errorRedirectPage);
          }, 1000);
        }

        removeFastGPTSem();
        await loginSuccess(res);
      } catch (error) {
        toast({
          status: 'warning',
          title: getErrText(error, t('common:support.user.login.error'))
        });
        setTimeout(() => {
          router.replace(errorRedirectPage);
        }, 1000);
      }
      setLoginStore(undefined);
    },
    [
      errorRedirectPage,
      i18n.language,
      loginStore?.provider,
      loginSuccess,
      router,
      setLoginStore,
      t,
      toast
    ]
  );

  const confirmAccountCancellation = useCallback(
    async ({
      provider,
      state,
      props
    }: {
      provider: OAuthEnum;
      state: string;
      props: Record<string, string>;
    }) => {
      try {
        const result = await confirmAccountCancellationOAuth({
          provider,
          state,
          callbackUrl: getOAuthProviderCallbackUrl(location.origin),
          props
        });

        if (result) {
          toast({
            status: 'success',
            title: t('account_info:account_cancellation_verify_success')
          });
          setUserInfo(null);
          router.replace('/login?lastRoute=/account/cancel');
        }
      } catch {
        toast({
          status: 'warning',
          title: t('account_info:account_cancellation_verify_error')
        });
        setTimeout(() => {
          router.replace('/account/cancel');
        }, 1000);
      }
      setLoginStore(undefined);
    },
    [router, setLoginStore, setUserInfo, t, toast]
  );

  useEffect(() => {
    if (error) {
      toast({
        status: 'warning',
        title:
          loginStore?.authType === 'accountCancellation'
            ? t('account_info:account_cancellation_verify_error')
            : t('common:support.user.login.Provider error')
      });
      router.replace(
        loginStore?.authType === 'accountCancellation' ? '/account/cancel' : errorRedirectPage
      );
      return;
    }

    const callbackBranch = getLoginProviderOAuthCallbackBranch({
      hasProps: !!props,
      initd,
      loginStoreHydrated,
      isOauthLogging,
      authType: loginStore?.authType
    });

    if (callbackBranch === 'waiting' || callbackBranch === 'duplicate') return;

    isOauthLogging = true;

    (async () => {
      try {
        if (callbackBranch === 'accountCancellation') {
          if (!loginStore) return;

          await handleAccountCancellationOAuthCallback({
            asPath: router.asPath,
            provider: loginStore.provider,
            state,
            expectedState: loginStore.state,
            props,
            onInvalidState: async () => {
              toast({
                status: 'warning',
                title: t('account_info:account_cancellation_verify_error')
              });
              setLoginStore(undefined);
              setTimeout(() => {
                router.replace('/account/cancel');
              }, 1000);
            },
            onConfirm: confirmAccountCancellation
          });
          return;
        }

        if (!claimOAuthCallbackByPath(router.asPath)) {
          return;
        }

        await retryFn(async () => clearToken());
        router.prefetch('/dashboard/agent');

        if (loginStore && loginStore.provider !== 'sso' && state !== loginStore.state) {
          toast({
            status: 'warning',
            title: t('common:support.user.login.security_failed')
          });
          setTimeout(() => {
            router.replace(errorRedirectPage);
          }, 1000);
          return;
        } else {
          authProps(props);
        }
      } finally {
        isOauthLogging = false;
      }
    })();
  }, [
    initd,
    loginStoreHydrated,
    authProps,
    confirmAccountCancellation,
    error,
    loginStore,
    router,
    state,
    t,
    toast,
    props,
    errorRedirectPage,
    setLoginStore
  ]);

  return <Loading />;
};

export default provider;

export async function getServerSideProps(context: any) {
  return {
    props: {
      ...(await serviceSideProps(context, ['login', 'account_info']))
    }
  };
}
