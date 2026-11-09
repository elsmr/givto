import { useTRPC } from '@/lib/client/trpc';
import { useQuery } from '@tanstack/react-query';

export const useMe = (enabled: boolean) => useQuery({ ...useTRPC().me.get.queryOptions(), enabled });
