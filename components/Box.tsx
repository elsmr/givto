import { HTMLAttributes } from 'react';
import styled from 'styled-components';
import { prop, theme, withProp } from 'styled-tools';

interface BoxProps extends HTMLAttributes<HTMLDivElement> {
  color?: string;
  bg?: string;
  space?: 1 | 2 | 3 | 4 | 5;
}

export const StyledBox = styled.div<BoxProps>`
  padding: 0 ${withProp('space', space => theme(`space.${space || 1}`))}px
    ${withProp('space', space => theme(`space.${space || 1}`))}px 0;
  position: relative;
`;

export const Foreground = styled.div<BoxProps>`
  background: ${prop('color', theme('colors.white'))};
  border: ${theme('borderWidths.0')}px solid black;
  padding: ${withProp('space', space => theme(`space.${space || 1}`))}px;
  height: 100%;
  width: 100%;
`;

const Background = styled.div`
  background: ${prop('bg', theme('colors.primary'))};
  border: ${theme('borderWidths.0')}px solid black;
  position: absolute;
  z-index: -1;
  top: ${withProp('space', space => theme(`space.${space || 1}`))}px;
  left: ${withProp('space', space => theme(`space.${space || 1}`))}px;
  width: calc(
    100% - ${withProp('space', space => theme(`space.${space || 1}`))}px
  );
  height: calc(
    100% - ${withProp('space', space => theme(`space.${space || 1}`))}px
  );
`;

export const Box: React.FC<BoxProps> = ({ children, ...props }) => {
  return (
    <StyledBox {...props}>
      <Foreground>{children}</Foreground>
      <Background {...props} />
    </StyledBox>
  );
};
