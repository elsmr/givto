import styled from '@emotion/styled';
import css from '@styled-system/css';
import React from 'react';
import { Theme } from '../../theme';
import { Box, BoxProps } from './box';

const ButtonForeground = styled(Box)`
  transition: transform 0.3s cubic-bezier(0.075, 0.82, 0.165, 1);
  will-change: transform;
`;

export const ButtonReset: React.FC<BoxProps> = React.forwardRef(
  (props, ref) => (
    <Box
      as="button"
      bg="transparent"
      border="none"
      display="inline-block"
      textAlign="left"
      p={0}
      m={0}
      css={css({
        cursor: 'pointer',
        textDecoration: 'none',
        WebkitTapHighlightColor: 'transparent',
        outline: 'none',
        '::-moz-focus-inner': {
          border: 0,
        },
      })}
      ref={ref}
      {...props}
    ></Box>
  )
);

const PlainButton = styled(ButtonReset)`
  &:hover
    ${ButtonForeground},
    &:active
    ${ButtonForeground},
    &:focus
    ${ButtonForeground} {
    transform: translate(4px, 4px);
  }

  &:focus ${ButtonForeground} {
    outline: 2px solid ${(props) => (props.theme as Theme).colors.secondary};
  }
`;

interface ButtonProps extends BoxProps {
  variant?: 'primary' | 'secondary';
}

export const Button: React.FC<ButtonProps> = React.forwardRef(
  ({ children, variant, ...props }, ref) => {
    const isPrimary = variant === 'primary';
    return (
      <PlainButton
        as="button"
        paddingBottom={1}
        paddingRight={1}
        position="relative"
        ref={ref}
        {...props}
      >
        <Box
          position="absolute"
          top={1}
          left={1}
          borderWidth={1}
          borderStyle="solid"
          borderColor="black"
          width="calc(100% - 4px)"
          height="calc(100% - 4px)"
          bg="secondary"
        />
        <ButtonForeground
          px={3}
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
  }
);

Button.defaultProps = { variant: 'primary', size: 'medium' };
