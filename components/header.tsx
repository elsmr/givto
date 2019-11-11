import Link from 'next/link';
import React from 'react';
import styled from 'styled-components';
import { theme } from 'styled-tools';
import GivtoLogo from '../assets/givto-logo.svg';

const StyledLogo = styled(GivtoLogo)`
  width: 72px;
  height: 72px;
`;

const Anchor = styled.a`
  text-decoration: none;
  color: ${theme('colors.black')};
`;

const StyledHeader = styled.h1`
  display: flex;
  align-items: center;
`;

const Title = styled.span`
  padding: 0 ${theme('space.2')}px;
`;

export const Header: React.FC = () => (
  <header>
    <Link href="/">
      <Anchor>
        <StyledHeader>
          <StyledLogo />
          <Title>Givto</Title>
        </StyledHeader>
      </Anchor>
    </Link>
  </header>
);
