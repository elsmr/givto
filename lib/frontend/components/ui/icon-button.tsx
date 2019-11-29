import { BoxProps } from './box';
import { ButtonReset } from './button';

export const IconButton: React.FC<BoxProps> = ({ children, ...props }) => {
  return (
    <ButtonReset
      borderStyle="solid"
      borderWidth={1}
      borderColor="black"
      p={2}
      {...props}
    >
      {children}
    </ButtonReset>
  );
};
