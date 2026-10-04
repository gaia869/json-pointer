import { test } from "node:test";
import assert from "node:assert/strict";

import {
  evaluate,
  parse,
  get,
  has,
  PointerError,
} from "../src/index.js";

test("whole-document pointer returns the root", () => {
  const doc = { a: 1 };
  assert.deepEqual(evaluate("", doc), { value: doc, present: true });
});

test("root pointer with has", () => {
  assert.equal(has("", { a: 1 }), true);
});

test("root pointer with get", () => {
  const doc = { a: 1 };
  assert.equal(get("", doc), doc);
});

test("top-level object key", () => {
  assert.equal(get("/a", { a: 1, b: 2 }), 1);
});

test("nested object path", () => {
  assert.equal(get("/a/b/c", { a: { b: { c: 42 } } }), 42);
});

test("array index", () => {
  assert.equal(get("/0", ["x", "y", "z"]), "x");
  assert.equal(get("/2", ["x", "y", "z"]), "z");
});

test("nested array path", () => {
  assert.equal(get("/a/1/b", { a: [{ b: 0 }, { b: 9 }] }), 9);
});

test("missing object key is not present", () => {
  assert.deepEqual(evaluate("/nope", { a: 1 }), {
    value: undefined,
    present: false,
  });
  assert.equal(has("/nope", { a: 1 }), false);
  assert.equal(get("/nope", { a: 1 }), undefined);
});

test("array index out of range is not present", () => {
  assert.deepEqual(evaluate("/5", [1, 2, 3]), {
    value: undefined,
    present: false,
  });
  assert.equal(has("/5", [1, 2, 3]), false);
});

test("descending into a primitive is not present", () => {
  assert.deepEqual(evaluate("/a/b", { a: 5 }), {
    value: undefined,
    present: false,
  });
});

test("descending into null is not present", () => {
  assert.deepEqual(evaluate("/a/b", { a: null }), {
    value: undefined,
    present: false,
  });
});

test("explicit null value is present", () => {
  assert.deepEqual(evaluate("/a", { a: null }), {
    value: null,
    present: true,
  });
  assert.equal(get("/a", { a: null }), null);
  assert.equal(has("/a", { a: null }), true);
});

test("empty-string object key via single slash", () => {
  const doc = { "": "empty" };
  assert.equal(get("/", doc), "empty");
  assert.equal(has("/", doc), true);
});

test("empty-string key missing", () => {
  assert.equal(has("/", { a: 1 }), false);
});

test("tilde1 decodes to slash", () => {
  const doc = { "a/b": 7 };
  assert.equal(get("/a~1b", doc), 7);
});

test("tilde0 decodes to tilde", () => {
  const doc = { "a~b": 7 };
  assert.equal(get("/a~0b", doc), 7);
});

test("decodeTilde can be disabled", () => {
  const doc = { "a~1b": 7 };
  assert.equal(get("/a~1b", doc, { decodeTilde: false }), 7);
});

test("dangling tilde is rejected", () => {
  assert.throws(() => evaluate("/a~", {}), PointerError);
  assert.throws(() => evaluate("/a~2", {}), PointerError);
});

test("pointer not starting with slash is rejected", () => {
  assert.throws(() => evaluate("foo", {}), PointerError);
});

test("non-string pointer is rejected", () => {
  assert.throws(() => evaluate(42, {}), PointerError);
  assert.throws(() => parse(null), PointerError);
});

test("parse returns segments", () => {
  assert.deepEqual(parse(""), []);
  assert.deepEqual(parse("/a/b"), ["a", "b"]);
  assert.deepEqual(parse("/a~1b/c~0d"), ["a/b", "c~d"]);
});

test("parse single slash yields one empty segment", () => {
  assert.deepEqual(parse("/"), [""]);
});

test("leading-zero array index is not present", () => {
  assert.equal(has("/01", [1, 2, 3]), false);
});

test("non-numeric array index is not present", () => {
  assert.equal(has("/x", [1, 2, 3]), false);
});

test("array index on object is not present", () => {
  assert.equal(has("/0", { 0: 1 }), true);
  assert.equal(has("/0", { a: 1 }), false);
});

test("deeply nested missing key short-circuits", () => {
  assert.deepEqual(evaluate("/a/b/c/d", { a: { b: 5 } }), {
    value: undefined,
    present: false,
  });
});

test("has on present null distinguishes from missing", () => {
  assert.equal(has("/a", { a: null }), true);
  assert.equal(has("/b", { a: null }), false);
});

test("evaluate returns the located primitive value", () => {
  assert.deepEqual(evaluate("/a/b", { a: { b: 0 } }), {
    value: 0,
    present: true,
  });
});

test("evaluate returns the located false value", () => {
  assert.deepEqual(evaluate("/flag", { flag: false }), {
    value: false,
    present: true,
  });
});
