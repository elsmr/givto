declare module '*.svg' {
  const component: React.FC<React.HTMLAttributes<SVGElement>>;
  export default component;
}

declare module '@styled-system/css' {
  export default (css: any) => any;
}
