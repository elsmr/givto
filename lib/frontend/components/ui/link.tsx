import styled from '@emotion/styled';
import { AnchorHTMLAttributes, forwardRef } from 'react';
import { Box, BoxProps } from './box';

const StyledLink = styled(Box)`
  text-decoration: underline;
`;

export const Link: React.FC<BoxProps &
  AnchorHTMLAttributes<HTMLAnchorElement>> = forwardRef((props, ref) => (
  <StyledLink as="a" color="primary" ref={ref} {...props} />
));
