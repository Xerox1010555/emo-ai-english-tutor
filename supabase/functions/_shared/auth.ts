/**
 * Shared auth helper for Emo's edge functions.
 *
 * The browser sends the learner's Supabase access token. A token that merely
 * *looks* like a bearer token is not enough: it has to be verified against
 * Supabase's auth service, otherwise anyone could spend the owner's LLM credit
 * with a made-up string.
 *
 * Environment (provided automatically inside Supabase edge functions):
 *   SUPABASE_URL, SUPABASE_ANON_KEY
 */

export interface VerifiedUser {
  id: string;
  email?: string;
}

export function bearerToken(req: Request): string | null {
  const header = req.headers.get('Authorization') ?? '';
  if (!header.startsWith('Bearer ')) return null;
  const token = header.slice(7).trim();
  return token.length > 0 ? token : null;
}

/**
 * Verifies the bearer token with Supabase Auth.
 * Returns the user, or null when the token is missing, malformed, or invalid.
 */
export async function requireUser(req: Request): Promise<VerifiedUser | null> {
  const token = bearerToken(req);
  if (!token) return null;

  const url = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!url || !anonKey) return null;

  try {
    const response = await fetch(`${url.replace(/\/$/, '')}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: anonKey,
      },
    });
    if (!response.ok) return null;
    const body = await response.json();
    if (!body || typeof body.id !== 'string') return null;
    return { id: body.id, email: typeof body.email === 'string' ? body.email : undefined };
  } catch {
    return null;
  }
}
