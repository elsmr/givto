import { unsubscribeCategories, type UnsubscribeCategory } from '@/emails/ui/categories';
import { useMutation } from '@tanstack/react-query';

/** The category is readable in the token (`<userId>.<category>.<signature>`); the server checks the signature. */
export const categoryOf = (token: string): UnsubscribeCategory | null => {
  const category = token.split('.')[1];
  return unsubscribeCategories.find((known) => known === category) ?? null;
};

/** Same endpoint as the one-click List-Unsubscribe header. */
export const useUnsubscribe = (token: string) =>
  useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/unsubscribe?t=${encodeURIComponent(token)}`, { method: 'POST' });
      if (!response.ok) throw new Error(`Unsubscribe failed: ${response.status}`);
    },
  });
