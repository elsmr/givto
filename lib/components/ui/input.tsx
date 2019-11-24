import css from '@styled-system/css';
import { forwardRef, InputHTMLAttributes } from 'react';
import { Box, BoxProps } from './box';

export const Input: React.FC<BoxProps &
  InputHTMLAttributes<HTMLInputElement>> = forwardRef((props, ref) => (
  <Box
    ref={ref}
    as="input"
    p={2}
    type="text"
    borderColor="black"
    {...props}
    css={css({
      display: 'block',
      width: '100%',
      appearance: 'none',
      fontSize: 'inherit',
      lineHeight: 'inherit',
      border: '2px solid',
      borderRadius: 'default',
      color: 'inherit',
      bg: 'transparent',
      '&:focus': {
        outline: '1px solid white'
      }
    })}
  />
));
