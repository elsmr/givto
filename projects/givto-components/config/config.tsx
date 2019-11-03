import { getThemeValue, theme } from '@givto/utils';
import { withKnobs } from '@storybook/addon-knobs';
import { addDecorator, configure } from '@storybook/react';
import React from 'react';
import { createGlobalStyle, ThemeProvider } from 'styled-components';

const GlobalStyles = createGlobalStyle`
  @import url('https://fonts.googleapis.com/css?family=Lato:400,700,900&display=optional');

  html {
    box-sizing: border-box;
    font-family: ${getThemeValue('fontFamilies', 'display')};
  }

  h1, h2, h3 {
    font-family: ${getThemeValue('fontFamilies', 'title')};
  }

  *, *:before, *:after {
    box-sizing: inherit;
  }
`;

// automatically import all files ending in /stories
configure(require.context('../stories', true, /\.tsx$/), module);

addDecorator(storyFn => (
  <ThemeProvider theme={theme}>
    <>
      <GlobalStyles />
      {storyFn()}
    </>
  </ThemeProvider>
));

addDecorator(withKnobs);
