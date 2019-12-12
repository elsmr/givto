import React from 'react';
import { Box, BoxProps } from './box';

interface LabeledInputProps extends BoxProps {
  label: string;
  isOptional?: boolean;
  children: JSX.Element;
}

export const InputLabel: React.FC<LabeledInputProps> = ({
  label,
  isOptional,
  children,
  ...props
}) => {
  return (
    <Box
      as="label"
      display="flex"
      flexDirection="column"
      alignItems="flex-start"
      {...props}
    >
      <Box
        as="span"
        bg="primary"
        color="white"
        py={1}
        px={2}
        borderColor="black"
        borderStyle="solid"
        borderWidth={1}
        fontSize={1}
        borderBottom="none"
      >
        {label} {isOptional && ' (optional)'}
      </Box>
      {children}
    </Box>
  );
};
