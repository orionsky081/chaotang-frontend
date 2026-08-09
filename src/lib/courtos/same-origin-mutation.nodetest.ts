import assert from 'node:assert/strict';
import test from 'node:test';

import { sameOriginMutationError } from './same-origin-mutation.ts';

test('同源裁决 POST 必须同时通过 Origin 和 Fetch Metadata', () => {
  const accepted = new Request('https://court.example/chaotang/api/decision', {
    method: 'POST',
    headers: {
      Origin: 'https://court.example',
      'Sec-Fetch-Site': 'same-origin',
    },
  });
  assert.equal(sameOriginMutationError(accepted), null);

  for (const headers of [
    { Origin: 'https://evil.example', 'Sec-Fetch-Site': 'cross-site' },
    { Origin: 'https://court.example' },
    { 'Sec-Fetch-Site': 'same-origin' },
  ]) {
    const rejected = sameOriginMutationError(new Request(
      'https://court.example/chaotang/api/decision',
      { method: 'POST', headers },
    ));
    assert.equal(rejected?.status, 403);
  }
});
