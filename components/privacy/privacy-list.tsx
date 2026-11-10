import type { ReactNode } from 'react';

export const PrivacyList = ({ items }: { items: ReactNode[] }) => (
  <ul className="flex list-disc flex-col gap-3 pl-6 marker:text-primary">
    {items.map((item, index) => (
      <li key={index}>{item}</li>
    ))}
  </ul>
);
