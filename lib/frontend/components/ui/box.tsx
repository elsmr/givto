import styled, { StyledComponent } from '@emotion/styled';
import {
  borders,
  BordersProps,
  color,
  ColorProps,
  flexbox,
  FlexboxProps,
  layout,
  LayoutProps,
  position,
  PositionProps,
  space,
  SpaceProps,
  typography,
  TypographyProps
} from 'styled-system';
import { Theme } from '../../theme';

export type BoxProps = BordersProps &
  SpaceProps &
  PositionProps &
  LayoutProps &
  FlexboxProps &
  ColorProps &
  TypographyProps & { [other: string]: any };

export const Box = styled.div(
  {
    minWidth: 0
  },
  space,
  color,
  layout,
  flexbox,
  position,
  borders,
  typography
) as StyledComponent<BoxProps, { [other: string]: any }, Theme>;
