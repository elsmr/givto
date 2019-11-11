import React, { HTMLAttributes } from 'react';
import styled from 'styled-components';
import { theme } from 'styled-tools';

const transform = `transform: translate(8px, 8px)`;

const ButtonForeground = styled.div`
  background: ${theme('colors.primary')};
  border: ${theme('borderWidths.0')}px solid black;
  padding: ${theme('space.1')}px ${theme('space.2')}px;
  color: ${theme('colors.white')};
  font-size: ${theme('fontSizes.2')}px;
  font-weight: ${theme('fontWeights.1')};
  transition: transform ${theme('transitionDurations.0')}s
    ${theme('transitionTiming')};
  will-change: transform;
`;

const ButtonBackground = styled.div`
  background: ${theme('colors.secondary')};
  border: ${theme('borderWidths.0')}px solid black;
  position: absolute;
  width: calc(100% - ${theme('space.1')}px);
  height: calc(100% - ${theme('space.1')}px);
  top: ${theme('space.1')}px;
  left: ${theme('space.1')}px;
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
  padding: 0 ${theme('space.1')}px ${theme('space.1')}px 0;

  &:hover ${ButtonForeground} {
    ${transform};
  }

  &:focus ${ButtonForeground} {
    ${transform};
    outline: ${theme('colors.secondary')} solid ${theme('borderWidths.0')}px;
  }

  &:active ${ButtonForeground} {
    outline: ${theme('colors.secondary')} solid ${theme('borderWidths.0')}px;
    ${transform};
  }
`;

interface ButtonProps extends HTMLAttributes<HTMLButtonElement> {
  as?: keyof JSX.IntrinsicElements;
  href?: string;
}

export const Button: React.FC<ButtonProps> = ({ children, ...props }) => {
  return (
    <PlainButton {...props}>
      <ButtonBackground></ButtonBackground>
      <ButtonForeground>{children}</ButtonForeground>
    </PlainButton>
  );
};
