import TinyPopover, { PopoverProps } from 'react-tiny-popover';
import { Box } from './box';

export const Popover: React.FC<PopoverProps> = ({
  children,
  content,
  ...props
}) => {
  return (
    <TinyPopover position="bottom" content={<Box>{content}</Box>} {...props}>
      {children}
    </TinyPopover>
  );
};
