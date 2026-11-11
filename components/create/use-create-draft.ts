import type { ExchangeMode } from '@/lib/schema/group';
import { useEffect, useState } from 'react';

export type CreateDraft = {
  name: string;
  giftDate: string;
  giftTime: string;
  exchangeMode: ExchangeMode;
  currency: string;
  budgetAmount: string;
  budgetMax: string;
  organizerName: string;
  email: string;
};

/** The edition details the create flow and the settings share (gift day, exchange, budget). */
export type EditionDetailsDraft = Pick<
  CreateDraft,
  'giftDate' | 'giftTime' | 'exchangeMode' | 'currency' | 'budgetAmount' | 'budgetMax'
>;

export const emptyDraft: CreateDraft = {
  name: '',
  giftDate: '',
  giftTime: '',
  exchangeMode: 'inPerson',
  currency: 'EUR',
  budgetAmount: '',
  budgetMax: '',
  organizerName: '',
  email: '',
};

const KEY = 'givto:create-draft';

const readDraft = (): CreateDraft | null => {
  try {
    const saved = localStorage.getItem(KEY);
    return saved ? { ...emptyDraft, ...JSON.parse(saved) } : null;
  } catch {
    return null;
  }
};

/**
 * Kept in localStorage so the magic link (which may open in another tab) lands back on /new
 * with everything filled in.
 */
export const useCreateDraft = () => {
  const [draft, setDraft] = useState(emptyDraft);
  const [restored, setRestored] = useState<'pending' | 'empty' | 'saved'>('pending');

  useEffect(() => {
    const saved = readDraft();
    if (saved) setDraft(saved);
    setRestored(saved ? 'saved' : 'empty');
  }, []);

  useEffect(() => {
    if (restored !== 'pending') localStorage.setItem(KEY, JSON.stringify(draft));
  }, [draft, restored]);

  return {
    draft,
    restored,
    update: (patch: Partial<CreateDraft>) => setDraft((current) => ({ ...current, ...patch })),
    clear: () => {
      localStorage.removeItem(KEY);
      setDraft(emptyDraft);
    },
  };
};
