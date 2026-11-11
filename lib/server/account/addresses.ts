import { ObjectId } from 'mongodb';
import type { Member } from '../../schema/member';
import type { SavedAddress, User } from '../../schema/user';
import type { Collections } from '../db';

/** The address a group posts to (80): the member's pick while it's still in the address book, else the default. */
export const groupAddress = (user: Pick<User, 'addresses' | 'defaultAddressId'> | null, addressId: string | undefined): SavedAddress | null => {
  const addresses = user?.addresses ?? [];
  return addresses.find((a) => a.id === addressId) ?? addresses.find((a) => a.id === user?.defaultAddressId) ?? null;
};

/** The user ids of these members whose account has an address, in one lookup. Never an address. */
export const userIdsWithAddress = async (db: Collections, members: Member[]) => {
  const ids = members.flatMap((member) => (member.userId ? [new ObjectId(member.userId)] : []));
  const users = await db.users.find({ _id: { $in: ids }, 'addresses.0': { $exists: true } }, { projection: { _id: 1 } }).toArray();
  return new Set(users.map((user) => user._id.toHexString()));
};
