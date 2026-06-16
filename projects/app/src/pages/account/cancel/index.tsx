import React from 'react';
import dynamic from 'next/dynamic';
import { serviceSideProps } from '@/web/common/i18n/utils';

const CancelAccountPage = dynamic(
  () => import('@/pageComponents/account/cancel/CancelAccountPage')
);

const AccountCancel = () => {
  return <CancelAccountPage />;
};

export async function getServerSideProps(content: any) {
  return {
    props: {
      ...(await serviceSideProps(content, ['account', 'account_info', 'user']))
    }
  };
}

export default AccountCancel;
