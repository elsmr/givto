import {
  getThemeColor,
  getThemeScale,
  getThemeValue,
  theme
} from '@givto/utils';
import React from 'react';
import styled, { createGlobalStyle, ThemeProvider } from 'styled-components';

const GlobalStyles = createGlobalStyle`
  @import url('https://fonts.googleapis.com/css?family=Lato:400,700,900&display=optional');

  html {
    box-sizing: border-box;
    font-family: ${getThemeValue('fontFamilies', 'display')};
    color: ${getThemeColor('black')};
    background: ${getThemeColor('white')};
  }

  body {
    margin: 0;
  }

  h1, h2, h3 {
    font-family: ${getThemeValue('fontFamilies', 'title')};
  }

  *, *:before, *:after {
    box-sizing: inherit;
  }
`;

export const LayoutWrapper = styled.div`
  width: 100%;
  max-width: 1200px;
  padding: ${getThemeScale('space', 2)}px;
  margin: 0 auto;
`;

export const Layout: React.FC = ({ children }) => {
  return (
    <ThemeProvider theme={theme}>
      <>
        <GlobalStyles />
        {children}
      </>
    </ThemeProvider>
  );
};
