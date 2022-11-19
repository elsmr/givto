import css from '@styled-system/css';
import React from 'react';
import { BoxProps } from './box';
import { ButtonReset } from './button';

interface IconButtonProps extends BoxProps {
  size?: 'small' | 'medium';
}

const sizeToProps: Record<string, BoxProps> = {
  small: {
    py: 2,
    px: 3,
    fontSize: 1,
  },
  medium: {
    py: 2,
    px: 3,
    fontSize: 2,
  },
};

export const IconButton: React.FC<IconButtonProps> = React.forwardRef(
  ({ children, size, ...props }, ref) => {
    return (
      <ButtonReset
        bg="primary"
        color="white"
        display="flex"
        borderRadius={4}
        alignItems="center"
        flexShrink={0}
        {...sizeToProps[size as string]}
        css={css({
          '&:focus': {
            outline: 'primary',
          },
        })}
        {...props}
      >
        {children}
      </ButtonReset>
    );
  }
);

IconButton.defaultProps = {
  size: 'medium',
};
