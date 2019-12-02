import { Box, BoxProps } from './box';

interface AvatarProps extends BoxProps {
  name: string;
  size?: number;
}

export const Avatar: React.FC<AvatarProps> = ({ name, size, ...props }) => {
  return (
    <Box
      borderStyle="solid"
      borderColor="black"
      borderWidth={1}
      backgroundColor="primary"
      color="secondary"
      width={`${size}px`}
      height={`${size}px`}
      display="flex"
      alignItems="center"
      justifyContent="center"
      fontWeight="bold"
      fontSize={3}
      css={{ userSelect: 'none' }}
      {...props}
    >
      {name?.toUpperCase()[0] ?? '?'}
    </Box>
  );
};

Avatar.defaultProps = {
  size: 32
};
