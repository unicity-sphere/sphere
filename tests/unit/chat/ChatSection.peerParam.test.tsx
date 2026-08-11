import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// vi.mock factories are hoisted above regular top-level `const`s, so the mocks
// referenced inside the factories below must themselves be created via
// vi.hoisted to avoid a TDZ ReferenceError.
const { DMChatSection, GroupChatSection } = vi.hoisted(() => ({
  DMChatSection: vi.fn(() => null),
  GroupChatSection: vi.fn(() => null),
}));

vi.mock('../../../src/components/chat/dm/DMChatSection', () => ({ DMChatSection }));
vi.mock('../../../src/components/chat/group/GroupChatSection', () => ({ GroupChatSection }));

import { ChatSection } from '../../../src/components/chat/ChatSection';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ChatSection />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

// React 19 invokes a plain function component with an explicit second
// argument (`undefined`, its legacy-context slot) — `expect.anything()`
// does NOT match `undefined` (only null/undefined are excluded by
// definition), so `toHaveBeenCalledWith(objectContaining(...), anything())`
// fails on that positional arg even once the props themselves are correct.
// Reading `.mock.calls` directly sidesteps that entirely and is what this
// suite actually cares about: some render call received the right props.
function receivedPendingRecipient(mockFn: typeof DMChatSection, value: string) {
  return mockFn.mock.calls.some(([props]) => props.pendingRecipient === value);
}

describe('ChatSection — ?peer= deep link', () => {
  it('passes a ?peer= value through verbatim as the pending recipient', () => {
    renderAt('/agents/dm?peer=DIRECT://00ab12');
    expect(receivedPendingRecipient(DMChatSection, 'DIRECT://00ab12')).toBe(true);
  });

  it('still lowercases and slugifies the legacy ?nametag= value', () => {
    renderAt('/agents/dm?nametag=@Bot%20One');
    expect(receivedPendingRecipient(DMChatSection, 'bot-one')).toBe(true);
  });
});
