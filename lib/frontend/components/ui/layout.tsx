import { Box, BoxProps } from './box';

export const LayoutWrapper: React.FC<BoxProps> = props => (
  <Box
    maxWidth="1200px"
    minWidth="320px"
    p={3}
    mx="auto"
    width="100%"
    {...props}
  />
);

export const Layout: React.FC<BoxProps> = props => (
  <Box minHeight="100vh" {...props} />
);
