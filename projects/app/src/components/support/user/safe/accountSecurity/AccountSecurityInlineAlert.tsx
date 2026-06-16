import React from 'react';
import { Box } from '@chakra-ui/react';

const AccountSecurityInlineAlert = ({ text }: { text?: string }) => {
  if (!text) return null;

  return (
    <Box
      mb={4}
      px={4}
      py={3}
      w={'380px'}
      maxW={'100%'}
      borderRadius={'md'}
      bg={'red.50'}
      color={'red.600'}
      fontSize={'14px'}
      lineHeight={'22px'}
    >
      {text}
    </Box>
  );
};

export default AccountSecurityInlineAlert;
