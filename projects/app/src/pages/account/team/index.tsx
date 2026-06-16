'use client';
import { serviceSideProps } from '@/web/common/i18n/utils';
import AccountContainer from '@/pageComponents/account/AccountContainer';
import { Box, Flex, VStack } from '@chakra-ui/react';
import Icon from '@fastgpt/web/components/common/Icon';
import { useTranslation } from 'next-i18next';
import TeamSelector from '@/pageComponents/account/TeamSelector';
import { useUserStore } from '@/web/support/user/useUserStore';
import React, { useMemo } from 'react';
import { useContextSelector } from 'use-context-selector';
import { useRouter } from 'next/router';
import FillRowTabs from '@fastgpt/web/components/common/Tabs/FillRowTabs';
import MyIcon from '@fastgpt/web/components/common/Icon';
import { TeamMemberRoleEnum } from '@fastgpt/global/support/user/team/constant';
import { TeamContext, TeamModalContextProvider } from '@/pageComponents/account/team/context';
import dynamic from 'next/dynamic';
import { useSystemStore } from '@/web/common/system/useSystemStore';
import { useToast } from '@fastgpt/web/hooks/useToast';
import { formatTime2YMDHM } from '@fastgpt/global/common/string/time';

const MemberTable = dynamic(() => import('@/pageComponents/account/team/MemberTable'));
const PermissionManage = dynamic(
  () => import('@/pageComponents/account/team/PermissionManage/index')
);
const AuditLog = dynamic(() => import('@/pageComponents/account/team/Audit/index'));
const GroupManage = dynamic(() => import('@/pageComponents/account/team/GroupManage/index'));
const OrgManage = dynamic(() => import('@/pageComponents/account/team/OrgManage/index'));
const HandleInviteModal = dynamic(
  () => import('@/pageComponents/account/team/Invite/HandleInviteModal')
);

export enum TeamTabEnum {
  member = 'member',
  org = 'org',
  group = 'group',
  permission = 'permission',
  audit = 'audit'
}

const Team = () => {
  const router = useRouter();

  const invitelinkid = useMemo(() => {
    const _id = router.query.invitelinkid;
    if (!_id && typeof _id !== 'string') {
      return '';
    } else {
      return _id as string;
    }
  }, [router.query.invitelinkid]);

  const { teamTab = TeamTabEnum.member } = router.query as { teamTab: `${TeamTabEnum}` };

  const { t } = useTranslation();
  const { userInfo, teamPlanStatus } = useUserStore();
  const standardPlan = teamPlanStatus?.standard;
  const level = standardPlan?.currentSubLevel;
  const { subPlans } = useSystemStore();
  const planContent = useMemo(() => {
    const plan = level !== undefined ? subPlans?.standard?.[level] : undefined;
    if (!plan) return;
    return {
      auditLogStoreDuration: plan?.auditLogStoreDuration
    };
  }, [subPlans?.standard, level]);
  const { toast } = useToast();
  const teamAccountDeletion = userInfo?.teamAccountDeletion;
  const hasManagePermission = userInfo?.team?.permission?.hasManagePer;

  const { setEditTeamData, teamSize } = useContextSelector(TeamContext, (v) => v);

  const Tabs = useMemo(
    () => (
      <FillRowTabs
        list={[
          { label: t('account_team:member'), value: TeamTabEnum.member },
          { label: t('account_team:org'), value: TeamTabEnum.org },
          { label: t('account_team:group'), value: TeamTabEnum.group },
          { label: t('account_team:permission'), value: TeamTabEnum.permission },
          ...(hasManagePermission
            ? [{ label: t('account_team:audit_log'), value: TeamTabEnum.audit }]
            : [])
        ]}
        px={'1rem'}
        value={teamTab}
        onChange={(e) => {
          if (e === TeamTabEnum.audit && planContent && !planContent?.auditLogStoreDuration) {
            toast({
              status: 'warning',
              title: t('common:not_permission')
            });
            return;
          }
          router.replace({
            query: {
              ...router.query,
              teamTab: e
            }
          });
        }}
      />
    ),
    [hasManagePermission, planContent, router, t, teamTab, toast]
  );

  return (
    <AccountContainer>
      <Flex h={'100%'} flexDirection={'column'}>
        {/* header */}
        <Flex
          w={'100%'}
          h={'3.5rem'}
          px={'1.56rem'}
          py={'0.56rem'}
          borderBottom={'1px solid'}
          borderColor={'myGray.200'}
          bg={'myGray.25'}
          align={'center'}
          gap={6}
          justify={'space-between'}
        >
          <Flex align={'center'}>
            <Flex gap={2} color={'myGray.900'}>
              <Icon name="support/user/usersLight" w={'1.25rem'} h={'1.25rem'} />
              <Box fontWeight={'500'} fontSize={'1rem'}>
                {t('account:team')}
              </Box>
            </Flex>
            <Flex align={'center'} ml={6}>
              <TeamSelector height={'28px'} />
            </Flex>
            {userInfo?.team?.role === TeamMemberRoleEnum.owner && (
              <Flex align={'center'} justify={'center'} ml={2} p={'0.44rem'}>
                <MyIcon
                  name="edit"
                  w="18px"
                  cursor="pointer"
                  _hover={{
                    color: 'primary.500'
                  }}
                  onClick={() => {
                    if (!userInfo?.team) return;
                    setEditTeamData({
                      id: userInfo.team.teamId,
                      name: userInfo.team.teamName,
                      avatar: userInfo.team.teamAvatar,
                      notificationAccount: userInfo.team.notificationAccount
                    });
                  }}
                />
              </Flex>
            )}
          </Flex>

          <Box
            float={'right'}
            color={'myGray.900'}
            h={'1.25rem'}
            px={'0.5rem'}
            py={'0.125rem'}
            fontSize={'0.75rem'}
            borderRadius={'1.25rem'}
            bg={'myGray.150'}
          >
            {t('account_team:total_team_members', { amount: teamSize })}
          </Box>
        </Flex>

        {/* table */}
        <Box
          py={'1.5rem'}
          px={'2rem'}
          flex={'1 0 0'}
          display={'flex'}
          flexDirection={'column'}
          overflow={'auto'}
        >
          {teamAccountDeletion ? (
            <Flex flex={1} align={'center'} justify={'center'}>
              <VStack
                maxW={'560px'}
                w={'100%'}
                spacing={4}
                align={'stretch'}
                p={8}
                border={'1px solid'}
                borderColor={'orange.200'}
                bg={'orange.50'}
                borderRadius={'xl'}
              >
                <Box fontSize={'xl'} fontWeight={'bold'} color={'orange.700'}>
                  {t('account_team:team_account_deletion_pending_title')}
                </Box>
                <Box color={'myGray.700'}>
                  {t('account_team:team_account_deletion_pending_desc', {
                    teamName: userInfo?.team?.teamName
                  })}
                </Box>
                <Box color={'myGray.600'}>
                  {t('account_team:team_account_deletion_requested_at', {
                    time: formatTime2YMDHM(teamAccountDeletion.requestedAt)
                  })}
                </Box>
                <Box color={'myGray.600'}>
                  {t('account_team:team_account_deletion_scheduled_at', {
                    time: formatTime2YMDHM(teamAccountDeletion.scheduledDeleteAt)
                  })}
                </Box>
                <Box color={'myGray.600'}>{t('account_team:team_account_deletion_switch_tip')}</Box>
              </VStack>
            </Flex>
          ) : (
            <>
              {teamTab === TeamTabEnum.member && <MemberTable Tabs={Tabs} />}
              {teamTab === TeamTabEnum.org && <OrgManage Tabs={Tabs} />}
              {teamTab === TeamTabEnum.group && <GroupManage Tabs={Tabs} />}
              {teamTab === TeamTabEnum.permission && <PermissionManage Tabs={Tabs} />}
              {teamTab === TeamTabEnum.audit && <AuditLog Tabs={Tabs} />}
            </>
          )}
        </Box>
      </Flex>
      {invitelinkid && <HandleInviteModal invitelinkid={invitelinkid} />}
    </AccountContainer>
  );
};

export async function getServerSideProps(content: any) {
  return {
    props: {
      ...(await serviceSideProps(content, ['account', 'account_team', 'user']))
    }
  };
}

const Render = () => {
  const { userInfo } = useUserStore();

  return !!userInfo?.team ? (
    <TeamModalContextProvider>
      <Team />
    </TeamModalContextProvider>
  ) : null;
};

export default React.memo(Render);
