import { useRouter } from 'next/router';
import { useState } from 'react';
import { authClient } from '../../lib/client/auth';

// Minimal place to add a passkey once signed in; the account slice moves this to /account.
export default function PasskeysPage() {
  const router = useRouter();
  const session = authClient.useSession();
  const passkeys = authClient.useListPasskeys();
  const [message, setMessage] = useState<string | null>(null);

  if (session.isPending) return <main><p>Loading…</p></main>;
  if (!session.data) {
    return (
      <main>
        <p>
          You’re signed out. <a href="/auth/sign-in?redirect=%2Fauth%2Fpasskeys">Sign in</a>
        </p>
      </main>
    );
  }

  const addPasskey = async () => {
    const result = await authClient.passkey.addPasskey();
    setMessage(result?.error ? (result.error.message ?? 'Could not add the passkey') : 'Passkey added');
  };

  const signOut = async () => {
    await authClient.signOut();
    await router.replace('/auth/sign-in');
  };

  return (
    <main>
      <h1>Passkeys</h1>
      <p>Signed in as {session.data.user.email}</p>
      <ul>
        {(passkeys.data ?? []).map((passkey) => (
          <li key={passkey.id}>
            {passkey.name ?? 'Passkey'}, added {new Date(passkey.createdAt).toLocaleDateString()}
          </li>
        ))}
      </ul>
      <button type="button" onClick={addPasskey}>Add a passkey</button>
      <button type="button" onClick={signOut}>Sign out</button>
      {message && <p role="status">{message}</p>}
    </main>
  );
}
