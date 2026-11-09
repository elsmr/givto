import styled from '@emotion/styled';
import { SerializedStyles } from '@emotion/react';
import React from 'react';
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
  TypographyProps,
} from 'styled-system';

export type BoxProps = BordersProps &
  SpaceProps &
  PositionProps &
  LayoutProps &
  FlexboxProps &
  ColorProps &
  TypographyProps & {
    css?: SerializedStyles | any;
    as?: React.ElementType;
    children?: React.ReactNode;
    type?: string;
    onChange?: any;
    onBlur?: any;
    onClick?: any;
    onInput?: any;
    onSubmit?: any;
    ref?: any;
    name?: string;
    value?: any;
    defaultValue?: any;
    placeholder?: string;
    disabled?: boolean;
    required?: boolean;
    autoFocus?: boolean;
    role?: string;
    rows?: number;
    noresize?: boolean;
    'aria-label'?: string;
    'aria-modal'?: string | boolean;
  };

export const Box = styled('div')<BoxProps>`
  min-width: 0;
  ${space}
  ${color}
  ${layout}
  ${flexbox}
  ${position}
  ${borders}
  ${typography}
` as any;
