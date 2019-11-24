import styled from '@emotion/styled';
import React from 'react';
import { Theme } from '../../theme';
import { Box, BoxProps } from './box';

const ButtonForeground = styled(Box)`
  transition: transform 0.3s cubic-bezier(0.075, 0.82, 0.165, 1);
  will-change: transform;
`;

const ButtonBackground = styled(Box)``;

const PlainButton = styled(Box)`
  display: inline-block;
  cursor: pointer;
  text-decoration: none;
  -webkit-tap-highlight-color: transparent;
  text-align: left;
  outline: none;
  border: none;
  background: transparent;

  &:hover
    ${ButtonForeground},
    &:active
    ${ButtonForeground},
    &:focus
    ${ButtonForeground} {
    transform: translate(8px, 8px);
  }

  &:focus ${ButtonForeground} {
    outline: 2px solid ${props => (props.theme as Theme).colors.secondary};
  }
`;

interface ButtonProps extends BoxProps {
  variant?: 'primary' | 'secondary';
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant,
  ...props
}) => {
  const isPrimary = variant === 'primary';
  return (
    <PlainButton
      as="button"
      m={0}
      p={0}
      paddingBottom={2}
      paddingRight={2}
      minWidth="200px"
      position="relative"
      {...props}
    >
      <ButtonBackground
        position="absolute"
        top={2}
        left={2}
        borderWidth={1}
        borderStyle="solid"
        borderColor="black"
        width="calc(100% - 8px)"
        height="calc(100% - 8px)"
        bg="secondary"
      ></ButtonBackground>
      <ButtonForeground
        px={2}
        py={1}
        width="100%"
        fontSize={3}
        borderWidth={1}
        borderStyle="solid"
        borderColor="black"
        bg={isPrimary ? 'primary' : 'white'}
        color={isPrimary ? 'white' : 'black'}
      >
        {children}
      </ButtonForeground>
    </PlainButton>
  );
};

Button.defaultProps = { variant: 'primary', size: 'medium' };
