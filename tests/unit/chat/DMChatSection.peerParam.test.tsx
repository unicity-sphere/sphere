import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter, createMemoryRouter, RouterProvider } from 'react-router-dom';

// DesktopLayout.tsx's `renderTabContent` special-cases the "dm" tab: it
// renders `<DMChatSection />` directly (see its `case 'dm'`), NOT through
// ChatSection, and passes no `pendingRecipient` prop at all. ChatSection's
// own ?peer=/?nametag= forwarding is therefore unreachable from the real
// /agents/dm route today — the only importer of ChatSection is
// DesktopLayout, and its switch never falls through to the
// `default: return <ChatSection />` branch for a known agent id.
// DMChatSection already reads both params itself for exactly this reason
// (its own two effects, independent of the `pendingRecipient` prop); this
// suite pins that both are read the same way here, or ProjectPage's Message
// link (?peer=) and other agents' legacy DM links (?nametag=) silently do
// nothing when actually clicked. A twin suite used to exercise the same two
// cases through ChatSection itself (ChatSection.peerParam.test.tsx) — it was
// deleted rather than fixed alongside this file's TS2493/TS18048 mock-typing
// errors, since it only ever asserted behaviour through the code path above
// that no real route reaches; these two cases are the ones worth keeping,
// and they belong here, against the component a user can actually hit.
type NewConversationModalProps = { isOpen: boolean; initialValue?: string };

const { useChat, NewConversationModal } = vi.hoisted(() => ({
  useChat: vi.fn(),
  // Typed via vi.fn's generic (the same pattern exploreTypeTabs.test.tsx
  // already uses), not by naming a parameter the implementation ignores:
  // `vi.fn(() => null)` infers `Mock<() => null>`, whose `.mock.calls` is
  // `[][]` — destructuring `([props])` off that is a compile error (TS2493
  // tuple-index / TS18048 possibly-undefined), not a runtime one (vitest
  // transpiles through esbuild, which erases types), so it only ever showed
  // up in `npm run typecheck:tests`, a separate CI job from the suite that
  // was passing. Naming the param instead (`(_props: …) => null`) would fix
  // that but fail lint instead (`@typescript-eslint/no-unused-vars` — this
  // repo sets no `argsIgnorePattern` for a leading underscore).
  NewConversationModal: vi.fn<(props: NewConversationModalProps) => null>(() => null),
}));

vi.mock('../../../src/components/chat/hooks/useChat', () => ({ useChat }));
vi.mock('../../../src/components/chat/dm/NewConversationModal', () => ({ NewConversationModal }));
vi.mock('../../../src/components/chat/dm/DMConversationList', () => ({ DMConversationList: () => null }));
vi.mock('../../../src/components/chat/dm/DMMessageList', () => ({ DMMessageList: () => null }));
vi.mock('../../../src/components/chat/dm/DMChatInput', () => ({ DMChatInput: () => null }));

import { DMChatSection } from '../../../src/components/chat/dm/DMChatSection';

const useChatDefaults = {
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
};

function renderAt(path: string) {
  useChat.mockReturnValue(useChatDefaults);
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

describe('DMChatSection — ?peer=/?nametag= deep links (the route DesktopLayout actually renders for /agents/dm)', () => {
  it('pre-fills the new-conversation modal with a ?peer= value verbatim, unlike ?nametag=', () => {
    renderAt('/agents/dm?peer=DIRECT://00ab12');
    expect(receivedInitialValue('DIRECT://00ab12')).toBe(true);
  });

  // Folded in from the deleted ChatSection.peerParam.test.tsx: the legacy
  // param IS lowercased/slugified, unlike ?peer= above — right for a
  // human-typed display name, wrong for a DIRECT:// address or a hex key,
  // which is exactly why the two params can't share one handler.
  it('lowercases and slugifies the legacy ?nametag= value', () => {
    renderAt('/agents/dm?nametag=@Bot%20One');
    expect(receivedInitialValue('bot-one')).toBe(true);
  });
});

// I3: clicking Message on a chat agent's ProjectPage lands here via
// `?peer=`, and the effect that consumes the param strips it from the URL
// via setSearchParams. Without `{ replace: true }` that strip is a PUSH, so
// the browser history reads .../dm?peer=X -> .../dm — and pressing Back
// lands back on the `?peer=` entry, whose effect fires again and pushes
// forward a second time. The user bounces in place and the project page
// (the entry before the deep link) becomes unreachable by Back.
describe('DMChatSection — ?peer= history entry', () => {
  it('replaces the ?peer= entry rather than pushing, so Back does not re-trigger it', () => {
    useChat.mockReturnValue(useChatDefaults);
    const router = createMemoryRouter(
      [{ path: '/agents/dm', element: <DMChatSection /> }],
      { initialEntries: ['/agents/dm?peer=DIRECT://00ab12'] },
    );
    render(<RouterProvider router={router} />);

    // The initial load is a POP; the effect's own setSearchParams call is
    // the only navigation that happens after that, so its action is exactly
    // what we're checking here.
    expect(router.state.historyAction).toBe('REPLACE');
    expect(router.state.location.search).toBe('');
  });
});
