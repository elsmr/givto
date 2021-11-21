import { ObjectId } from 'mongodb';

export const ObjectIDMapper = {
  toString: (objectId: ObjectId) => objectId.toHexString(),
  fromString: (objectId: string) => new ObjectId(objectId),
};
