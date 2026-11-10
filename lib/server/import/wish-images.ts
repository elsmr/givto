import { randomBytes } from 'node:crypto';
import { GridFSBucket, ObjectId } from 'mongodb';
import { getMongoDb } from '../db';

/**
 * Imported wish images (39): downloaded once and kept in MongoDB GridFS (`wishImages`
 * bucket), served by /api/wish-images/[id]. Works the same locally and on Vercel + Atlas,
 * no extra storage service. The id is 12 random bytes, so the URL can't be guessed.
 */
const bucket = () => new GridFSBucket(getMongoDb(), { bucketName: 'wishImages' });

const startsWith = (body: Buffer, bytes: number[], offset = 0) => bytes.every((byte, i) => body[offset + i] === byte);
const ascii = (body: Buffer, start: number, end: number) => body.subarray(start, end).toString('latin1');

/** The image type from its first bytes, not from the server's header. */
export const sniffImageType = (body: Buffer): string | null => {
  if (startsWith(body, [0xff, 0xd8, 0xff])) return 'image/jpeg';
  if (startsWith(body, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return 'image/png';
  if (/^GIF8[79]a$/.test(ascii(body, 0, 6))) return 'image/gif';
  if (ascii(body, 0, 4) === 'RIFF' && ascii(body, 8, 12) === 'WEBP') return 'image/webp';
  if (ascii(body, 4, 8) === 'ftyp' && /^avi[fs]$/.test(ascii(body, 8, 12))) return 'image/avif';
  return null;
};

export const storeWishImage = async (body: Buffer, contentType: string, ownerId: string): Promise<string> => {
  const id = new ObjectId(randomBytes(12));
  await new Promise<void>((resolve, reject) => {
    bucket()
      .openUploadStreamWithId(id, 'wish-image', { metadata: { ownerId, contentType } })
      .on('finish', () => resolve())
      .on('error', reject)
      .end(body);
  });
  return id.toHexString();
};

export interface WishImageFile {
  _id: ObjectId;
  length: number;
  metadata: { ownerId: string; contentType: string };
}

export const findWishImage = async (id: string): Promise<WishImageFile | null> => {
  if (!ObjectId.isValid(id)) return null;
  return getMongoDb().collection<WishImageFile>('wishImages.files').findOne({ _id: new ObjectId(id) });
};

export const openWishImage = (id: string) => bucket().openDownloadStream(new ObjectId(id));

/** Every image this person imported, on a wish or not (account deletion, 55). */
export const deleteWishImagesOf = async (ownerId: string): Promise<void> => {
  const files = await getMongoDb()
    .collection<WishImageFile>('wishImages.files')
    .find({ 'metadata.ownerId': ownerId }, { projection: { _id: 1 } })
    .toArray();
  await Promise.all(files.map((file) => deleteWishImage(file._id.toHexString())));
};

/** Best effort: a leftover file only costs storage. */
export const deleteWishImage = async (id: string): Promise<void> => {
  await bucket()
    .delete(new ObjectId(id))
    .catch(() => undefined);
};
