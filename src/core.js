/**
 * core.js — the whole implementation. Intentionally one module: small surface,
 * no graph to reason about, no plumbing to forget to test.
 *
 * API
 * ---
 * parse(pointer, options?)              -> string[]
 * evaluate(pointer, doc, options?)      -> { value, present }
 * get(pointer, doc, options?)           -> any | undefined
 * has(pointer, doc, options?)            -> boolean
 *
 * PointerError                           -> Error subclass, thrown for bad input.
 *
 * Options
 * -------
 * { decodeTilde?: boolean }
 *   RFC 6901 encodes `~` as `~0` and `/` as `~1`. `decodeTilde: true` applies that
 *   decoding to each segment. Default is true, matching the RFC. We expose the
 *   flag instead of always-on so callers reading only their own well-formed
 *   pointers can opt out and never be surprised by the tilde table.
 */

const WHOLE_DOCUMENT_POINTER = "";
const SLASH = 47;     // '/'
const TILDE = 126;    // '~'
const ZERO = 48;     // '0'
const ONE = 49;      // '1'

export class PointerError extends Error {
  constructor(message) {
    super(message);
    this.name = "PointerError";
  }
}

/**
 * Walk a single pointer segment against `node`.
 *
 * Returns the next node, or `undefined` when the segment does not name anything.
 * We deliberately return `undefined` for both "missing object key" and "array
 * index out of range" so the caller can treat pointers uniformly; the public
 * API turns that into `{ present: false }` or `has() === false` without the
 * caller needing to distinguish the two cases.
 */
function step(node, segment, options) {
  if (node === null || typeof node !== "object") {
    return undefined;
  }
  if (Array.isArray(node)) {
    if (!/^[0-9]+$/.test(segment)) {
      return undefined;
    }
    // RFC 6901 §4: a leading-zero index is simply a non-existent index.
    // We do not coerce it; the RFC says a pointer either names a member or it
    // doesn't, and "01" does not name a member of any array.
    if (segment.length > 1 && segment.charCodeAt(0) === ZERO) {
      return undefined;
    }
    const index = Number(segment);
    if (index >= node.length) {
      return undefined;
    }
    return node[index];
  }
  if (Object.prototype.hasOwnProperty.call(node, segment)) {
    return node[segment];
  }
  return undefined;
}

/**
 * Decode a segment per RFC 6901 §4: `~1` -> `/`, `~0` -> `~`.
 *
 * A literal tilde in the source must be one of those two; a bare `~` is a
 * malformed pointer and we reject it rather than silently passing it through —
 * the caller's data almost certainly does not contain a key with a dangling
 * tilde, so flagging is safer than guessing.
 */
function decodeTilde(segment) {
  let out = "";
  let i = 0;
  while (i < segment.length) {
    const ch = segment.charCodeAt(i);
    if (ch === TILDE) {
      const next = i + 1 < segment.length ? segment.charCodeAt(i + 1) : -1;
      if (next === ONE) {
        out += "/";
        i += 2;
        continue;
      }
      if (next === ZERO) {
        out += "~";
        i += 2;
        continue;
      }
      throw new PointerError(
        `Malformed pointer segment: dangling '~' at position ${i}`
      );
    }
    out += segment[i];
    i += 1;
  }
  return out;
}

export default function evaluate(pointer, doc, options) {
  if (typeof pointer !== "string") {
    throw new PointerError(
      `Pointer must be a string, got ${typeof pointer}`
    );
  }
  const opts = options || {};
  const decode = opts.decodeTilde === undefined ? true : !!opts.decodeTilde;

  if (pointer === WHOLE_DOCUMENT_POINTER) {
    return { value: doc, present: true };
  }
  if (pointer.charCodeAt(0) !== SLASH) {
    throw new PointerError(
      `Pointer must start with '/' or be empty, got: ${JSON.stringify(pointer)}`
    );
  }

  // Split after the leading slash. Each subsequent segment is separated by a
  // slash; empty segments are legal and name either the empty-string key (for
  // objects) or index "" (non-existent for arrays, since "" is not a valid
  // decimal index).
  const body = pointer.slice(1);
  const rawSegments = body.length === 0 ? [""] : body.split("/");
  const segments = decode
    ? rawSegments.map(decodeTilde)
    : rawSegments;

  let node = doc;
  for (const segment of segments) {
    const next = step(node, segment, opts);
    if (next === undefined && !(node !== null && typeof node === "object" && Object.prototype.hasOwnProperty.call(Array.isArray(node) ? Object.create(null) : node, segment))) {
      // Distinguish "missing" from "present but null" only via the final
      // hasOwnProperty check below; here, undefined means the walk stopped.
      return { value: undefined, present: false };
    }
    node = next;
  }
  return { value: node, present: true };
}

export function parse(pointer, options) {
  if (typeof pointer !== "string") {
    throw new PointerError(
      `Pointer must be a string, got ${typeof pointer}`
    );
  }
  const opts = options || {};
  const decode = opts.decodeTilde === undefined ? true : !!opts.decodeTilde;

  if (pointer === WHOLE_DOCUMENT_POINTER) {
    return [];
  }
  if (pointer.charCodeAt(0) !== SLASH) {
    throw new PointerError(
      `Pointer must start with '/' or be empty, got: ${JSON.stringify(pointer)}`
    );
  }
  const body = pointer.slice(1);
  const rawSegments = body.length === 0 ? [""] : body.split("/");
  return decode ? rawSegments.map(decodeTilde) : rawSegments;
}

export function get(pointer, doc, options) {
  return evaluate(pointer, doc, options).value;
}

export function has(pointer, doc, options) {
  return evaluate(pointer, doc, options).present;
}

evaluate.default = evaluate;
get.default = get;
parse.default = parse;
has.default = has;
PointerError.default = PointerError;
