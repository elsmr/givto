import App from 'next/app';
import Head from 'next/head';
import React from 'react';
import { createGlobalStyle, ThemeProvider } from 'styled-components';
import { theme } from 'styled-tools';
import { theme as themeJson } from '../lib/theme';

const GlobalStyle = createGlobalStyle`
  html {
    box-sizing: border-box;
    font-family: ${theme('fontFamilies.display')};
    color: ${theme('colors.black')};
    background: ${theme('colors.white')};
  }

  body {
    margin: 0;
  }

  h1, h2, h3 {
    font-family: ${theme('fontFamilies.title')};
  }

  *, *:before, *:after {
    box-sizing: inherit;
  }
`;

export default class GivtoApp extends App {
  render() {
    const { Component, pageProps } = this.props;
    return (
      <ThemeProvider theme={themeJson}>
        <>
          <Head>
            <title>Givto - Secret Santa</title>
            <meta name="title" content="Givto - Secret Santa" />
            <meta
              name="description"
              content="Organize Secret Santa with your friends and family with ease."
            />

            <meta property="og:type" content="website" />
            <meta property="og:url" content="https://givto.app/" />
            <meta property="og:title" content="Givto - Secret Santa" />
            <meta
              property="og:description"
              content="Organize Secret Santa with your friends and family with ease."
            />
            <meta property="og:image" content="/givto-logo.png" />

            <meta property="twitter:card" content="summary_large_image" />
            <meta property="twitter:url" content="https://givto.app/" />
            <meta property="twitter:title" content="Givto - Secret Santa" />
            <meta
              property="twitter:description"
              content="Organize Secret Santa with your friends and family with ease."
            />
            <meta property="twitter:image" content="/givto-logo.png" />
            <link
              rel="apple-touch-icon"
              sizes="180x180"
              href="/apple-touch-icon.png"
            />
            <link
              rel="icon"
              type="image/png"
              sizes="32x32"
              href="/favicon-32x32.png"
            />
            <link
              rel="icon"
              type="image/png"
              sizes="16x16"
              href="/favicon-16x16.png"
            />
            <link rel="manifest" href="/givto.webmanifest" />
            <link
              href="https://fonts.googleapis.com/css?family=Lato:400,700,900&display=block"
              rel="stylesheet"
            />
            <meta name="msapplication-TileColor" content="#603cba" />
            <meta name="theme-color" content="#5A51FF"></meta>
          </Head>
          <GlobalStyle />
          <Component {...pageProps} />
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: `{
                "@context": "http://schema.org",
                "@type": "WebApplication",
                "name": "Givto - Secret Santa",
                "url": "https://givto.app",
                "description": "Organize Secret Santa with your friends and family with ease.",
                "genre": "family",
                "browserRequirements": "Requires JavaScript. Requires HTML5",
                "softwareVersion": "0.0.1",
                "softwareHelp": {
                  "@type": "CreativeWork",
                  "url": "https://meire.dev"
                },
                "operatingSystem": "All"
            }`
            }}
          />
        </>
      </ThemeProvider>
    );
  }
}
