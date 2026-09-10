// Response id-normalizer: NEW Postgres backend returns `id` (UUID) on every
// entity and never emits `_id`. The ported frontend treats `_id` as THE
// canonical identifier everywhere (React keys, follow-up URL building, nested
// ref reads). To bridge both worlds we additively inject `_id` alongside `id`
// in every plain object of a response body, without ever stripping/renaming
// `id` (write paths that echo `id` back to the server must keep working).
//
// Wired into the SUCCESS branch of BOTH axios response interceptors
// (lib/api/client.ts and lib/axios.ts) so every call site is covered with zero
// component changes (all helpers return response.data, which we mutate in place).

const MAX_DEPTH = 6;

/**
 * Recursively inject `_id` from `id` on every plain JSON object.
 *
 * Rules:
 * - Bounded recursion (depth cap) guards against pathological/cyclic graphs.
 * - Only plain objects (proto === Object.prototype | null) and arrays are
 *   walked; Date/Map/Set/File/Blob/FormData and other class instances are
 *   returned untouched.
 * - Recurse FIRST, then inject, so the freshly added `_id` is never re-walked.
 * - Inject only when `id` is a string and `_id` is absent — never clobber a
 *   real `_id`, never overwrite, never delete or rename `id`.
 */
export function normalizeIds<T>(node: T, depth = 0): T {
  // (1) cap recursion to avoid pathological / cyclic graphs.
  if (depth > MAX_DEPTH) return node;

  // (2) primitives / null / undefined pass straight through.
  if (node === null || typeof node !== 'object') return node;

  // (3) arrays: normalize each element.
  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i++) {
      node[i] = normalizeIds(node[i], depth + 1);
    }
    return node;
  }

  // (4) plain-object guard: skip Date, File, Blob, FormData, Map, Set, and any
  // other class instance so we never mutate non-JSON values.
  const proto = Object.getPrototypeOf(node);
  if (proto !== Object.prototype && proto !== null) return node;

  // Recurse into every own value FIRST.
  const obj = node as Record<string, unknown>;
  for (const k of Object.keys(obj)) {
    obj[k] = normalizeIds(obj[k], depth + 1);
  }

  // THEN inject `_id` from a string `id` only when `_id` is absent.
  if (typeof obj.id === 'string' && obj._id === undefined) {
    obj._id = obj.id;
  }

  return node;
}
