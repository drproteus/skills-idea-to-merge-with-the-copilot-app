import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  addBookmark,
  formatBookmark,
  normalizeUrl,
  parseStoredBookmarks,
  generateSlug,
} from './bookmarks.ts';

test('URL with and without https:// normalises to the same value', () => {
  assert.equal(normalizeUrl('www.example.com'), 'https://www.example.com');
  assert.equal(normalizeUrl('https://www.example.com'), 'https://www.example.com');
  assert.equal(normalizeUrl('  https://www.example.com/  '), normalizeUrl('www.example.com'));
  assert.equal(normalizeUrl('javascript:alert(1)'), null);
  assert.equal(normalizeUrl('not a url'), null);
});

test('loading bad stored values recovers instead of throwing', () => {
  const good = { url: 'https://a.com', slug: 'mona-7fk2' };
  assert.deepEqual(parseStoredBookmarks(null), []);
  assert.deepEqual(parseStoredBookmarks(''), []);
  assert.deepEqual(parseStoredBookmarks('{not json'), []);
  assert.deepEqual(parseStoredBookmarks('{"url":"https://a.com","slug":"mona-1"}'), []);
  assert.deepEqual(parseStoredBookmarks('"text"'), []);
  assert.deepEqual(parseStoredBookmarks('["https://a.com"]'), []);
  assert.deepEqual(
    parseStoredBookmarks(JSON.stringify([good, null, 5, { url: 1, slug: 'x' }, { url: 'https://b.com' }])),
    [good],
  );
});

test('bookmark formats as "<url> :: <slug>"', () => {
  assert.equal(
    formatBookmark({ url: 'https://www.example.com', slug: 'mona-7fk2' }),
    'https://www.example.com :: mona-7fk2',
  );
});

test('addBookmark generates a mona- base62 slug and rejects invalid input', () => {
  const list = addBookmark([], 'example.com');
  assert.ok(list);
  assert.match(list[0].slug, /^mona-[0-9a-zA-Z]{4}$/);
  assert.match(generateSlug(), /^mona-[0-9a-zA-Z]{4}$/);
  assert.equal(addBookmark([], '???'), null);
});
