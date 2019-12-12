import css from '@styled-system/css';
import React from 'react';
import { BoxProps } from './box';
import { ButtonReset } from './button';

interface IconButtonProps extends BoxProps {
  size?: 'small' | 'medium';
}

const sizeToProps: Record<string, BoxProps> = {
  small: {
    p: 1,
    fontSize: 1
  },
  medium: {
    py: 1,
    px: 2,
    fontSize: 2
  }
};

export const IconButton: React.FC<IconButtonProps> = React.forwardRef(
  ({ children, size, ...props }, ref) => {
    return (
      <ButtonReset
        borderStyle="solid"
        borderWidth={1}
        borderColor="black"
        bg="primary"
        color="white"
        display="flex"
        alignItems="center"
        flexShrink={0}
        {...sizeToProps[size as string]}
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
  }
);

IconButton.defaultProps = {
  size: 'medium'
};
