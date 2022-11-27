import css from '@styled-system/css';
import React from 'react';
import { ChevronDown } from 'react-feather';
import { Box, BoxProps } from './box';

export const Select: React.FC<BoxProps> = React.forwardRef(
  ({ children, ...props }, ref) => (
    <Box display="inline-block" position="relative">
      <Box
        as="select"
        bg="muted"
        textAlign="left"
        p={2}
        pr={4}
        borderColor="transparent"
        borderWidth={1}
        borderRadius={4}
        m={0}
        css={css({
          textDecoration: 'none',
          outline: 'none',
          appearance: 'none',
          '&:focus': {
            borderColor: 'primary',
          },
        })}
        ref={ref}
        {...props}
      >
        {children}
      </Box>
      <Box
        position="absolute"
        right={2}
        top="50%"
        height="16px"
        css={css({ transform: 'translateY(-50%)', pointerEvents: 'none' })}
      >
        <ChevronDown size={16} />
      </Box>
    </Box>
  )
);
