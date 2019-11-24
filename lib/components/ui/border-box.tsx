import { Box, BoxProps } from './box';

export const BorderBox: React.FC<BoxProps> = ({ children, ...props }) => {
  return (
    <Box position="relative">
      <Box
        borderColor="black"
        borderWidth={1}
        borderStyle="solid"
        bg="white"
        p={2}
        height="100%"
        width="100%"
        {...props}
      >
        {children}
      </Box>
      <Box
        position="absolute"
        borderWidth={1}
        borderStyle="solid"
        borderColor="black"
        bg="primary"
        zIndex={-1}
        left={2}
        top={2}
        width="100%"
        height="100%"
      />
    </Box>
  );
};
