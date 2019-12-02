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
    console.log('initial token', this.state.authContext.token);
    this.handleNewToken(
      this.state.authContext.token,
      Boolean(this.state.authContext.token)
    );
    AuthUtils.subscribe(this.handleNewToken);
  }

  handleNewToken = async (token: Token | null, isLoading: boolean) => {
    client.setHeaders(AuthUtils.getAuthHeaders(token));
    this.setState(prevState => ({
      ...prevState,
      authContext: {
        ...prevState.authContext,
        token,
        user: null,
        isLoading
      }
    }));

    if (token) {
      const { data } = await client.request<{ getCurrentUser: User }>({
        query: AuthUtils.AUTH_QUERY
      });
      const user = data?.getCurrentUser || null;
      this.setState(prevState => ({
        ...prevState,
        authContext: { ...prevState.authContext, user, isLoading: false }
      }));
    }
  };

  render() {
    const { Component, pageProps } = this.props;
    const { authContext } = this.state;

    return (
      <ThemeProvider theme={theme}>
        <>
          <Global
            styles={css`
              html {
                box-sizing: border-box;
              }

              body {
                margin: 0;
                font-family: ${theme.fonts.body};
              }

              textarea {
                font-family: ${theme.fonts.body};
              }

              body.modal-open {
                overflow: hidden;
              }

              h1,
              h2,
              h3,
              h4 {
                font-family: ${theme.fonts.heading};
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
            `}
          />
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
            <link rel="stylesheet" />

            {/*
            // @ts-ignore */ /* prettier-ignore */}
            <link onload="this.media='all'"
              rel="stylesheet"
              href="https://fonts.googleapis.com/css?family=Lato:400,700&display=block"
              media="print"
            />
            <noscript>
              <link rel="stylesheet" href="/path/to/my.css" />
            </noscript>
            <meta name="msapplication-TileColor" content="#603cba" />
            <meta name="theme-color" content="#5A51FF"></meta>
          </Head>
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
