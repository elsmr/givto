/** The list with the item `id` moved to `toIndex` (clamped), as the server's wish.move does. */
export const moveItem = <T extends { id: string }>(list: T[], id: string, toIndex: number): T[] => {
  const item = list.find((entry) => entry.id === id);
  if (!item) return list;
  const rest = list.filter((entry) => entry.id !== id);
  const index = Math.max(0, Math.min(toIndex, rest.length));
  return [...rest.slice(0, index), item, ...rest.slice(index)];
};
