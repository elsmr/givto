import css from '@styled-system/css';
import { forwardRef, InputHTMLAttributes } from 'react';
import { Box, BoxProps } from './box';

export type InputProps = BoxProps & InputHTMLAttributes<HTMLInputElement>;

export const Input: React.FC<InputProps> = forwardRef((props, ref) => (
  <Box
    ref={ref}
    as="input"
    p={2}
    type="text"
    color="inherit"
    bg="transparent"
    css={css({
      display: 'block',
      width: '100%',
      appearance: 'none',
      fontSize: 'inherit',
      lineHeight: 'inherit',
      border: '2px solid',
      borderRadius: 'default',
      borderColor: props.borderColor || 'black',
      boxShadow: 'none',
      outline: 'none',
      '&:focus': {
        borderColor: 'primary'
      },
      '::placeholder': {
        textOverflow: 'ellipsis',
        color: 'textMuted'
      }
    })}
    {...props}
  />
));

Input.defaultProps = {
  hasSubmitted: true
};
