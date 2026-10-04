/**
 * json-pointer-rfc6901 — RFC 6901 JSON Pointer evaluation for ESM.
 *
 * Public surface:
 *   - get(pointer, doc, options?)      Locate a value by pointer.
 *   - parse(pointer, options?)        Decode a pointer string into segments.
 *   - evaluate(pointer, doc, options?)  Resolve a full pointer (from "").
 *   - has(pointer, doc, options?)     True if the pointer names something.
 *   - PointerError                      Subclass of Error for pointer problems.
 *
 * Only pure runtime values cross this boundary; no schema or validation lives here.
 */

export { default as evaluate, parse, get, has, PointerError } from "./core.js";
