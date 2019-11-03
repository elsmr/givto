import { Color, getThemeColor, getThemeScale } from '@givto/utils';
import { HTMLAttributes } from 'react';
import styled from 'styled-components';

interface BoxProps extends HTMLAttributes<HTMLDivElement> {
  color?: Color;
  bg?: Color;
}

export const Box = styled.div<BoxProps>`
  background: ${({ color, theme }) =>
    getThemeColor(color || 'white')({ theme })};
  border: ${getThemeScale('borderWidths')}px solid black;
  padding: ${getThemeScale('space', 2)}px;
  position: relative;
  margin: 0 ${getThemeScale('space', 1)}px ${getThemeScale('space', 1)}px 0;

  &:after {
    content: '';
    background: ${({ bg, theme }) => getThemeColor(bg || 'primary')({ theme })};
    border: ${getThemeScale('borderWidths')}px solid black;
    position: absolute;
    z-index: -1;
    top: ${getThemeScale('space', 1)}px;
    left: ${getThemeScale('space', 1)}px;
    width: 100%;
    height: 100%;
  }
`;
