import { Box, BoxProps } from './box';

export const LayoutWrapper: React.FC<BoxProps> = (props) => (
  <Box
    maxWidth="980px"
    minWidth="320px"
    p={[3, 4]}
    mx="auto"
    width="100%"
    {...props}
  />
);

export const Layout: React.FC<BoxProps> = (props) => (
  <Box
    minHeight="100vh"
    display="flex"
    flexDirection="column"
    justifyContent="space-between"
    {...props}
  />
);
