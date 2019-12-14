import { css, Global } from '@emotion/core';
import { User } from '@givto/api/graphql-schema';
import { fetch } from '@givto/frontend/api/api.util';
import {
  AuthContext,
  AuthUtils,
  IAuthContext,
  initialAuthContext,
  Token
} from '@givto/frontend/auth/auth.util';
import { theme } from '@givto/frontend/theme';
import { ThemeProvider } from 'emotion-theming';
import { ClientContext, GraphQLClient } from 'graphql-hooks';
import App from 'next/app';
import Head from 'next/head';
import React from 'react';

const client = new GraphQLClient({
  url: '/api/graphql',
  fetch
});

export default class GivtoApp extends App<
  {},
  {},
  { authContext: IAuthContext }
> {
  state = {
    authContext: initialAuthContext
  };

  componentDidMount(): void {
    if (navigator.serviceWorker) {
      navigator.serviceWorker.getRegistrations().then(function(registrations) {
        for (let registration of registrations) {
          registration.unregister();
        }
      });
    }
    this.handleNewToken(AuthUtils.getToken());
    AuthUtils.subscribe(this.handleNewToken);
  }

  handleNewToken = async (token: Token | null) => {
    client.setHeaders(AuthUtils.getAuthHeaders(token));

    if (token) {
      this.setState(prevState => ({
        ...prevState,
        authContext: { ...prevState.authContext, isLoading: true }
      }));
      const { data } = await client.request<{ getCurrentUser: User }>({
        query: AuthUtils.AUTH_QUERY
      });
      const user = data?.getCurrentUser || null;
      this.setState(prevState => ({
        ...prevState,
        authContext: {
          ...prevState.authContext,
          token,
          user,
          isLoading: false,
          isInitialized: true
        }
      }));
    } else {
      this.setState(prevState => ({
        ...prevState,
        authContext: {
          token,
          isLoading: false,
          user: null,
          isInitialized: true
        }
      }));
    }
  };

  render() {
    const { Component, pageProps } = this.props;
    const { authContext } = this.state;

    return (
      <ThemeProvider theme={theme}>
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
              rel="preload"
              href="/fonts/lato-optimized.woff2"
              as="font"
              type="font/woff2"
              crossOrigin="anonymous"
            />
            <meta name="msapplication-TileColor" content="#603cba" />
            <meta name="theme-color" content="#5A51FF"></meta>
            <script
              dangerouslySetInnerHTML={{
                __html: `
              (function() {
                "use strict";
                if( sessionStorage.fontsLoadedCriticalFoftPreloadFallback ) {
                  document.documentElement.className += " fonts-loaded-2";
                  return;
                } else if( "fonts" in document ) {
                  document.fonts.load("1em LatoSubset").then(function () {
                    document.documentElement.className += " fonts-loaded-1";
                    Promise.all([
                      document.fonts.load("400 1em Lato"),
                      document.fonts.load("700 1em Lato"),
                      document.fonts.load("italic 1em Lato"),
                      document.fonts.load("italic 700 1em Lato")
                    ]).then(function () {
                      document.documentElement.className += " fonts-loaded-2";
                      // Optimization for Repeat Views
                      sessionStorage.fontsLoadedCriticalFoftPreloadFallback = true;
                    });
                  });
                } else {
                  var ref = document.getElementsByTagName( "script" )[ 0 ];
                  var script = document.createElement( "script" );
                  script.src = "critical-foft-preload-fallback-optional.js";
                  script.async = true;
                  ref.parentNode.insertBefore( script, ref );
                }
              })();`
              }}
            />
          </Head>
          <Global
            styles={css`
              @font-face {
                font-family: LatoSubset;
                src: url('/fonts/lato-optimized.woff2') format('woff2'),
                  url('/fonts/lato-optimized.woff') format('woff');
                unicode-range: U+65-90, U+97-122;
              }
              @font-face {
                font-family: Lato;
                src: url('/fonts/lato-regular-webfont.woff2') format('woff2'),
                  url('/fonts/lato-regular-webfont.woff') format('woff');
                font-display: swap;
              }
              @font-face {
                font-family: Lato;
                src: url('/fonts/lato-bold-webfont.woff2') format('woff2'),
                  url('/fonts/lato-bold-webfont.woff') format('woff');
                font-weight: 700;
                font-display: swap;
              }

              html {
                box-sizing: border-box;
              }

              body {
                margin: 0;
                font-family: ${theme.fonts.body};
                scroll-behavior: smooth;
              }

              textarea {
                font-family: ${theme.fonts.body};
              }

              .fonts-loaded-1 h1,
              .fonts-loaded-1 h2,
              .fonts-loaded-1 h3,
              .fonts-loaded-1 h4 {
                font-family: LatoSubset;
              }

              .fonts-loaded-2 h1,
              .fonts-loaded-2 h2,
              .fonts-loaded-2 h3,
              .fonts-loaded-2 h4 {
                font-family: ${theme.fonts.heading};
              }

              body.modal-open {
                overflow: hidden;
              }

              h1,
              h2,
              h3,
              h4,
              p {
                margin: 0;
              }

              *,
              *:before,
              *:after {
                box-sizing: inherit;
              }

              .sr-only {
                border: 0;
                clip: rect(0 0 0 0);
                height: 1px;
                margin: -1px;
                overflow: hidden;
                padding: 0;
                position: absolute;
                width: 1px;
              }

              ::selection {
                background-color: ${theme.colors.primaryMuted};
              }

              a {
                color: ${theme.colors.primary};
              }
            `}
          />

          <ClientContext.Provider value={client}>
            <AuthContext.Provider value={authContext}>
              <div id="app-wrapper">
                <Component {...pageProps} />
              </div>
            </AuthContext.Provider>
          </ClientContext.Provider>
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
                "applicationCategory": "Productivity",
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
