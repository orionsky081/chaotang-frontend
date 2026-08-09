import assert from 'node:assert/strict';
import test from 'node:test';

import { normalizeSession } from './session-claims';

function tokenFor(claims: Record<string, unknown>): string {
  const encoded = Buffer.from(JSON.stringify(claims))
    .toString('base64url');
  return `e2e-header.${encoded}.e2e-signature`;
}

test('real backend admin claim grants imperial final-decision authority', () => {
  const session = normalizeSession(tokenFor({
    user_id: 101,
    tenant_slug: 'acme',
    role: 'admin',
  }));

  assert.equal(session?.isAdmin, true);
  assert.equal(session?.canFinalDecide, true);
});

test('delegated final_decider claim grants final-decision authority without becoming admin', () => {
  const session = normalizeSession(tokenFor({
    user_id: 102,
    tenant_slug: 'acme',
    role: 'final_decider',
  }));

  assert.equal(session?.isAdmin, false);
  assert.equal(session?.canFinalDecide, true);
});

test('real backend user claim is explicitly read-only', () => {
  const session = normalizeSession(tokenFor({
    user_id: 103,
    tenant_slug: 'acme',
    role: 'user',
  }));

  assert.equal(session?.isAdmin, false);
  assert.equal(session?.canFinalDecide, false);
});

test('unparseable legacy E2E token stays unknown instead of being treated as a real user', () => {
  assert.equal(normalizeSession('e2e-access'), null);
});
