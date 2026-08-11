import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// DesktopLayout.tsx's `renderTabContent` special-cases the "dm" tab: it
// renders `<DMChatSection />` directly (see its `case 'dm'`), NOT through
// ChatSection, and passes no `pendingRecipient` prop at all. ChatSection's
// own ?peer=/?nametag= handling (ChatSection.peerParam.test.tsx) is
// therefore unreachable from the real /agents/dm route today — the only
// importer of ChatSection is DesktopLayout, and its switch never falls
// through to the `default: return <ChatSection />` branch for a known
// agent id. DMChatSection already reads ?nametag= itself for exactly this
// reason (its own effect, independent of the `pendingRecipient` prop); this
// suite pins that ?peer= must be read the same way, or ProjectPage's
// Message link silently does nothing when actually clicked.
const { useChat, NewConversationModal } = vi.hoisted(() => ({
  useChat: vi.fn(),
  NewConversationModal: vi.fn(() => null),
}));

vi.mock('../../../src/components/chat/hooks/useChat', () => ({ useChat }));
vi.mock('../../../src/components/chat/dm/NewConversationModal', () => ({ NewConversationModal }));
vi.mock('../../../src/components/chat/dm/DMConversationList', () => ({ DMConversationList: () => null }));
vi.mock('../../../src/components/chat/dm/DMMessageList', () => ({ DMMessageList: () => null }));
vi.mock('../../../src/components/chat/dm/DMChatInput', () => ({ DMChatInput: () => null }));

import { DMChatSection } from '../../../src/components/chat/dm/DMChatSection';

function renderAt(path: string) {
  useChat.mockReturnValue({
    selectedConversation: null,
    selectConversation: vi.fn(),
    startNewConversation: vi.fn(),
    messages: [],
    isLoadingMessages: false,
    sendMessage: vi.fn(),
    isSending: false,
    messageInput: '',
    setMessageInput: vi.fn(),
    searchQuery: '',
    setSearchQuery: vi.fn(),
    filteredConversations: [],
    isRecipientTyping: false,
    hasMore: false,
    loadMore: vi.fn(),
  });
  return render(
    <MemoryRouter initialEntries={[path]}>
      <DMChatSection />
    </MemoryRouter>,
  );
}

function receivedInitialValue(value: string) {
  return NewConversationModal.mock.calls.some(
    ([props]) => props.isOpen === true && props.initialValue === value,
  );
}

beforeEach(() => { vi.clearAllMocks(); });

describe('DMChatSection — ?peer= deep link (the route DesktopLayout actually renders for /agents/dm)', () => {
  it('pre-fills the new-conversation modal with a ?peer= value verbatim, unlike ?nametag=', () => {
    renderAt('/agents/dm?peer=DIRECT://00ab12');
    expect(receivedInitialValue('DIRECT://00ab12')).toBe(true);
  });
});
