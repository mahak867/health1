import test from 'node:test';
import assert from 'node:assert/strict';
import { hashToken } from './token.js';

test('hashToken is deterministic and non-empty', () => {
  const one = hashToken('sample-refresh-token');
  const two = hashToken('sample-refresh-token');
  const three = hashToken('different-token');

  assert.equal(one, two);
  assert.notEqual(one, three);
  assert.equal(one.length, 64);
});
