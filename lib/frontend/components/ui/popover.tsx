import { Theme } from '@givto/frontend/theme';
import { useTheme } from 'emotion-theming';
import TinyPopover, { ArrowContainer } from 'react-tiny-popover';
import { Box } from './box';

interface PopoverProps {
  content: JSX.Element;
  isOpen: boolean;
}

export const Popover: React.FC<PopoverProps> = ({
  children,
  content,
  isOpen,
}) => {
  const theme = useTheme<Theme>();
  return (
    <TinyPopover
      isOpen={isOpen}
      position="bottom"
      content={({ position, targetRect, popoverRect }) => (
        <ArrowContainer
          position={position}
          targetRect={targetRect}
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
