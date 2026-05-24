/**
 * Railway API Client
 * Zero-dependency HTTP + WebSocket client for the AIfacilitator FastAPI backend.
 * Replaces @api/api-js entirely.
 */

const API_URL: string = (import.meta.env.VITE_API_URL as string) || "";
const ANON_KEY: string = (import.meta.env.VITE_API_ANON_KEY as string) || "";
const SESSION_KEY = "mf_session";

// Named exports for files that import these constants directly
export const EDGE_FUNCTION_URL: string = (import.meta.env.VITE_API_URL as string) || "";
export const EDGE_FUNCTION_KEY: string = (import.meta.env.VITE_API_ANON_KEY as string) || "";

if (!API_URL) {
  throw new Error("Missing VITE_API_URL. Set it to your Railway backend URL.");
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ApiUser {
  id: string;
  email: string;
  role: string;
  aud: string;
  created_at: string;
  updated_at: string;
  app_metadata: Record<string, unknown>;
  user_metadata: Record<string, unknown>;
  email_confirmed_at?: string;
}

export interface ApiSession {
  access_token: string;
  token_type: string;
  expires_in: number;
  expires_at?: number;
  refresh_token?: string;
  user: ApiUser;
}

export interface ApiError {
  message: string;
  code?: string;
  details?: string;
  hint?: string;
  status?: number;
}

export interface ApiResponse<T> {
  data: T | null;
  error: ApiError | null;
  count?: number | null;
}

export type RealtimeEvent = "INSERT" | "UPDATE" | "DELETE" | "*";

export interface RealtimePayload<T = Record<string, unknown>> {
  eventType: RealtimeEvent;
  new: T;
  old: Partial<T>;
  table: string;
  schema: string;
}

export type RealtimeCallback<T = Record<string, unknown>> = (payload: RealtimePayload<T>) => void;
export type SubscriptionStatus = "SUBSCRIBED" | "CHANNEL_ERROR" | "TIMED_OUT" | "CLOSED";

export interface RealtimeChannel {
  unsubscribe: () => void;
}

// ─── Session helpers ──────────────────────────────────────────────────────────

function saveSession(session: ApiSession): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

function loadSession(): ApiSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as ApiSession) : null;
  } catch {
    return null;
  }
}

function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
  Object.keys(localStorage)
    .filter((k) => k.startsWith("sb-") || k.includes("api"))
    .forEach((k) => localStorage.removeItem(k));
  sessionStorage.clear();
}

function getToken(): string | null {
  return loadSession()?.access_token ?? null;
}

// ─── Join token store (for unauthenticated participants) ─────────────────────
// Tokens are scoped per session: stored as `mf_join_token_{sessionId}`.
// This prevents cross-session token bleed when a host tests the participant
// flow in the same browser — each session has its own isolated token slot.
//
// The session ID is resolved from the current URL (?id=X) when not explicitly
// provided, so all existing call sites work without modification.

const JOIN_TOKEN_PREFIX = "mf_join_token";
const PARTICIPANT_DATA_PREFIX = "participantSessionData";

/** Derive the session ID from the current URL (?id=X). Returns null when not on a session page. */
function getSessionIdFromUrl(): string | null {
  try {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");
    return id && !isNaN(Number(id)) ? id : null;
  } catch {
    return null;
  }
}

/** Build the scoped localStorage key for a join token. */
function joinTokenKey(sessionId?: string | null): string {
  const id = sessionId ?? getSessionIdFromUrl();
  return id ? `${JOIN_TOKEN_PREFIX}_${id}` : JOIN_TOKEN_PREFIX;
}

/** Build the scoped localStorage key for participant session data. */
export function participantDataKey(sessionId?: string | null): string {
  const id = sessionId ?? getSessionIdFromUrl();
  return id ? `${PARTICIPANT_DATA_PREFIX}_${id}` : PARTICIPANT_DATA_PREFIX;
}

/**
 * Persist the join token for a specific session.
 * Uses localStorage so the token survives page navigation.
 * @param token  The UUID join token returned by the backend.
 * @param sessionId  Optional session ID; resolved from URL when omitted.
 */
export function setJoinToken(token: string, sessionId?: string | null): void {
  localStorage.setItem(joinTokenKey(sessionId), token);
}

/**
 * Remove the join token for a specific session.
 * @param sessionId  Optional session ID; resolved from URL when omitted.
 */
export function clearJoinToken(sessionId?: string | null): void {
  localStorage.removeItem(joinTokenKey(sessionId));
  // Also remove the legacy flat key in case it was set by an older build.
  localStorage.removeItem(JOIN_TOKEN_PREFIX);
}

/**
 * Remove ALL scoped join tokens (mf_join_token_*) and participant data
 * (participantSessionData_*) from localStorage.
 * Call this when an authenticated host navigates to a protected route to
 * ensure no stale participant state from any session can interfere.
 */
export function clearAllParticipantState(): void {
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (
      key &&
      (
        key.startsWith(JOIN_TOKEN_PREFIX) ||
        key.startsWith(PARTICIPANT_DATA_PREFIX)
      )
    ) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach((k) => localStorage.removeItem(k));
}

// ─── Bootstrap join token from URL on every page load ───────────────────────
// This IIFE runs once when api.ts is first imported (which happens on every
// page load because api.ts is a top-level dependency of almost every hook).
// It reads the ?token= query parameter and persists it to localStorage so
// that all subsequent API calls carry the X-Join-Token header — even when
// the participant navigates directly to /session?id=42&token=xyz (bookmark,
// page refresh, or mobile deep-link) without going through /join-session first.
(function bootstrapJoinTokenFromUrl() {
  try {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const sessionId = params.get('id');
    if (token) {
      // Store under the scoped key so it never bleeds across sessions.
      localStorage.setItem(joinTokenKey(sessionId), token);
    }
  } catch {
    // Silently ignore — SSR or environments without window/localStorage.
  }
})();

/**
 * Retrieve the join token for the current session.
 * @param sessionId  Optional session ID; resolved from URL when omitted.
 */
export function getJoinToken(sessionId?: string | null): string | null {
  // Try the scoped key first, then fall back to the legacy flat key.
  return (
    localStorage.getItem(joinTokenKey(sessionId)) ??
    localStorage.getItem(JOIN_TOKEN_PREFIX)
  );
}

/**
 * @deprecated Use clearAllParticipantState() instead.
 * Kept for backwards compatibility with ProtectedRoute.
 */
export function clearJoinToken_legacy(): void {
  clearAllParticipantState();
}

/**
 * @deprecated Use clearAllParticipantState() instead.
 * Kept for backwards compatibility with ProtectedRoute.
 */
export function clearParticipantSessionData(): void {
  clearAllParticipantState();
}

// ─── HTTP helper ──────────────────────────────────────────────────────────────

async function apiFetch<T>(
  path: string,
  options: RequestInit & { headers?: Record<string, string> } = {}
): Promise<ApiResponse<T>> {
  try {
    const token = getToken();
    const joinToken = getJoinToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      apikey: ANON_KEY,
      ...(options.headers ?? {}),
    };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    // Send the join token only when the user is NOT authenticated.
    // When a JWT is present (host/admin), the backend uses ownership-based
    // access control. Sending the join token alongside a JWT confuses the
    // backend into applying participant-path rules for host queries (e.g.
    // GET /conversations?user_id=eq.xxx), which causes spurious 401 errors.
    // Unauthenticated participants (no JWT) still get the join token so they
    // can read the session data they are allowed to access.
    if (joinToken && !token) headers["X-Join-Token"] = joinToken;

    // Apply a 15-second timeout so Railway cold-start / network issues fail fast
    // instead of hanging indefinitely. The caller (React Query) will retry.
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15_000);
    const signal = options.signal
      ? (AbortSignal as any).any
        ? (AbortSignal as any).any([options.signal, controller.signal])
        : controller.signal
      : controller.signal;
    let res: Response;
    try {
      res = await fetch(`${API_URL}${path}`, { ...options, headers, signal });
    } finally {
      clearTimeout(timeoutId);
    }

    let count: number | null = null;
    const cr = res.headers.get("Content-Range");
    if (cr) {
      const m = cr.match(/\/(\d+)$/);
      if (m) count = parseInt(m[1], 10);
    }

    if (res.status === 204) return { data: null, error: null, count };

    const text = await res.text();
    let body: unknown;
    try { body = text ? JSON.parse(text) : null; } catch { body = text; }

    if (!res.ok) {
      const err = body as Record<string, unknown>;
      // FastAPI wraps errors as { detail: { message, code } } or { detail: "string" }
      const detail = err?.detail as Record<string, unknown> | string | undefined;
      const detailObj = detail && typeof detail === 'object' ? detail as Record<string, unknown> : null;
      const detailStr = detail && typeof detail === 'string' ? detail : null;
      return {
        data: null,
        error: {
          message: (detailObj?.message as string) || (err?.message as string) || (err?.error_description as string) || detailStr || `HTTP ${res.status}`,
          code: (detailObj?.code as string) || (err?.code as string) || String(res.status),
          details: ((detailObj?.details ?? err?.details) as string | undefined),
          hint: ((detailObj?.hint ?? err?.hint) as string | undefined),
          status: res.status,
        },
        count,
      };
    }
    return { data: body as T, error: null, count };
  } catch (e: unknown) {
    return { data: null, error: { message: e instanceof Error ? e.message : "Network error" }, count: null };
  }
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

type AuthStateEvent = "SIGNED_IN" | "SIGNED_OUT" | "TOKEN_REFRESHED";
type AuthStateListener = (event: AuthStateEvent, session: ApiSession | null) => void;
const authListeners: Set<AuthStateListener> = new Set();

function notifyAuth(event: AuthStateEvent, session: ApiSession | null): void {
  authListeners.forEach((fn) => fn(event, session));
}

export const auth = {
  onAuthStateChange(cb: AuthStateListener): { data: { subscription: { unsubscribe: () => void } } } {
    authListeners.add(cb);
    return { data: { subscription: { unsubscribe: () => authListeners.delete(cb) } } };
  },

  async getSession(): Promise<{ data: { session: ApiSession | null } }> {
    return { data: { session: loadSession() } };
  },

  async getUser(): Promise<{ data: { user: ApiUser | null }; error: ApiError | null }> {
    if (!getToken()) return { data: { user: null }, error: null };
    const res = await apiFetch<ApiUser>("/auth/v1/user");
    return { data: { user: res.data }, error: res.error };
  },

  async signInWithPassword(creds: { email: string; password: string }): Promise<{
    data: { session: ApiSession | null; user: ApiUser | null };
    error: ApiError | null;
  }> {
    const res = await apiFetch<ApiSession>("/auth/v1/token?grant_type=password", {
      method: "POST",
      body: JSON.stringify(creds),
      headers: {},
    });
    if (res.error || !res.data) return { data: { session: null, user: null }, error: res.error };
    saveSession(res.data);
    notifyAuth("SIGNED_IN", res.data);
    return { data: { session: res.data, user: res.data.user }, error: null };
  },

  async signUp(params: {
    email: string;
    password: string;
    options?: { data?: Record<string, unknown>; emailRedirectTo?: string };
  }): Promise<{ data: { session: ApiSession | null; user: ApiUser | null }; error: ApiError | null }> {
    const body: Record<string, unknown> = { email: params.email, password: params.password };
    // Pass user metadata (name, etc.) at the top level so the backend can read it.
    // The backend accepts both options.data and top-level data shapes.
    if (params.options?.data) body.data = params.options.data;
    const res = await apiFetch<ApiSession>("/auth/v1/signup", {
      method: "POST",
      body: JSON.stringify(body),
      headers: {},
    });
    if (res.error || !res.data) return { data: { session: null, user: null }, error: res.error };
    // Save the session and fire SIGNED_IN so the user is authenticated immediately
    // after signup — no separate login step required.
    saveSession(res.data);
    notifyAuth("SIGNED_IN", res.data);
    return { data: { session: res.data, user: res.data.user }, error: null };
  },

  async signOut(): Promise<{ error: ApiError | null }> {
    await apiFetch("/auth/v1/logout", { method: "POST" });
    clearSession();
    notifyAuth("SIGNED_OUT", null);
    return { error: null };
  },

  async updateUser(params: { password?: string; data?: Record<string, unknown> }): Promise<{
    data: { user: ApiUser | null };
    error: ApiError | null;
  }> {
    const res = await apiFetch<ApiUser>("/auth/v1/user", {
      method: "PUT",
      body: JSON.stringify(params),
    });
    return { data: { user: res.data }, error: res.error };
  },

  async resetPasswordForEmail(email: string, _opts?: { redirectTo?: string }): Promise<{ error: ApiError | null }> {
    const res = await apiFetch("/auth/v1/recover", {
      method: "POST",
      body: JSON.stringify({ email }),
      headers: {},
    });
    return { error: res.error };
  },

  async resendVerificationEmail(email: string): Promise<{ error: ApiError | null }> {
    const res = await apiFetch("/auth/v1/resend", {
      method: "POST",
      body: JSON.stringify({ type: "signup", email }),
      headers: {},
    });
    return { error: res.error };
  },

  mfa: {
    async enroll(params: { factorType?: "totp"; factor_type?: "totp"; friendlyName?: string } = {}): Promise<{
      data: { id: string; type: string; status: string; totp: { qr_code: string; secret: string; uri: string } } | null;
      error: ApiError | null;
    }> {
      const res = await apiFetch<{ id: string; type: string; status: string; totp: { qr_code: string; secret: string; uri: string } }>(
        "/auth/v1/mfa/enroll",
        {
          method: "POST",
          body: JSON.stringify(params),
        },
      );
      return { data: res.data, error: res.error };
    },

    async challengeAndVerify(params: { factorId: string; code: string }): Promise<{
      data: { success: boolean; factor_id: string } | null;
      error: ApiError | null;
    }> {
      const challenge = await apiFetch<{ id: string }>("/auth/v1/mfa/challenge", {
        method: "POST",
        body: JSON.stringify({ factorId: params.factorId }),
      });
      if (challenge.error) return { data: null, error: challenge.error };

      const verification = await apiFetch<{ success: boolean; factor_id: string }>("/auth/v1/mfa/verify", {
        method: "POST",
        body: JSON.stringify({ factorId: params.factorId, code: params.code }),
      });
      return { data: verification.data, error: verification.error };
    },
  },
};

// ─── Query builder ────────────────────────────────────────────────────────────

type FilterOp = "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "like" | "ilike" | "in" | "is" | "cs" | "cd";

interface QState {
  table: string;
  cols: string;
  filters: Array<[string, string]>;
  order: string[];
  limitVal?: number;
  offsetVal?: number;
  single: boolean;
  maybeSingle: boolean;
  count: "exact" | "planned" | "estimated" | null;
  signal?: AbortSignal;
}

class QueryBuilder<T = Record<string, unknown>> {
  private s: QState;
  constructor(table: string) {
    this.s = { table, cols: "*", filters: [], order: [], single: false, maybeSingle: false, count: null };
  }

  select(cols = "*", opts?: { count?: "exact" | "planned" | "estimated" }): this {
    this.s.cols = cols;
    if (opts?.count) this.s.count = opts.count;
    return this;
  }
  eq(col: string, val: unknown): this { this.s.filters.push([col, `eq.${val}`]); return this; }
  neq(col: string, val: unknown): this { this.s.filters.push([col, `neq.${val}`]); return this; }
  gt(col: string, val: unknown): this { this.s.filters.push([col, `gt.${val}`]); return this; }
  gte(col: string, val: unknown): this { this.s.filters.push([col, `gte.${val}`]); return this; }
  lt(col: string, val: unknown): this { this.s.filters.push([col, `lt.${val}`]); return this; }
  lte(col: string, val: unknown): this { this.s.filters.push([col, `lte.${val}`]); return this; }
  like(col: string, p: string): this { this.s.filters.push([col, `like.${p}`]); return this; }
  ilike(col: string, p: string): this { this.s.filters.push([col, `ilike.${p}`]); return this; }
  in(col: string, vals: unknown[]): this { this.s.filters.push([col, `in.(${vals.join(",")})`]); return this; }
  is(col: string, val: null | boolean): this { this.s.filters.push([col, `is.${val}`]); return this; }
  not(col: string, op: string, val: unknown): this { this.s.filters.push([col, `not.${op}.${val}`]); return this; }
  filter(col: string, op: FilterOp, val: unknown): this { this.s.filters.push([col, `${op}.${val}`]); return this; }
  order(col: string, opts?: { ascending?: boolean; nullsFirst?: boolean }): this {
    const dir = opts?.ascending === false ? "desc" : "asc";
    this.s.order.push(`${col}.${dir}${opts?.nullsFirst ? ".nullsfirst" : ""}`);
    return this;
  }
  limit(n: number): this { this.s.limitVal = n; return this; }
  range(from: number, to: number): this { this.s.offsetVal = from; this.s.limitVal = to - from + 1; return this; }
  single(): this { this.s.single = true; return this; }
  maybeSingle(): this { this.s.maybeSingle = true; return this; }
  // React Query v5 calls .abortSignal(signal) to enable query cancellation.
  // We store the signal and pass it to fetch() so in-flight requests are
  // properly cancelled when a component unmounts or a query is deduplicated.
  abortSignal(signal: AbortSignal): this { this.s.signal = signal; return this; }

  private url(method: "GET" | "HEAD"): string {
    const p = new URLSearchParams();
    // Normalize whitespace in select string (template literals may have newlines/spaces)
    const normalizedCols = this.s.cols
      .replace(/\s+/g, " ").trim()        // collapse all whitespace to single spaces
      .replace(/\s*\(\s*/g, "(")          // remove spaces around (
      .replace(/\s*\)\s*/g, ")");         // remove spaces around )
    if (method === "GET") p.set("select", normalizedCols);
    this.s.filters.forEach(([col, val]) => p.append(col, val));
    if (this.s.order.length) p.set("order", this.s.order.join(","));
    if (this.s.limitVal !== undefined) p.set("limit", String(this.s.limitVal));
    if (this.s.offsetVal !== undefined) p.set("offset", String(this.s.offsetVal));
    return `/rest/v1/${this.s.table}?${p.toString()}`;
  }

  private xHeaders(): Record<string, string> {
    const h: Record<string, string> = {};
    if (this.s.single || this.s.maybeSingle) h["Accept"] = "application/vnd.pgrst.object+json";
    if (this.s.count) h["Prefer"] = `count=${this.s.count}`;
    return h;
  }

  private async exec(): Promise<ApiResponse<T | T[]>> {
    const token = getToken();
    const joinToken = getJoinToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      apikey: ANON_KEY,
      ...this.xHeaders(),
    };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    // Always send the join token when present — even for authenticated users.
    if (joinToken) headers["X-Join-Token"] = joinToken;
    // Apply a 15-second timeout so Railway cold-start / network issues fail fast.
    const _ctrl = new AbortController();
    const _tid = setTimeout(() => _ctrl.abort(), 15_000);
    const _sig = this.s.signal
      ? (AbortSignal as any).any
        ? (AbortSignal as any).any([this.s.signal, _ctrl.signal])
        : _ctrl.signal
      : _ctrl.signal;
    try {
      let res: Response;
      try {
        res = await fetch(`${API_URL}${this.url("GET")}`, { headers, signal: _sig });
      } finally {
        clearTimeout(_tid);
      }
      let count: number | null = null;
      const cr = res.headers.get("Content-Range");
      if (cr) { const m = cr.match(/\/(\d+)$/); if (m) count = parseInt(m[1], 10); }
      if (res.status === 204) return { data: null, error: null, count };
      const text = await res.text();
      let body: unknown;
      try { body = text ? JSON.parse(text) : null; } catch { body = text; }
      if (!res.ok) {
        const err = body as Record<string, unknown>;
        return { data: null, error: { message: (err?.message as string) || `HTTP ${res.status}`, code: String(res.status), status: res.status }, count };
      }
      // PostgREST behaviour: .single() with no rows → PGRST116 error (not an empty array)
      if ((this.s.single || this.s.maybeSingle) && Array.isArray(body)) {
        if (body.length === 0) {
          if (this.s.maybeSingle) {
            // maybeSingle returns null data (no error) when no rows found
            return { data: null, error: null, count };
          }
          // single() returns an error when no rows found
          return { data: null, error: { message: 'JSON object requested, multiple (or no) rows returned', code: 'PGRST116', status: 406 }, count };
        }
        // single() with multiple rows: return first row (matches PostgREST behaviour)
        return { data: body[0] as T, error: null, count };
      }
      return { data: body as T | T[], error: null, count };
    } catch (e: unknown) {
      return { data: null, error: { message: e instanceof Error ? e.message : "Network error" }, count: null };
    }
  }

  then<R1 = ApiResponse<T | T[]>, R2 = never>(
    onfulfilled: (v: ApiResponse<T | T[]>) => R1 | PromiseLike<R1>,
    onrejected?: ((r: unknown) => R2 | PromiseLike<R2>) | null
  ): Promise<R1 | R2> {
    return this.exec().then(onfulfilled, onrejected ?? undefined);
  }
  catch<R = never>(onrejected: (r: unknown) => R | PromiseLike<R>): Promise<ApiResponse<T | T[]> | R> {
    return this.exec().catch(onrejected);
  }
  finally(fn?: (() => void) | null): Promise<ApiResponse<T | T[]>> {
    return this.exec().finally(fn ?? undefined);
  }

  async head(): Promise<ApiResponse<null>> {
    const token = getToken();
    const joinToken = getJoinToken();
    const headers: Record<string, string> = { apikey: ANON_KEY, ...this.xHeaders() };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    // Always send the join token when present — even for authenticated users.
    if (joinToken) headers["X-Join-Token"] = joinToken;
    try {
      const res = await fetch(`${API_URL}${this.url("HEAD")}`, { method: "HEAD", headers });
      let count: number | null = null;
      const cr = res.headers.get("Content-Range");
      if (cr) { const m = cr.match(/\/(\d+)$/); if (m) count = parseInt(m[1], 10); }
      return { data: null, error: null, count };
    } catch (e: unknown) {
      return { data: null, error: { message: e instanceof Error ? e.message : "Network error" }, count: null };
    }
  }

  insert(rows: Partial<T> | Partial<T>[]): MutationBuilder<T> {
    return new MutationBuilder<T>(this.s.table, "POST", JSON.stringify(rows), this.s.filters);
  }

  update(patch: Partial<T>): MutationBuilder<T> {
    return new MutationBuilder<T>(this.s.table, "PATCH", JSON.stringify(patch), this.s.filters);
  }

  upsert(rows: Partial<T> | Partial<T>[], opts?: { onConflict?: string }): MutationBuilder<T> {
    const extra: Record<string, string> = { Prefer: "resolution=merge-duplicates,return=representation" };
    if (opts?.onConflict) extra["on_conflict"] = opts.onConflict;
    return new MutationBuilder<T>(this.s.table, "POST", JSON.stringify(rows), this.s.filters, extra);
  }

  delete(): MutationBuilder<T> {
    return new MutationBuilder<T>(this.s.table, "DELETE", undefined, this.s.filters);
  }
}

// ─── Mutation builder (supports .select() chaining after insert/update/upsert/delete) ─
class MutationBuilder<T = Record<string, unknown>> {
  private table: string;
  private method: string;
  private body: string | undefined;
  private filters: Array<[string, string]>;
  private extra: Record<string, string>;
  private selectCols = "*";
  private singleFlag = false;
  private maybeSingleFlag = false;
  private abortSignalRef?: AbortSignal;

  constructor(
    table: string,
    method: string,
    body: string | undefined,
    filters: Array<[string, string]>,
    extra: Record<string, string> = {}
  ) {
    this.table = table;
    this.method = method;
    this.body = body;
    this.filters = [...filters];
    this.extra = extra;
  }

  select(cols = "*"): this { this.selectCols = cols; return this; }
  single(): this { this.singleFlag = true; return this; }
  maybeSingle(): this { this.maybeSingleFlag = true; return this; }
  abortSignal(signal: AbortSignal): this { this.abortSignalRef = signal; return this; }

  // Filter methods (same as QueryBuilder) — needed for .update().eq(...) patterns
  eq(col: string, val: unknown): this { this.filters.push([col, `eq.${val}`]); return this; }
  neq(col: string, val: unknown): this { this.filters.push([col, `neq.${val}`]); return this; }
  gt(col: string, val: unknown): this { this.filters.push([col, `gt.${val}`]); return this; }
  gte(col: string, val: unknown): this { this.filters.push([col, `gte.${val}`]); return this; }
  lt(col: string, val: unknown): this { this.filters.push([col, `lt.${val}`]); return this; }
  lte(col: string, val: unknown): this { this.filters.push([col, `lte.${val}`]); return this; }
  like(col: string, p: string): this { this.filters.push([col, `like.${p}`]); return this; }
  ilike(col: string, p: string): this { this.filters.push([col, `ilike.${p}`]); return this; }
  in(col: string, vals: unknown[]): this { this.filters.push([col, `in.(${vals.join(",")})`]); return this; }
  is(col: string, val: null | boolean): this { this.filters.push([col, `is.${val}`]); return this; }
  filter(col: string, op: string, val: unknown): this { this.filters.push([col, `${op}.${val}`]); return this; }
  match(obj: Record<string, unknown>): this { Object.entries(obj).forEach(([k, v]) => this.filters.push([k, `eq.${v}`])); return this; }

  private async exec(): Promise<ApiResponse<T | T[]>> {
    const p = new URLSearchParams();
    this.filters.forEach(([col, val]) => p.append(col, val));
    // Always request representation so we get rows back
    const basePrefer = this.extra["Prefer"] ?? "";
    const prefer = basePrefer ? `${basePrefer},return=representation` : "return=representation";
    const headers: Record<string, string> = { Prefer: prefer };
    if (this.singleFlag || this.maybeSingleFlag) headers["Accept"] = "application/vnd.pgrst.object+json";
    // Add select cols to query string so the server returns the requested columns
    p.set("select", this.selectCols);
    if (this.extra["on_conflict"]) p.set("on_conflict", this.extra["on_conflict"]);
    const url = `/rest/v1/${this.table}?${p.toString()}`;
    return apiFetch<T | T[]>(url, { method: this.method, body: this.body, headers });
  }

  then<R1 = ApiResponse<T | T[]>, R2 = never>(
    onfulfilled: (v: ApiResponse<T | T[]>) => R1 | PromiseLike<R1>,
    onrejected?: ((r: unknown) => R2 | PromiseLike<R2>) | null
  ): Promise<R1 | R2> {
    return this.exec().then(onfulfilled, onrejected ?? undefined);
  }
  catch<R = never>(onrejected: (r: unknown) => R | PromiseLike<R>): Promise<ApiResponse<T | T[]> | R> {
    return this.exec().catch(onrejected);
  }
  finally(fn?: (() => void) | null): Promise<ApiResponse<T | T[]>> {
    return this.exec().finally(fn ?? undefined);
  }
}

// ─── Storage ──────────────────────────────────────────────────────────────────

export const storage = {
  from(bucket: string) {
    return {
      async upload(
        path: string,
        file: File | Blob | ArrayBuffer,
        _opts?: { contentType?: string; upsert?: boolean }
      ): Promise<{ data: { path: string } | null; error: ApiError | null }> {
        const token = getToken();
        const headers: Record<string, string> = { apikey: ANON_KEY };
        if (token) headers["Authorization"] = `Bearer ${token}`;
        if (file instanceof File) headers["Content-Type"] = file.type;
        else if (file instanceof Blob) headers["Content-Type"] = "application/octet-stream";
        try {
          const res = await fetch(`${API_URL}/storage/v1/object/${bucket}/${path}`, {
            method: "POST",
            headers,
            body: file as BodyInit,
          });
          if (!res.ok) {
            const text = await res.text();
            return { data: null, error: { message: text || `HTTP ${res.status}` } };
          }
          return { data: { path }, error: null };
        } catch (e: unknown) {
          return { data: null, error: { message: e instanceof Error ? e.message : "Upload failed" } };
        }
      },
      getPublicUrl(path: string): { data: { publicUrl: string } } {
        return { data: { publicUrl: `${API_URL}/storage/v1/object/public/${bucket}/${path}` } };
      },
    };
  },
};

// ─── Edge Functions ───────────────────────────────────────────────────────────

export const functions = {
  async invoke<T = unknown>(
    name: string,
    opts?: { body?: unknown; headers?: Record<string, string> }
  ): Promise<{ data: T | null; error: ApiError | null }> {
    const res = await apiFetch<T>(`/functions/v1/${name}`, {
      method: "POST",
      body: opts?.body !== undefined ? JSON.stringify(opts.body) : undefined,
      headers: opts?.headers ?? {},
    });
    return { data: res.data, error: res.error };
  },
};

// ─── Realtime ─────────────────────────────────────────────────────────────────

interface ChannelFilter {
  event: RealtimeEvent;
  schema: string;
  table: string;
  filter?: string;
}

/**
 * SharedSSEManager: singleton SSE transport for all realtime channels.
 *
 * Uses Server-Sent Events instead of WebSockets because Railway's Fastly CDN
 * blocks WebSocket upgrades in production (returns 404).  SSE works over
 * standard HTTP/2 and traverses CDN/proxies without any special configuration.
 *
 * Each channel gets its own SSE connection (one GET per topic).  This is
 * acceptable because the number of active channels per page is small (1-3).
 */
class SharedSSEManager {
  private connections = new Map<string, EventSource>();
  private channels = new Map<string, RealtimeChannelImpl>();
  private retryTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private retryCounts = new Map<string, number>();
  private readonly MAX_BACKOFF_MS = 60_000;

  register(ch: RealtimeChannelImpl): void {
    this.channels.set(ch.getTopic(), ch);
    this.openSSE(ch.getTopic());
  }

  forceReconnect(): void {
    for (const topic of this.channels.keys()) {
      this.closeSSE(topic);
      this.retryCounts.set(topic, 0);
      this.openSSE(topic);
    }
  }

  unregister(ch: RealtimeChannelImpl): void {
    this.closeSSE(ch.getTopic());
    this.channels.delete(ch.getTopic());
  }

  private openSSE(topic: string): void {
    if (this.connections.has(topic)) return;
    const token = getToken() || ANON_KEY;
    const url = `${API_URL}/realtime/v1/sse?apikey=${encodeURIComponent(token)}&topic=${encodeURIComponent(topic)}`;
    const es = new EventSource(url);
    this.connections.set(topic, es);

    es.onmessage = (ev: MessageEvent) => {
      try {
        const msg = JSON.parse(ev.data as string) as Record<string, unknown>;
        const msgTopic = (msg.topic as string) || topic;
        const event = msg.event as string;
        const payload = msg.payload as Record<string, unknown>;
        const ch = this.channels.get(msgTopic) ?? this.channels.get(topic);
        if (!ch) return;
        // Initial connection confirmation
        if (event === "connected") {
          ch.notifyStatus("SUBSCRIBED");
          return;
        }
        // Standard Supabase-style payload
        if (payload?.type && (payload.type === "INSERT" || payload.type === "UPDATE" || payload.type === "DELETE")) {
          ch.dispatch({
            eventType: payload.type as RealtimeEvent,
            new: (payload.record ?? {}) as Record<string, unknown>,
            old: (payload.old_record ?? {}) as Record<string, unknown>,
            table: (payload.table as string) ?? "",
            schema: "public",
          });
          return;
        }
        if (event === "postgres_changes" || event === "INSERT" || event === "UPDATE" || event === "DELETE") {
          ch.dispatch(payload as RealtimePayload);
        }
      } catch { /* ignore */ }
    };

    es.onerror = () => {
      const ch = this.channels.get(topic);
      ch?.notifyStatus("CHANNEL_ERROR");
      this.closeSSE(topic);
      this.scheduleReconnect(topic);
    };
  }

  private closeSSE(topic: string): void {
    const es = this.connections.get(topic);
    if (es) { es.close(); this.connections.delete(topic); }
    const t = this.retryTimers.get(topic);
    if (t) { clearTimeout(t); this.retryTimers.delete(topic); }
  }

  private scheduleReconnect(topic: string): void {
    if (this.retryTimers.has(topic)) return;
    const count = this.retryCounts.get(topic) ?? 0;
    const delay = Math.min(3_000 * Math.pow(2, count), this.MAX_BACKOFF_MS);
    this.retryCounts.set(topic, count + 1);
    const t = setTimeout(() => {
      this.retryTimers.delete(topic);
      if (this.channels.has(topic)) this.openSSE(topic);
    }, delay);
    this.retryTimers.set(topic, t);
  }
}

const sharedWS = new SharedSSEManager();

class RealtimeChannelImpl implements RealtimeChannel {
  private topic: string;
  private listeners: Array<{ filter: ChannelFilter; cb: RealtimeCallback }> = [];
  private statusCb: ((s: SubscriptionStatus) => void) | null = null;
  private dead = false;

  constructor(topic: string) { this.topic = topic; }

  getTopic(): string { return this.topic; }

  notifyStatus(s: SubscriptionStatus): void { this.statusCb?.(s); }

  dispatch(rec: RealtimePayload): void {
    for (const { filter, cb } of this.listeners) {
      if ((filter.event === "*" || filter.event === rec.eventType) &&
          (!filter.table || filter.table === rec.table)) {
        cb(rec);
      }
    }
  }

  on<T = Record<string, unknown>>(
    _type: "postgres_changes",
    filter: ChannelFilter,
    cb: RealtimeCallback<T>
  ): this {
    this.listeners.push({ filter, cb: cb as RealtimeCallback });
    return this;
  }

  subscribe(cb?: (s: SubscriptionStatus, err?: Error) => void): this {
    if (this.dead) return this;
    this.statusCb = cb ?? null;
    sharedWS.register(this);
    return this;
  }

  unsubscribe(): void {
    this.dead = true;
    sharedWS.unregister(this);
  }
}

// ─── Main export ──────────────────────────────────────────────────────────────

export const api = {
  auth,
  storage,
  functions,
  from<T = Record<string, unknown>>(table: string): QueryBuilder<T> {
    return new QueryBuilder<T>(table);
  },
  rpc<T = unknown>(fn: string, params?: Record<string, unknown>): Promise<ApiResponse<T>> {
    return apiFetch<T>(`/rest/v1/rpc/${fn}`, { method: "POST", body: JSON.stringify(params ?? {}) });
  },
  channel(topic: string): RealtimeChannelImpl {
    return new RealtimeChannelImpl(topic);
  },
  removeChannel(channel: RealtimeChannel): void {
    channel.unsubscribe();
  },
  /**
   * Force an immediate WebSocket reconnect, resetting the backoff counter.
   * Call this when the user manually clicks "Retry Connection".
   */
  forceReconnect(): void {
    sharedWS.forceReconnect();
  },
};

export default api;
