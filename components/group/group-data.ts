import type { RouterOutputs } from '@/lib/client/trpc';

export type GroupData = RouterOutputs['group']['get'];
export type GroupMember = GroupData['members'][number];
export type GroupEdition = NonNullable<GroupData['edition']>;
