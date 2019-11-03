import { Link } from 'gatsby';
import React from 'react';
import styled from 'styled-components';
import GivtoLogo from '../images/givto-logo.svg';

const StyledLogo = styled(GivtoLogo)`
  width: 72px;
  height: 72px;
`;

export const Header: React.FC<{ siteTitle: string }> = ({ siteTitle }) => (
  <header>
    <Link aria-labelledby="logo-label" to="/">
      <h1>
        <span id="logo-label" hidden>
          {siteTitle} logo
        </span>
        <StyledLogo />
      </h1>
    </Link>
  </header>
);
