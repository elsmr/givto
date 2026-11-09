import { Theme } from '@givto/frontend/theme';
import { useTheme } from '@emotion/react';
import { ArrowContainer, Popover as TinyPopover } from 'react-tiny-popover';
import React from 'react';
import { Box } from './box';

interface PopoverProps {
  content: React.ReactElement;
  isOpen: boolean;
  children?: React.ReactNode;
}

export const Popover: React.FC<PopoverProps> = ({
  children,
  content,
  isOpen,
}) => {
  const theme = useTheme() as Theme;
  return (
    <TinyPopover
      isOpen={isOpen}
      positions={['bottom']}
      content={({ position, childRect, popoverRect }: any) => (
        <ArrowContainer
          position={position}
          childRect={childRect}
          popoverRect={popoverRect}
          arrowColor={theme.colors.primary}
          arrowSize={8}
        >
          <Box bg="primary" p={2} color="white" fontSize={1}>
            {content}
          </Box>
        </ArrowContainer>
      )}
    >
      {children as any}
    </TinyPopover>
  );
};
