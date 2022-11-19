import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'react-feather';
import { useHotkeys } from 'react-hotkeys-hook';
import { BorderBox } from './border-box';
import { Box } from './box';
import { ButtonReset } from './button';

export interface ModalProps {
  title: string;
  onClose: () => void;
  children?: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ title, children, onClose }) => {
  if (!typeof window) {
    return null;
  }

  useHotkeys('esc', onClose);

  useEffect(() => {
    document.body.classList.add('modal-open');
    const appWrapper = document.getElementById('app-wrapper');
    if (appWrapper) {
      appWrapper.setAttribute('inert', '');
      appWrapper.setAttribute('aria-hidden', 'true');
    }
    return () => {
      document.body.classList.remove('modal-open');
      if (appWrapper) {
        appWrapper.removeAttribute('inert');
        appWrapper.removeAttribute('aria-hidden');
      }
    };
  });

  return createPortal(
    <Box
      position="fixed"
      top={0}
      bottom={0}
      left={0}
      right={0}
      display="flex"
      alignItems="center"
      justifyContent="center"
      zIndex={3}
    >
      <Box
        bg="rgba(0, 0, 0, 0.5)"
        position="fixed"
        top={0}
        bottom={0}
        left={0}
        right={0}
        onClick={onClose}
      />
      <BorderBox
        role="dialog"
        aria-modal="true"
        aria-label={title}
        bg="white"
        px={4}
        py={3}
        minWidth="320px"
        width="50vw"
        maxWidth="560px"
      >
        <Box
          display="flex"
          alignItems="center"
          justifyContent="space-between"
          marginBottom={3}
        >
          <Box as="h2">{title}</Box>
          <ButtonReset p={1} onClick={onClose}>
            <X />
          </ButtonReset>
        </Box>
        <Box>{children}</Box>
      </BorderBox>
    </Box>,
    document.body
  );
};
