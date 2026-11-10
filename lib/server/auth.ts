import { passkey } from '@better-auth/passkey';
import { betterAuth } from 'better-auth';
import { mongodbAdapter } from 'better-auth/adapters/mongodb';
import { APIError, createAuthEndpoint, createAuthMiddleware, isAPIError } from 'better-auth/api';
import { parseSetCookieHeader, toCookieOptions } from 'better-auth/cookies';
import { emailOTP } from 'better-auth/plugins/email-otp';
import { magicLink } from 'better-auth/plugins/magic-link';
import * as v from 'valibot';
import { SignInEmail, signInSubject } from '../../emails/sign-in';
import { locales, type Locale } from '../schema/common';
import { scrub } from '../scrub';
import { getDb, getMongoClient, getMongoDb } from './db';
import { requireEnv } from './env';
import { preferredLocale } from './locale';
import { log } from './log';
import { sendMail } from './mail';
import { consumeRateLimit } from './rate-limit';
import { retention } from '../privacy';

/** Code and link expire after 10 minutes (the email says so). */
const SIGN_IN_EXPIRES_IN = 10 * 60;
/** Per address, on top of Better Auth's per-IP limits. */
const SIGN_IN_EMAILS_PER_ADDRESS = { window: 15 * 60, max: 5 };

// Everything else Better Auth (or a plugin) exposes is a 404 over HTTP: no password, no
// social, no profile updates that would bypass our validation (names go through tRPC).
const HTTP_PATHS = new Set([
  '/sign-in/magic-link',
  '/magic-link/verify-token',
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

// Signing in with one of these ends every other pending code and link for the address.
const SIGN_IN_PATHS = new Set(['/sign-in/email-otp', '/magic-link/verify', '/passkey/verify-authentication']);

/** Pending magic links store `{"type":"magic-link","email":…}` as their value (only the token is hashed). */
export const deletePendingSignIns = async (email: string): Promise<void> => {
  const context = await getAuth().$context;
  const valuePrefix = JSON.stringify({ type: 'magic-link', email }).slice(0, -1);
  await Promise.all([
    getMongoDb()
      .collection('verifications')
      .deleteMany({ value: { $regex: `^${RegExp.escape(valuePrefix)}[,}]` } }),
    context.internalAdapter.deleteVerificationByIdentifier(`sign-in-otp-${email}`),
  ]);
};

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
    session: { expiresIn: retention.sessionDays * 24 * 60 * 60, updateAge: 24 * 60 * 60 },
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
        // Better Auth doesn't bound passkey names (registration takes the email as the name).
        if (ctx.path.startsWith('/passkey/') && String(ctx.body?.name ?? ctx.query?.name ?? '').length > 254) {
          throw new APIError('BAD_REQUEST', { code: 'NAME_TOO_LONG', message: 'Name too long' });
        }
        if (ctx.path !== '/sign-in/magic-link') return;
        const email = String(ctx.body?.email ?? '').trim().toLowerCase();
        const { allowed } = await consumeRateLimit(`sign-in:email:${email}`, SIGN_IN_EMAILS_PER_ADDRESS);
        if (!allowed) {
          throw new APIError('TOO_MANY_REQUESTS', { code: 'RATE_LIMITED', message: 'Too many sign-in emails' });
        }
        return { context: { body: { ...ctx.body, email } } };
      }),
      after: createAuthMiddleware(async (ctx) => {
        const email = ctx.context.newSession?.user.email;
        if (email && SIGN_IN_PATHS.has(ctx.path)) await deletePendingSignIns(email);
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
        sendMagicLink: async ({ email, token, url }, ctx) => {
          // The link opens /auth/link with the token in the fragment, which browsers never
          // send to the server: tokens stay out of request URLs and access logs.
          const callbackURL = new URL(url).searchParams.get('callbackURL') ?? '/';
          const link = `${baseURL.origin}/auth/link#${new URLSearchParams({ token, callbackURL })}`;
          const otp = await auth.api.createVerificationOTP({ body: { email, type: 'sign-in' } });
          const locale =
            (await accountLocale(email)) ?? preferredLocale(ctx?.request?.headers ?? ctx?.headers);
          await sendMail({
            to: email,
            subject: signInSubject(locale),
            body: SignInEmail({ locale, otp, url: link }),
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
      {
        id: 'magic-link-by-post',
        endpoints: {
          /** `/magic-link/verify` as a POST with the token in the body (closed over HTTP: GET puts the token in the URL). */
          verifyMagicLinkToken: createAuthEndpoint(
            '/magic-link/verify-token',
            { method: 'POST', body: v.object({ token: v.pipe(v.string(), v.maxLength(200)) }), requireHeaders: true },
            async (ctx) => {
              // Without a callbackURL, verify answers with JSON, or throws a redirect carrying `error=…`.
              const result = await auth.api
                .magicLinkVerify({ query: { token: ctx.body.token }, headers: ctx.headers, returnHeaders: true })
                .catch((error: unknown) => {
                  if (isAPIError(error)) return null;
                  throw error;
                });
              if (!result) throw new APIError('BAD_REQUEST', { code: 'INVALID_TOKEN', message: 'Invalid or expired link' });
              for (const cookie of result.headers.getSetCookie()) {
                for (const [name, attributes] of parseSetCookieHeader(cookie)) {
                  ctx.setCookie(name, attributes.value, toCookieOptions(attributes));
                }
              }
              return ctx.json({ status: true });
            }
          ),
        },
        rateLimit: [{ pathMatcher: (path) => path === '/magic-link/verify-token', window: 60, max: 5 }],
      },
      passkey({ rpID: baseURL.hostname, rpName: 'Givto', origin: baseURL.origin }),
    ],
  });
  return auth;
};

export type Auth = ReturnType<typeof createAuth>;

let auth: Auth | undefined;

/** Created on first use, so `next build` doesn't need the auth secrets. */
export const getAuth = (): Auth => (auth ??= createAuth());
