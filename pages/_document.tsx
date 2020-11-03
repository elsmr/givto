import Document, { Head, Html, Main, NextScript } from 'next/document';
import React from 'react';

class GivtoDocument extends Document {
  render() {
    return (
      <Html lang="en">
        <Head />
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}

export default GivtoDocument;
