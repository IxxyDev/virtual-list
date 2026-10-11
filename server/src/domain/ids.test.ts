import { test } from 'node:test';
import assert from 'node:assert/strict';
import { matches, normalizeQuery, parseId } from './ids.ts';

test('parses ids from numbers and strings', () => {
  assert.equal(parseId(5), 5);
  assert.equal(parseId('5'), 5);
  assert.equal(parseId(' 007 '), 7);
  assert.equal(parseId(0), null);
  assert.equal(parseId(-1), null);
  assert.equal(parseId(1.5), null);
  assert.equal(parseId('abc'), null);
  assert.equal(parseId('99999999999999999999'), null);
  assert.equal(parseId(undefined), null);
});

test('matches by substring and normalizes the query', () => {
  assert.ok(matches(1500, '50'));
  assert.ok(!matches(1005, '50'));
  assert.ok(matches(7, ''));
  assert.equal(normalizeQuery(' 12 '), '12');
  assert.equal(normalizeQuery(''), '');
  assert.equal(normalizeQuery('1a'), null);
});
