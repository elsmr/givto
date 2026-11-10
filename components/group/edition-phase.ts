import type { EditionStatus } from '@/lib/schema/edition';
import { MIN_PARTICIPANTS } from '@/lib/schema/group';
import type { GroupEdition } from './group-data';

/** The lifecycle as the phase stepper shows it (61): the draw is its own step once enough people are in. */
export const phases = ['join', 'draw', 'shop', 'giftday', 'done'] as const;
export type Phase = (typeof phases)[number];

export const phaseOf = (status: EditionStatus, participantCount: number): Phase => {
  if (status === 'draft') return 'join';
  if (status === 'open') return participantCount >= MIN_PARTICIPANTS ? 'draw' : 'join';
  return status === 'drawn' ? 'shop' : status;
};

export const editionPhase = ({ status, participantIds }: Pick<GroupEdition, 'status' | 'participantIds'>): Phase =>
  phaseOf(status, participantIds.length);

/** Chip colour per edition status, the same everywhere a status shows. */
export const statusTone = {
  draft: 'default',
  open: 'primary-muted',
  drawn: 'yellow',
  giftday: 'coral',
  done: 'default',
} as const satisfies Record<EditionStatus, string>;
