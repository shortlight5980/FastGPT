import React from 'react';
import { Box, Button, VStack } from '@chakra-ui/react';
import { useTranslation } from 'next-i18next';
import dayjs from 'dayjs';
import type { AccountCancellationActiveResponseType } from '@fastgpt/global/openapi/support/user/account/cancellation/api';
import { AccountDeletionStatusEnum } from '@fastgpt/global/support/user/accountDeletion/constants';

const CancelPendingPanel = ({
  data,
  onCancel,
  loading
}: {
  data: AccountCancellationActiveResponseType;
  onCancel: () => void;
  loading?: boolean;
}) => {
  const { t } = useTranslation();
  const requestedAt = dayjs(data.requestedAt).format('YYYY/MM/DD HH:mm');
  const scheduledDeleteAt = dayjs(data.scheduledDeleteAt).format('YYYY/MM/DD HH:mm');
  const isFinalizing = data.status === AccountDeletionStatusEnum.finalizing;

  return (
    <Box w={'380px'} maxW={'100%'}>
      <Box fontWeight={'medium'} fontSize={'20px'} lineHeight={'30px'} textAlign={'center'}>
        {isFinalizing
          ? t('account_info:account_cancellation_finalizing_title')
          : t('account_info:account_cancellation_pending_title')}
      </Box>
      <VStack mt={9} align={'stretch'} spacing={1} fontSize={'14px'} lineHeight={'20px'}>
        <Box>
          {isFinalizing
            ? t('account_info:account_cancellation_finalizing_desc')
            : t('account_info:account_cancellation_pending_desc')}
        </Box>
        <Box>{t('account_info:account_cancellation_requested_at', { time: requestedAt })}</Box>
        <Box>
          {t('account_info:account_cancellation_scheduled_delete_at', {
            time: scheduledDeleteAt
          })}
        </Box>
        <Box>{t('account_info:account_cancellation_pending_effect')}</Box>
        {!isFinalizing && <Box>{t('account_info:account_cancellation_pending_cancel_tip')}</Box>}
      </VStack>
      {!isFinalizing && (
        <Button
          mt={12}
          w={'100%'}
          h={'40px'}
          variant={'whiteBase'}
          isLoading={loading}
          onClick={onCancel}
        >
          {t('account_info:account_cancellation_cancel')}
        </Button>
      )}
    </Box>
  );
};

export default CancelPendingPanel;
