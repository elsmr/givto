import styled from '@emotion/styled';
import NextLink from 'next/link';
import React from 'react';
import GivtoLogo from '../../../assets/givto-logo.svg';
import { Box, BoxProps } from './ui/box';
import { Link } from './ui/link';

const StyledLogo = styled(GivtoLogo)`
  width: 48px;
  height: 48px;
`;
interface HeaderProps extends BoxProps {
  title?: JSX.Element;
  actions?: JSX.Element;
}
export const Header: React.FC<HeaderProps> = ({ actions, title, ...props }) => (
  <Box
    display="flex"
    justifyContent="space-between"
    alignItems="center"
    minHeight="52px"
    as="header"
    {...props}
  >
    <Box display="flex" alignItems="center" marginRight={2}>
      <NextLink href="/">
        <Link flexShrink={0} style={{ textDecoration: 'none' }}>
          <Box as="h1" display="flex" alignItems="center">
            <StyledLogo />
            {!title && (
              <Box color="black" px={2}>
                Givto
              </Box>
            )}
          </Box>
        </Link>
      </NextLink>
      <Box marginLeft={2}>{title}</Box>
    </Box>
    {actions}
  </Box>
);
