import { getThemeColor, getThemeScale, getThemeValue } from '@givto/utils';
import React, { HTMLAttributes } from 'react';
import styled from 'styled-components';

const transform = `transform: translate(8px, 8px)`;

const ButtonForeground = styled.div`
  background: ${getThemeColor('primary')};
  border: ${getThemeScale('borderWidths')}px solid black;
  padding: ${getThemeScale('space', 1)}px ${getThemeScale('space', 2)}px;
  color: ${getThemeColor('white')};
  font-size: ${getThemeScale('fontSizes', 2)}px;
  font-weight: ${getThemeScale('fontWeights', 1)};
  transition: transform ${getThemeScale('transitionDurations')}s
    ${getThemeValue('transitionTiming')};
  will-change: transform;
`;

const ButtonBackground = styled.div`
  background: ${getThemeColor('secondary')};
  border: ${getThemeScale('borderWidths')}px solid black;
  position: absolute;
  width: calc(100% - ${getThemeScale('space', 1)}px);
  height: calc(100% - ${getThemeScale('space', 1)}px);
  top: ${getThemeScale('space', 1)}px;
  left: ${getThemeScale('space', 1)}px;
`;

const PlainButton = styled.button`
  display: inline-block;
  cursor: pointer;
  text-decoration: none;
  -webkit-tap-highlight-color: transparent;
  border: 1px solid red;
  min-width: 200px;
  text-align: left;
  outline: none;
  border: none;
  position: relative;
  background: transparent;
  margin: 0;
  padding: 0 ${getThemeScale('space', 1)}px ${getThemeScale('space', 1)}px 0;

  &:hover ${ButtonForeground} {
    ${transform};
  }

  &:focus ${ButtonForeground} {
    ${transform};
    outline: ${getThemeColor('secondary')} solid
      ${getThemeScale('borderWidths')}px;
  }

  &:active ${ButtonForeground} {
    outline: ${getThemeColor('secondary')} solid
      ${getThemeScale('borderWidths')}px;
    ${transform};
  }
`;

interface ButtonProps
  extends HTMLAttributes<HTMLButtonElement | HTMLAnchorElement> {
  as?: keyof JSX.IntrinsicElements;
}

export const Button: React.FC<ButtonProps> = ({ children, ...props }) => {
  return (
    <PlainButton {...props}>
      <ButtonBackground></ButtonBackground>
      <ButtonForeground>{children}</ButtonForeground>
    </PlainButton>
  );
};
