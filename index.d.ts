declare module '*.svg' {
  const component: React.FC<React.HTMLAttributes<SVGElement>>;
  export default component;
}

declare module '@styled-system/css' {
  export default (css: any) => any;
}

declare module 'tsconfig-paths-webpack-plugin' {
  export default class {}
}

declare module 'nanoid-dictionary/nolookalikes' {
  export default any;
}

// Use type safe message keys with `next-intl`
type Messages = typeof import('./messages/en.json');
declare interface IntlMessages extends Messages {}
