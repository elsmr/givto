import { AnchorHTMLAttributes, forwardRef } from 'react';
import { Box, BoxProps } from './box';

export const Link: React.FC<BoxProps &
  AnchorHTMLAttributes<HTMLAnchorElement>> = forwardRef(({ ...props }, ref) => (
  <Box
    as="a"
    color="primary"
    ref={ref}
    css={{
      textDecoration: 'underline',
      cursor: 'pointer'
    }}
    {...props}
  />
));
