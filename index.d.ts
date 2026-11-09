declare module '@styled-system/css' {
  export default (css: any) => any;
}

declare module 'tsconfig-paths-webpack-plugin' {
  export default class {}
}

// Use type safe message keys with `next-intl`
type Messages = typeof import('./messages/en.json');
declare interface IntlMessages extends Messages {}
