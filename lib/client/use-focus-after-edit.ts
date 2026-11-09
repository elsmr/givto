import { useEffect, useRef } from 'react';

/** Inline edit forms replace their Edit button: put keyboard focus back on it when the form closes (49). */
export const useFocusAfterEdit = (editing: boolean) => {
  const editButton = useRef<HTMLButtonElement>(null);
  const wasEditing = useRef(false);
  useEffect(() => {
    if (wasEditing.current && !editing) editButton.current?.focus();
    wasEditing.current = editing;
  }, [editing]);
  return editButton;
};
