import css from '@styled-system/css';
import { BoxProps } from './box';
import { ButtonReset } from './button';

export const IconButton: React.FC<BoxProps> = ({ children, ...props }) => {
  return (
    <ButtonReset
      borderStyle="solid"
      borderWidth={1}
      borderColor="black"
      bg="primary"
      color="white"
      display="flex"
      alignItems="center"
      p={1}
      css={css({
        '&:focus': {
          borderColor: 'secondary'
        }
      })}
      {...props}
    >
      {children}
    </ButtonReset>
  );
};
