import { Box, BoxProps } from './box';

export const Badge: React.FC<BoxProps> = ({ children, ...props }) => {
  return (
    <Box
      bg="primary"
      color="white"
      display="flex"
      alignItems="center"
      justifyContent="center"
      fontSize={0}
      borderRadius={4}
      lineHeight={1}
      px={2}
      py={1}
      {...props}
    >
      {children}
    </Box>
  );
};
