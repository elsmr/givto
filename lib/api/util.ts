import { ObjectID } from 'mongodb';

export const ObjectIDMapper = {
  toString: (objectId: ObjectID) => objectId.toHexString(),
  fromString: (objectId: string) => new ObjectID(objectId)
};
