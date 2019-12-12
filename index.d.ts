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

declare module 'next-offline/runtime' {
  export const register: Function;
  export const unregister: Function;
}
