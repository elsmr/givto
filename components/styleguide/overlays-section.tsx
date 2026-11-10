import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverTitle,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { StyleguideRow, StyleguideSection } from './styleguide-section';

export const OverlaysSection = () => (
  <StyleguideSection
    id="overlays"
    title="Dialog, popover, menu and tooltip"
    description="Dialog to confirm what can't be undone; popover for a short explanation; menu for a few actions on one item; tooltip only for a hint on hover or focus."
  >
    <StyleguideRow label="Overlays">
      <Dialog>
        <DialogTrigger render={<Button variant="neutral" />}>
          Open dialog
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Draw names now?</DialogTitle>
            <DialogDescription>
              Everyone gets an email that their giftee is ready. You can&apos;t
              undo this.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="neutral" />}>
              Not yet
            </DialogClose>
            <DialogClose render={<Button />}>Draw names</DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Popover>
        <PopoverTrigger render={<Button variant="neutral" />}>
          Open popover
        </PopoverTrigger>
        <PopoverContent>
          <PopoverTitle>What&apos;s a giftee?</PopoverTitle>
          <PopoverDescription>
            The person you buy a gift for.
          </PopoverDescription>
        </PopoverContent>
      </Popover>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="neutral" />}>
          Open menu
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem>Edit wish</DropdownMenuItem>
          <DropdownMenuItem>Move up</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled>Delete (disabled)</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Tooltip>
        <TooltipTrigger render={<Button variant="neutral" />}>
          Hover or focus me
        </TooltipTrigger>
        <TooltipContent>Only the organizer can draw names</TooltipContent>
      </Tooltip>
    </StyleguideRow>
  </StyleguideSection>
);
