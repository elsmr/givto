import { useTranslations } from 'next-intl';
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
  const t = useTranslations('input');
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
        borderColor="primary"
        borderTopLeftRadius={8}
        borderTopRightRadius={8}
        borderStyle="solid"
        borderWidth={1}
        fontSize={1}
        borderBottom="none"
      >
        {label} {isOptional && ` (${t('optional')})`}
      </Box>
      {children}
    </Box>
  );
};
