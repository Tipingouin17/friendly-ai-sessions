/**
 * Railway API Client
 * Zero-dependency HTTP + WebSocket client for the MyFacilitator FastAPI backend.
 * Replaces @supabase/supabase-js entirely.
 */

const API_URL: string = (import.meta.env.VITE_API_URL as string) || "";
const ANON_KEY: string = (import.meta.env.VITE_API_ANON_KEY as string) || "";
const SESSION_KEY = "mf_session";

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
    .filter((k) => k.startsWith("sb-") || k.includes("supabase"))
    .forEach((k) => localStorage.removeItem(k));
  sessionStorage.clear();
}

function getToken(): string | null {
  return loadSession()?.access_token ?? null;
}

// ─── HTTP helper ──────────────────────────────────────────────────────────────

async function apiFetch<T>(
  path: string,
  options: RequestInit & { headers?: Record<string, string> } = {}
): Promise<ApiResponse<T>> {
  try {
    const token = getToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      apikey: ANON_KEY,
      ...(options.headers ?? {}),
    };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const res = await fetch(`${API_URL}${path}`, { ...options, headers });

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
      return {
        data: null,
        error: {
          message: (err?.message as string) || (err?.error_description as string) || `HTTP ${res.status}`,
          code: (err?.code as string) || String(res.status),
          details: err?.details as string | undefined,
          hint: err?.hint as string | undefined,
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
    if (params.options?.data) body.data = params.options.data;
    const res = await apiFetch<ApiSession>("/auth/v1/signup", {
      method: "POST",
      body: JSON.stringify(body),
      headers: {},
    });
    if (res.error || !res.data) return { data: { session: null, user: null }, error: res.error };
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

  mfa: {
    async enroll(_p: unknown): Promise<{ data: null; error: ApiError }> {
      return { data: null, error: { message: "MFA not supported on this backend" } };
    },
    async challengeAndVerify(_p: unknown): Promise<{ data: null; error: ApiError }> {
      return { data: null, error: { message: "MFA not supported on this backend" } };
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

  private url(method: "GET" | "HEAD"): string {
    const p = new URLSearchParams();
    if (method === "GET") p.set("select", this.s.cols);
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
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      apikey: ANON_KEY,
      ...this.xHeaders(),
    };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    try {
      const res = await fetch(`${API_URL}${this.url("GET")}`, { headers });
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
    const headers: Record<string, string> = { apikey: ANON_KEY, ...this.xHeaders() };
    if (token) headers["Authorization"] = `Bearer ${token}`;
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

class RealtimeChannelImpl implements RealtimeChannel {
  private ws: WebSocket | null = null;
  private topic: string;
  private listeners: Array<{ filter: ChannelFilter; cb: RealtimeCallback }> = [];
  private statusCb: ((s: SubscriptionStatus) => void) | null = null;
  private ping: ReturnType<typeof setInterval> | null = null;
  private reconnect: ReturnType<typeof setTimeout> | null = null;
  private dead = false;
  private ref = 0;
  private retryCount = 0;
  private readonly MAX_RETRIES = 5;

  constructor(topic: string) { this.topic = topic; }

  on<T = Record<string, unknown>>(
    _type: "postgres_changes",
    filter: ChannelFilter,
    cb: RealtimeCallback<T>
  ): this {
    this.listeners.push({ filter, cb: cb as RealtimeCallback });
    return this;
  }

  subscribe(cb?: (s: SubscriptionStatus, err?: Error) => void): this {
    this.statusCb = cb ?? null;
    this.connect();
    return this;
  }

  private connect(): void {
    if (this.dead) return;
    const token = getToken() || ANON_KEY;
    const wsBase = API_URL.replace(/^http/, "ws");
    try {
      this.ws = new WebSocket(`${wsBase}/realtime/v1/websocket?apikey=${encodeURIComponent(token)}&vsn=1.0.0`);
    } catch {
      this.statusCb?.("CHANNEL_ERROR");
      this.scheduleReconnect();
      return;
    }

    this.ws.onopen = () => {
      if (this.dead) { this.ws?.close(); return; }
      this.retryCount = 0; // Reset retry count on successful connection
      this.send({ event: "phx_join", topic: this.topic, payload: {}, ref: String(++this.ref) });
      this.ping = setInterval(() => {
        this.send({ event: "heartbeat", topic: "phoenix", payload: {}, ref: String(++this.ref) });
      }, 25_000);
    };

    this.ws.onmessage = (ev: MessageEvent) => {
      try {
        const msg = JSON.parse(ev.data as string) as Record<string, unknown>;
        const event = msg.event as string;
        const payload = msg.payload as Record<string, unknown>;

        if (event === "phx_reply" && (payload?.status as string) === "ok") {
          this.statusCb?.("SUBSCRIBED");
          return;
        }

        // Server broadcasts payload with type field
        if (payload?.type && (payload.type === "INSERT" || payload.type === "UPDATE" || payload.type === "DELETE")) {
          this.dispatch({
            eventType: payload.type as RealtimeEvent,
            new: (payload.record ?? {}) as Record<string, unknown>,
            old: (payload.old_record ?? {}) as Record<string, unknown>,
            table: (payload.table as string) ?? "",
            schema: "public",
          });
          return;
        }

        if (event === "postgres_changes" || event === "INSERT" || event === "UPDATE" || event === "DELETE") {
          this.dispatch(payload as RealtimePayload);
        }
      } catch { /* ignore */ }
    };

    this.ws.onerror = () => { this.statusCb?.("CHANNEL_ERROR"); };
    this.ws.onclose = () => {
      if (this.ping) clearInterval(this.ping);
      if (!this.dead) { this.statusCb?.("CLOSED"); this.scheduleReconnect(); }
    };
  }

  private dispatch(rec: RealtimePayload): void {
    for (const { filter, cb } of this.listeners) {
      if ((filter.event === "*" || filter.event === rec.eventType) &&
          (!filter.table || filter.table === rec.table)) {
        cb(rec);
      }
    }
  }

  private send(msg: Record<string, unknown>): void {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(msg));
  }

  private scheduleReconnect(): void {
    if (this.dead) return;
    if (this.retryCount >= this.MAX_RETRIES) {
      // Stop reconnecting after max retries to prevent connection storm
      this.statusCb?.("CHANNEL_ERROR");
      return;
    }
    // Exponential backoff: 3s, 6s, 12s, 24s, 48s (max ~60s)
    const delay = Math.min(3_000 * Math.pow(2, this.retryCount), 60_000);
    this.retryCount++;
    this.reconnect = setTimeout(() => { if (!this.dead) this.connect(); }, delay);
  }

  unsubscribe(): void {
    this.dead = true;
    if (this.ping) clearInterval(this.ping);
    if (this.reconnect) clearTimeout(this.reconnect);
    if (this.ws) {
      try { this.send({ event: "phx_leave", topic: this.topic, payload: {}, ref: String(++this.ref) }); this.ws.close(); } catch { /* ignore */ }
      this.ws = null;
    }
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
};

export default api;
