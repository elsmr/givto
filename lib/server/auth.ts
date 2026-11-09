import { passkey } from '@better-auth/passkey';
import { betterAuth } from 'better-auth';
import { mongodbAdapter } from 'better-auth/adapters/mongodb';
import { APIError, createAuthMiddleware } from 'better-auth/api';
import { emailOTP } from 'better-auth/plugins/email-otp';
import { magicLink } from 'better-auth/plugins/magic-link';
import { SignInEmail, signInSubject } from '../../emails/sign-in';
import { locales, type Locale } from '../schema/common';
import { getDb, getMongoClient, getMongoDb } from './db';
import { requireEnv } from './env';
import { preferredLocale } from './locale';
import { log, scrub } from './log';
import { sendMail } from './mail';
import { consumeRateLimit } from './rate-limit';

/** Code and link expire after 10 minutes (the email says so). */
const SIGN_IN_EXPIRES_IN = 10 * 60;
/** Per address, on top of Better Auth's per-IP limits. */
const SIGN_IN_EMAILS_PER_ADDRESS = { window: 15 * 60, max: 5 };

// Everything else Better Auth (or a plugin) exposes is a 404 over HTTP: no password, no
// social, no profile updates that would bypass our validation (names go through tRPC).
const HTTP_PATHS = new Set([
  '/sign-in/magic-link',
  '/magic-link/verify',
  '/sign-in/email-otp',
  '/passkey/generate-register-options',
  '/passkey/verify-registration',
  '/passkey/generate-authenticate-options',
  '/passkey/verify-authentication',
  '/passkey/list-user-passkeys',
  '/passkey/delete-passkey',
  '/passkey/update-passkey',
  '/get-session',
  '/sign-out',
  '/list-sessions',
  '/revoke-session',
  '/revoke-sessions',
  '/revoke-other-sessions',
  '/error',
]);

const accountLocale = async (email: string): Promise<Locale | undefined> => {
  const { users } = await getDb();
  const user = await users.findOne({ email }, { projection: { locale: 1 } });
  return user?.locale;
};

const createAuth = () => {
  const baseURL = new URL(requireEnv('BETTER_AUTH_URL'));

  const auth = betterAuth({
    appName: 'Givto',
    baseURL: baseURL.origin,
    secret: requireEnv('BETTER_AUTH_SECRET'),
    database: mongodbAdapter(getMongoDb(), { client: getMongoClient(), usePlural: true }),
    session: { expiresIn: 30 * 24 * 60 * 60, updateAge: 24 * 60 * 60 },
    user: {
      additionalFields: {
        locale: { type: [...locales], required: false, defaultValue: 'en', input: false },
      },
    },
    // Identifiers contain the email (`sign-in-otp-<email>`); store only their hash.
    verification: { storeIdentifier: 'hashed' },
    rateLimit: {
      enabled: true,
      customStorage: { consume: (key, rule) => consumeRateLimit(`auth:${key}`, rule) },
    },
    databaseHooks: {
      user: {
        create: {
          // New accounts start with the browser's language.
          before: async (user, ctx) => ({
            data: { ...user, locale: preferredLocale(ctx?.request?.headers ?? ctx?.headers) },
          }),
        },
      },
    },
    hooks: {
      before: createAuthMiddleware(async (ctx) => {
        if (!ctx.request) return; // server-side auth.api calls
        if (!HTTP_PATHS.has(ctx.path)) throw new APIError('NOT_FOUND');
        if (ctx.path !== '/sign-in/magic-link') return;
        const email = String(ctx.body?.email ?? '').trim().toLowerCase();
        const { allowed } = await consumeRateLimit(`sign-in:email:${email}`, SIGN_IN_EMAILS_PER_ADDRESS);
        if (!allowed) {
          throw new APIError('TOO_MANY_REQUESTS', { code: 'RATE_LIMITED', message: 'Too many sign-in emails' });
        }
        return { context: { body: { ...ctx.body, email } } };
      }),
    },
    logger: {
      // Better Auth's messages and arguments can contain emails or tokens: message only, scrubbed.
      log: (level, message) => log[level](scrub(message)),
    },
    plugins: [
      // One email carries both the magic link and a 6-digit code (same sign-in, two ways in).
      magicLink({
        expiresIn: SIGN_IN_EXPIRES_IN,
        storeToken: 'hashed',
        sendMagicLink: async ({ email, url }, ctx) => {
          const otp = await auth.api.createVerificationOTP({ body: { email, type: 'sign-in' } });
          const locale =
            (await accountLocale(email)) ?? preferredLocale(ctx?.request?.headers ?? ctx?.headers);
          await sendMail({
            to: email,
            subject: signInSubject(locale),
            body: SignInEmail({ locale, otp, url }),
          });
        },
      }),
      emailOTP({
        expiresIn: SIGN_IN_EXPIRES_IN,
        otpLength: 6,
        storeOTP: 'hashed',
        allowedAttempts: 3,
        // Codes are only created by sendMagicLink above; the endpoint that would call this is closed.
        sendVerificationOTP: async () => {
          throw new APIError('NOT_FOUND');
        },
      }),
      passkey({ rpID: baseURL.hostname, rpName: 'Givto', origin: baseURL.origin }),
    ],
  });
  return auth;
};

export type Auth = ReturnType<typeof createAuth>;

let auth: Auth | undefined;

/** Created on first use, so `next build` doesn't need the auth secrets. */
export const getAuth = (): Auth => (auth ??= createAuth());
