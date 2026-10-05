# json-pointer-rfc6901

A zero-dependency ESM implementation of RFC 6901 JSON Pointer evaluation. Locates values inside plain JavaScript objects and arrays by pointer string.

## Usage

```js
import { get, has, parse, evaluate, PointerError } from "./src/index.js";

const doc = { a: [1, 2, { "b/c": 3 }] };

get("", doc);                    // the whole document
get("/a/0", doc);                // 1
get("/a/2/b~1c", doc);            // 3   (~1 decodes to /)
has("/a/9", doc);                // false
parse("/a/2/b~1c");               // ["a", "2", "b/c"]
evaluate("/a/2/b~1c", doc);       // { value: 3, present: true }

try {
  evaluate("bad", doc);
} catch (e) {
  e instanceof PointerError;     // true
}
```

## Why

The problem is small and self-contained: take a pointer string, walk a document, return what you find. Pulling in a library that also does patch, diff, and schema validation just to read a pointer adds weight and failure modes. This library does only RFC 6901 evaluation and exposes the few names above.

The trade-off is that `get()` returns `undefined` for both "missing" and "explicitly null" values. If you need to tell them apart, use `evaluate()` or `has()`, both of which report `present` separately from `value`. We do not throw on missing pointers by design; most pointer code wants a soft lookup.

## Edge cases worth knowing

- A pointer that does not start with `/` (and is not the empty string `""`) is rejected with `PointerError`. The empty string names the whole document.
- `/` on an object names the empty-string key `""`, not the root. On an array it is not present (the empty string is not a valid array index).
- Array indices with a leading zero (e.g. `/01`) are treated as not present, per the RFC's notion of a member name. We do not coerce them.
- `~1` decodes to `/` and `~0` decodes to `~` by default. Pass `{ decodeTilde: false }` to read segments verbatim. A dangling `~` not followed by `0` or `1` is a `PointerError`.
