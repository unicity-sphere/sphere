// tests/unit/no-direct-in-ui.test.ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// Files converted to pubkey-first display by #411 (+ the #413 derive-address
// flow). LookupModal (My Public Keys), DocsPage and DevelopersPage are
// intentionally NOT listed — DIRECT lives there.
const CHANGED_UI_FILES = [
  'src/components/wallet/shared/components/AddressSelector.tsx',
  'src/components/wallet/shared/modals/NewAddressModal.tsx',
  'src/components/wallet/shared/hooks/useNewAddressFlow.ts',
  'src/components/wallet/L3/modals/AddressManagerModal.tsx',
  'src/components/wallet/L3/modals/SendModal.tsx',
  'src/components/wallet/L3/modals/SendPaymentRequestModal.tsx',
  'src/components/wallet/L3/modals/TransactionHistoryModal.tsx',
  'src/components/chat/dm/NewConversationModal.tsx',
  'src/components/wallet/onboarding/components/AddressSelectionScreen.tsx',
  'src/components/marketplace/ProjectReviewsSection.tsx',
  'src/components/marketplace/ReviewReplies.tsx',
  'src/sdk/hooks/core/useIdentity.ts',
];

// User-facing copy patterns — not code-level compatibility checks.
const FORBIDDEN = [
  /direct address/i,   // labels, placeholders, helper text, tooltips
  /DIRECT:\/\/\.\.\./, // the old input placeholder literal (any quoting)
  /L3 Address/,        // the old history DetailRow label
];

describe('#411 — DIRECT address stays out of converted UI files', () => {
  for (const file of CHANGED_UI_FILES) {
    it(`${file} has no user-facing DIRECT copy`, () => {
      const src = readFileSync(join(process.cwd(), file), 'utf8');
      for (const pattern of FORBIDDEN) {
        expect(src).not.toMatch(pattern);
      }
    });
  }
});
