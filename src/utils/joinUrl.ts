/**
 * Utilities for building and parsing secure session join URLs.
 *
 * Join URLs include a `token` query parameter that is a UUID stored on the
 * `conversations` table.  Without the correct token a participant cannot
 * access session data, preventing sequential-ID enumeration attacks.
 */

/**
 * Build a join URL for a session.
 * @param conversationId  The numeric conversation ID.
 * @param joinToken       The UUID join token from the conversations table.
 * @returns               A fully-qualified URL string, e.g.
 *                        `https://app.example.com/join-session?id=42&token=<uuid>`
 */
export function buildJoinUrl(conversationId: number, joinToken: string | null | undefined): string {
  const base = `${window.location.origin}/join-session?id=${conversationId}`;
  if (joinToken) {
    return `${base}&token=${encodeURIComponent(joinToken)}`;
  }
  // Fallback: no token (legacy sessions that pre-date the join_token column)
  return base;
}

/**
 * Parse the join token from the current URL search params.
 * @returns The token string, or null if not present.
 */
export function getJoinTokenFromUrl(): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get("token");
}
