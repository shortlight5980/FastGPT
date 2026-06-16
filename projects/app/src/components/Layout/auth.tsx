import { useRouter } from 'next/router';
import { useUserStore } from '@/web/support/user/useUserStore';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'next-i18next';
import { useToast } from '@fastgpt/web/hooks/useToast';
import { useEffect } from 'react';

const unAuthPage: { [key: string]: boolean } = {
  '/': true,
  '/login': true,
  '/login/provider': true,
  '/login/fastlogin': true,
  '/login/sso': true,
  '/appStore': true,
  '/chat': true,
  '/chat/share': true,
  '/tools/price': true,
  '/price': true
};

const accountCancellationPage = '/account/cancel';
const teamManagePage = '/account/team';
const isAccountDeletionActive = (status?: string) =>
  status === 'pending' || status === 'finalizing';
const isTeamAccountDeletionActive = (status?: string) =>
  status === 'pending' || status === 'finalizing';

const Auth = ({ children }: { children: JSX.Element | React.ReactNode }) => {
  const { t } = useTranslation();
  const router = useRouter();
  const { toast } = useToast();
  const { userInfo, initUserInfo } = useUserStore();

  useEffect(() => {
    if (
      isAccountDeletionActive(userInfo?.accountDeletion?.status) &&
      router.pathname !== accountCancellationPage
    ) {
      router.replace(accountCancellationPage);
      return;
    }
    if (
      isTeamAccountDeletionActive(userInfo?.teamAccountDeletion?.status) &&
      router.pathname !== teamManagePage
    ) {
      router.replace(teamManagePage);
    }
  }, [router, userInfo?.accountDeletion?.status, userInfo?.teamAccountDeletion?.status]);

  useQuery(
    [router.pathname],
    () => {
      if (unAuthPage[router.pathname] === true) {
        return null;
      } else {
        return initUserInfo({
          initTeamPlanStatus: router.pathname !== accountCancellationPage
        });
      }
    },
    {
      refetchInterval: 10 * 60 * 1000,
      onError() {
        toast({
          status: 'warning',
          title: t('common:support.user.Need to login')
        });
      }
    }
  );

  return !!userInfo || unAuthPage[router.pathname] === true ? children : null;
};

export default Auth;
