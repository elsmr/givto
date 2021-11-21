import { DataSource, DataSourceConfig } from 'apollo-datasource';
import { Collection, Db, MongoClient, MongoError, ObjectID } from 'mongodb';
import ms from 'ms';
import { nanoid } from 'nanoid';
import { GivtoContext, UserInput } from '../graphql-schema';
import { randomString } from '../util/random-string.util';

interface MongoEntity {
  _id: ObjectID;
}

export interface WishListItemInput {
  title: string;
  description: string;
}

export interface WishListItem {
  id: string;
  title: string;
  description: string;
}

export interface MongoGroup extends MongoEntity {
  slug: string;
  name: string;
  creator: ObjectID;
  options: {};
  users: ObjectID[];
  createdAt: number;
  assignedAt: number | null;
  assignments: Record<string, string>;
  wishlists: Record<string, WishListItem[]>;
  assignExceptions: Record<string, string[]>;
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
  userId: ObjectID;
  exp: number;
  redirectUrl: string | null;
}

export interface MongoRefreshToken extends MongoEntity {
  token: string;
  userId: ObjectID;
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
      useUnifiedTopology: true,
    }).connect();
  }

  const client = await connectionPromise;
  db = client.db(dbName);
  return db;
};

export class MongoDataSource<
  T extends MongoEntity
> extends DataSource<GivtoContext> {
  protected collection!: Collection<T>;
  private collectionName: string;

  constructor(collectionName: string) {
    super();
    this.collectionName = collectionName;
  }

  initialize({
    context: { db },
  }: Pick<DataSourceConfig<Pick<GivtoContext, 'db'>>, 'context'>): void {
    this.collection = db.collection(this.collectionName);
  }

  findById = (id: string): Promise<T | null> => {
    return this.collection.findOne({ _id: new ObjectID(id) as any });
  };

  findByIds = (ids: string[]): Promise<T[]> => {
    const objectIds = ids.map((id) => new ObjectID(id));
    return this.collection
      .find({ _id: { $in: objectIds } } as any)
      .sort({ createdAt: -1 })
      .toArray();
  };
}

export class MongoUsers extends MongoDataSource<MongoUser> {
  constructor() {
    super('users');
  }

  findByEmail = (email: string): Promise<MongoUser | null> => {
    return this.collection.findOne({ email });
  };

  createUsers = async (...users: UserInput[]): Promise<MongoUser[]> => {
    console.log('creating users', users);
    try {
      await this.collection.insertMany(
        users.map((user) => ({ ...user, groups: [] })),
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
      email: { $in: users.map((user) => user.email) },
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

  updateByEmail = async (
    email: string,
    update: Partial<MongoUser>
  ): Promise<MongoUser | undefined> => {
    const user = await this.collection.findOneAndUpdate(
      { email },
      { $set: update },
      { returnOriginal: false }
    );
    return user.value;
  };
}

export class MongoGroups extends MongoDataSource<MongoGroup> {
  constructor() {
    super('groups');
  }

  createGroup = async ({
    slug,
    users,
    creator,
    assignments,
  }: Pick<
    MongoGroup,
    'slug' | 'users' | 'creator' | 'assignments'
  >): Promise<MongoGroup | null> => {
    await this.collection.insertOne({
      name: '',
      creator,
      slug,
      options: {},
      users,
      createdAt: Date.now(),
      assignedAt: Date.now(),
      assignments,
      wishlists: {},
      assignExceptions: {},
    });

    return this.findBySlug(slug);
  };

  findBySlug = (slug: string): Promise<MongoGroup | null> => {
    return this.collection.findOne({ slug });
  };

  hasSlug = (slug: string): Promise<boolean> => {
    return this.findBySlug(slug).then(Boolean);
  };

  updateBySlug = async (
    slug: string,
    update: Partial<MongoGroup>
  ): Promise<MongoGroup | undefined> => {
    const group = await this.collection.findOneAndUpdate(
      { slug },
      { $set: update },
      { returnOriginal: false }
    );
    return group.value;
  };

  addWishlistItem = async (
    slug: string,
    userId: string,
    item: WishListItemInput
  ): Promise<WishListItem[] | undefined> => {
    const group = await this.collection.findOneAndUpdate(
      { slug },
      { $push: { [`wishlists.${userId}`]: { ...item, id: nanoid() } } },
      { returnOriginal: false }
    );
    return group.value?.wishlists?.[userId];
  };

  deleteWishlistItem = async (
    slug: string,
    userId: string,
    itemId: string
  ): Promise<WishListItem[] | undefined> => {
    const group = await this.collection.findOneAndUpdate(
      { slug },
      { $pull: { [`wishlists.${userId}`]: { id: itemId } } }
    );
    return group.value?.wishlists?.[userId];
  };

  editWishlistItem = async (
    slug: string,
    userId: string,
    itemId: string,
    update: Partial<WishListItem>
  ): Promise<WishListItem[] | undefined> => {
    const group = await this.collection.findOne(
      { slug },
      { projection: { [`wishlists.${userId}`]: 1 } }
    );
    const wishlist = group?.wishlists?.[userId]!;
    const srcItem = wishlist.find((item) => item.id === itemId)!;
    const newItem = { ...srcItem, ...update };
    await this.collection.findOneAndUpdate(
      { slug },
      {
        $set: {
          [`wishlists.${userId}`]: wishlist.map((item) =>
            item.id === itemId ? newItem : item
          ),
        },
      }
    );
    return wishlist;
  };

  reorderWishlistItem = async (
    slug: string,
    userId: string,
    itemId: string,
    destinationIndex: number
  ): Promise<WishListItem[] | undefined> => {
    const group = await this.collection.findOne(
      { slug },
      { projection: { [`wishlists.${userId}`]: 1 } }
    );
    const wishlist = group?.wishlists?.[userId];
    const srcIndex = wishlist?.findIndex((item) => item.id === itemId)!;
    const [srcItem] = wishlist?.splice(srcIndex, 1)!;
    wishlist?.splice(destinationIndex, 0, srcItem);
    await this.collection.findOneAndUpdate(
      { slug },
      { $set: { [`wishlists.${userId}`]: wishlist } },
      { returnOriginal: false }
    );

    return wishlist;
  };

  addUsersToGroup = async (
    slug: string,
    userIds: ObjectID[]
  ): Promise<MongoGroup | undefined> => {
    const group = await this.collection.findOneAndUpdate(
      { slug },
      { $push: { users: { $each: userIds } } },
      { returnOriginal: false }
    );
    return group.value;
  };
}

export class MongoLoginCodes extends MongoDataSource<MongoLoginCode> {
  constructor() {
    super('loginCodes');
  }

  create = async (
    id: ObjectID,
    redirectUrl: string = '',
    isInvite = false
  ): Promise<string> => {
    const code = randomString(isInvite ? 21 : 8);
    await this.collection.insertOne({
      code,
      userId: id,
      exp: Date.now() + ms(isInvite ? '3d' : '15m'),
      redirectUrl,
    });
    return code;
  };

  deleteAllByUser = (userId: ObjectID): Promise<boolean> => {
    return this.collection
      .deleteMany({ userId })
      .then((result) =>
        Boolean(result.deletedCount && result.deletedCount > 0)
      );
  };

  findByCode = (code: string): Promise<MongoLoginCode | null> => {
    return this.collection.findOne({ code });
  };
}

export class MongoRefreshTokens extends MongoDataSource<MongoRefreshToken> {
  constructor() {
    super('refreshTokens');
  }

  create = async (userId: ObjectID): Promise<MongoRefreshToken> => {
    const token = randomString();
    const tokenObj = {
      token,
      userId,
      exp: Date.now() + ms('30d'),
    };
    const result = await this.collection.insertOne(tokenObj);
    return { ...tokenObj, _id: result.insertedId };
  };

  findByToken = (token: string): Promise<MongoRefreshToken | null> => {
    return this.collection.findOne({ token });
  };

  deleteAllByUser = (userId: ObjectID): Promise<boolean> => {
    return this.collection
      .deleteMany({ userId: userId })
      .then((result) =>
        Boolean(result.deletedCount && result.deletedCount > 0)
      );
  };
}
