import css from '@styled-system/css';
import { forwardRef, InputHTMLAttributes } from 'react';
import { Box, BoxProps } from './box';

export type InputProps = BoxProps & InputHTMLAttributes<HTMLInputElement>;

export const Input: React.FC<InputProps> = forwardRef((props, ref) => (
  <Box
    ref={ref}
    as="input"
    m={0}
    p={2}
    type="text"
    color="inherit"
    bg="muted"
    borderColor="muted"
    borderStyle="solid"
    borderWidth={1}
    borderRadius={4}
    css={css({
      display: 'block',
      width: '100%',
      appearance: 'none',
      fontSize: 'inherit',
      lineHeight: 'inherit',
      boxShadow: 'none',
      outline: 'none',
      resize: 'none',
      '&:focus': {
        borderColor: 'primary',
      },
      '::placeholder': {
        textOverflow: 'ellipsis',
        color: 'textMuted',
      },
    })}
    {...props}
  />
));

Input.defaultProps = {
  hasSubmitted: true,
};
