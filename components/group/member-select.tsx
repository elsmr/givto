import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import type { GroupMember } from './group-data';

type MemberSelectProps = {
  id: string;
  label: string;
  placeholder: string;
  members: GroupMember[];
  value: string;
  onChange: (memberId: string) => void;
};

export const MemberSelect = ({ id, label, placeholder, members, value, onChange }: MemberSelectProps) => (
  <NativeSelect id={id} aria-label={label} value={value} onChange={(event) => onChange(event.target.value)}>
    <NativeSelectOption value="">{placeholder}</NativeSelectOption>
    {members.map((member) => (
      <NativeSelectOption key={member.id} value={member.id}>
        {member.name}
      </NativeSelectOption>
    ))}
  </NativeSelect>
);
