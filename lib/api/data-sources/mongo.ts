import { DataSource, DataSourceConfig } from 'apollo-datasource';
import { Collection, Db, MongoClient, MongoError, ObjectID } from 'mongodb';
import uuid from 'uuid/v4';
import { GivtoContext, UserInput } from '../graphql-schema';

interface MongoEntity {
  _id: ObjectID;
}

export interface MongoGroup extends MongoEntity {
  slug: string;
  name: string;
  creator: ObjectID;
  options: {};
  users: ObjectID[];
}

export interface MongoUser extends MongoEntity {
  name: string;
  email: string;
  groups: ObjectID[];
}

export interface MongoInvite extends MongoEntity {
  code: string;
  invitee: string;
  group: string;
  exp: number;
}

export interface MongoLoginCode extends MongoEntity {
  code: string;
  email: string;
  exp: number;
}

let connectionPromise: Promise<MongoClient> | null = null;
let db: Db | null = null;

export const getMongoDb = async (uri: string, dbName: string): Promise<Db> => {
  if (db) {
    return db;
  }

  if (!connectionPromise) {
    connectionPromise = new MongoClient(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    }).connect();
  }

  const client = await connectionPromise;
  db = client.db(dbName);
  return db;
};

export class MongoDataSource<T extends MongoEntity> extends DataSource<
  GivtoContext
> {
  protected collection!: Collection<T>;
  private collectionName: string;

  constructor(collectionName: string) {
    super();
    this.collectionName = collectionName;
  }

  initialize({ context: { db } }: DataSourceConfig<GivtoContext>): void {
    this.collection = db.collection(this.collectionName);
  }
}

export class MongoUsers extends MongoDataSource<MongoUser> {
  findByIds = (ids: string[]): Promise<MongoUser[]> => {
    const objectIds = ids.map(id => new ObjectID(id));
    return this.collection.find({ _id: { $in: objectIds } }).toArray();
  };

  findByEmail = (email: string): Promise<MongoUser | null> => {
    return this.collection.findOne({ email });
  };

  findById = (id: string): Promise<MongoUser | null> => {
    return this.collection.findOne({ _id: new ObjectID(id) });
  };

  createUsers = async (...users: UserInput[]): Promise<MongoUser[]> => {
    try {
      await this.collection.insertMany(
        users.map(user => ({ ...user, groups: [] })),
        { ordered: false }
      );
    } catch (error) {
      if ((error as MongoError).code === 11000) {
        // Some users already exist, no problem!
      } else {
        console.error(error);
      }
    }

    const result = await this.collection.find({
      email: { $in: users.map(user => user.email) }
    });

    return result.toArray();
  };

  addGroupToUsers = async (
    userIds: ObjectID[],
    groupId: ObjectID
  ): Promise<boolean> => {
    const result = await this.collection.updateMany(
      { _id: { $in: userIds } },
      { $push: { groups: groupId } }
    );

    return result.modifiedCount === userIds.length;
  };
}

export class MongoGroups extends MongoDataSource<MongoGroup> {
  createGroup = async ({
    slug,
    users,
    creator
  }: Pick<
    MongoGroup,
    'slug' | 'users' | 'creator'
  >): Promise<MongoGroup | null> => {
    await this.collection.insertOne({
      name: '',
      creator,
      slug,
      options: {},
      users
    });

    return this.findBySlug(slug);
  };

  findByIds = (ids: string[]): Promise<MongoGroup[]> => {
    const objectIds = ids.map(id => new ObjectID(id));
    return this.collection.find({ _id: { $in: objectIds } }).toArray();
  };

  findBySlug = (slug: string): Promise<MongoGroup | null> => {
    return this.collection.findOne({ slug });
  };

  hasSlug = (slug: string): Promise<boolean> => {
    return this.findBySlug(slug).then(Boolean);
  };
}

export class MongoInvites extends MongoDataSource<MongoInvite> {
  DAY_MS = 86400000;

  create = async (inviteeId: string, groupId: string): Promise<string> => {
    const code = uuid();
    await this.collection.insertOne({
      code,
      invitee: inviteeId,
      group: groupId,
      exp: Date.now() + 7 * this.DAY_MS
    });

    return code;
  };

  findByCode = (code: string): Promise<MongoInvite | null> => {
    return this.collection.findOne({ code });
  };
}

export class MongoLoginCodes extends MongoDataSource<MongoLoginCode> {
  MINUTE_MS = 60000;

  create = async (email: string): Promise<string> => {
    const code = uuid();
    await this.collection.insertOne({
      code,
      email,
      exp: Date.now() + 15 * this.MINUTE_MS
    });
    return code;
  };

  findByCode = (code: string): Promise<MongoLoginCode | null> => {
    return this.collection.findOne({ code });
  };
}
