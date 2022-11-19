import css from '@styled-system/css';
import React from 'react';
import { Box, BoxProps } from './box';
import { ButtonReset } from './button';

interface TabsProps<K extends string = string> extends BoxProps {
  tabs: { id: K; title: string }[];
  selectedTab: K;
  onChange: (id: K) => void;
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  onChange,
  selectedTab,
  ...props
}) => {
  return (
    <Box display="flex" {...props}>
      {tabs.map((tab) => (
        <ButtonReset
          key={tab.id}
          color={selectedTab === tab.id ? 'white' : 'text'}
          bg={selectedTab === tab.id ? 'primary' : 'muted'}
          display="flex"
          px={4}
          py={2}
          mr={2}
          fontSize={2}
          borderRadius={8}
          alignItems="center"
          flexShrink={0}
          onClick={() => onChange(tab.id)}
          css={css({
            '&:focus &:hover': {
              background: 'primaryMuted',
            },
          })}
          {...props}
        >
          {tab.title}
        </ButtonReset>
      ))}
    </Box>
  );
};
