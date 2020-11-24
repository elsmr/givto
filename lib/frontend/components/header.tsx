import styled from '@emotion/styled';
import NextLink from 'next/link';
import React from 'react';
import GivtoLogo from '../../../assets/givto-logo.svg';
import { Box, BoxProps } from './ui/box';
import { LayoutWrapper } from './ui/layout';
import { Link } from './ui/link';

const StyledLogo = styled(GivtoLogo)`
  width: 44px;
  height: 44px;
`;
interface HeaderProps extends BoxProps {
  actions?: JSX.Element;
  bg?: string;
}
export const Header: React.FC<HeaderProps> = ({ actions, bg, ...props }) => (
  <Box bg={bg || 'primary'}>
    <LayoutWrapper p={0} py={2} px={[3, 4]}>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        minHeight="44px"
        as="header"
        {...props}
      >
        <Box display="flex" alignItems="center" marginRight={2}>
          <NextLink passHref href="/">
            <Link flexShrink={0} style={{ textDecoration: 'none' }}>
              <Box as="h1" display="flex" alignItems="center">
                <StyledLogo />
              </Box>
            </Link>
          </NextLink>
        </Box>
        {actions}
      </Box>
    </LayoutWrapper>
  </Box>
);
