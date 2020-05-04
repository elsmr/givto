import { Box, BoxProps } from './box';

interface AvatarProps extends BoxProps {
  name: string;
  prefix?: string;
  size?: number;
}

export const Avatar: React.FC<AvatarProps> = ({
  name,
  size,
  prefix,
  ...props
}) => {
  return (
    <Box
      borderStyle="solid"
      borderColor="black"
      borderWidth={1}
      backgroundColor="primary"
      borderRadius="50% "
      color="secondary"
      width={`${size}px`}
      height={`${size}px`}
      display="flex"
      alignItems="center"
      justifyContent="center"
      fontWeight="bold"
      fontSize={2}
      css={{ userSelect: 'none' }}
      {...props}
    >
      {prefix}
      {name?.toUpperCase()[0] ?? '?'}
    </Box>
  );
};

Avatar.defaultProps = {
  size: 32,
};
