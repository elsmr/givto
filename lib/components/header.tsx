import styled from '@emotion/styled';
import NextLink from 'next/link';
import React from 'react';
import GivtoLogo from '../assets/givto-logo.svg';
import { Box, BoxProps } from './ui/box';
import { Link } from './ui/link';

const StyledLogo = styled(GivtoLogo)`
  width: 48px;
  height: 48px;
`;

export const Header: React.FC<BoxProps> = props => (
  <Box as="header" {...props}>
    <NextLink href="/">
      <Link style={{ textDecoration: 'none' }}>
        <Box as="h1" display="flex" alignItems="center">
          <StyledLogo />
          <Box color="black" px={2}>
            Givto
          </Box>
        </Box>
      </Link>
    </NextLink>
  </Box>
);
