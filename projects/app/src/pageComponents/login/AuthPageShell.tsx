import React from 'react';
import { Box, Flex } from '@chakra-ui/react';
import MyIcon from '@fastgpt/web/components/common/Icon';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';

const AuthPageShell = ({
  children,
  showBack = true
}: {
  children: React.ReactNode;
  showBack?: boolean;
}) => {
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <Flex
      alignItems={'center'}
      justifyContent={'center'}
      bg={'white'}
      userSelect={'none'}
      minH={'100vh'}
      px={0}
      pt={0}
      pb={0}
      position={'relative'}
    >
      {showBack && (
        <Box
          as="button"
          type="button"
          aria-label={t('common:back')}
          position={'absolute'}
          top={'24px'}
          left={'24px'}
          w={'68px'}
          h={'32px'}
          p={0}
          m={0}
          border={0}
          zIndex={10}
          bg={'transparent'}
          color={'primary.600'}
          cursor={'pointer'}
          fontSize={'20px'}
          fontWeight={400}
          lineHeight={'32px'}
          letterSpacing={'-0.2px'}
          fontFamily={'PingFang SC, sans-serif'}
          _hover={{ color: 'primary.700' }}
          _active={{ color: 'primary.700' }}
          onClick={() => router.push('/account/info')}
        >
          <Flex w={'68px'} h={'32px'} alignItems={'center'} gap={'4px'}>
            <Flex w={'24px'} h={'24px'} alignItems={'center'} justifyContent={'center'}>
              <MyIcon name="common/arrowLeft" w="24px" h="24px" />
            </Flex>
            <Box w={'40px'} h={'32px'} textAlign={'center'}>
              {t('common:back')}
            </Box>
          </Flex>
        </Box>
      )}
      <Flex
        position="relative"
        alignItems={'center'}
        justifyContent={'center'}
        w={'100%'}
        maxW={['100%', '1328px']}
        h={'100vh'}
        minH={['100vh', '720px']}
        bg={['transparent', 'white']}
        borderRadius={[0, '24px']}
        overflow={'hidden'}
      >
        <Box
          position={'absolute'}
          top={['-190px', '-100px']}
          left={'50%'}
          w={['900px', '1230px']}
          h={['590px', '510px']}
          transform={'translateX(-50%)'}
          pointerEvents={'none'}
          bgImage={'url(/icon/login-gradient-bg.svg)'}
          bgRepeat={'no-repeat'}
          bgPosition={'center top'}
          bgSize={'100% 100%'}
        />

        <Flex
          flexDirection={'column'}
          w={['100%', '560px']}
          h={['100%', 'auto']}
          bg={['transparent', 'white']}
          px={['8', '90px']}
          py={['38px', '90px']}
          borderRadius={[0, '16px']}
          boxShadow={[
            '',
            '0px 16px 40px rgba(30, 64, 175, 0.10), 0px 1px 3px rgba(15, 23, 42, 0.06)'
          ]}
          position="relative"
          zIndex={1}
        >
          {children}
        </Flex>
      </Flex>
    </Flex>
  );
};

export default AuthPageShell;
