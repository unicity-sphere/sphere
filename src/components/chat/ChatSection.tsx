import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DMChatSection } from './dm/DMChatSection';
import { GroupChatSection } from './group/GroupChatSection';
import { STORAGE_KEYS } from '../../config/storageKeys';
import type { ChatMode } from '../../types';

export function ChatSection() {
  const [searchParams, setSearchParams] = useSearchParams();
  // Priority: 1) join param -> global, 2) nametag/peer param -> dm, 3) saved mode, 4) default dm
  const [chatMode, setChatMode] = useState<ChatMode>(() => {
    if (searchParams.get('join')) return 'global';
    if (searchParams.get('nametag') || searchParams.get('peer')) return 'dm';
    const saved = localStorage.getItem(STORAGE_KEYS.CHAT_MODE);
    return (saved === 'global' || saved === 'dm') ? saved : 'dm';
  });
  const [pendingDmRecipient, setPendingDmRecipient] = useState<string | null>(null);

  // Persist chat mode changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CHAT_MODE, chatMode);
  }, [chatMode]);

  // Handle URL params for DM navigation from other agents (P2P, SellAnything, etc.)
  useEffect(() => {
    const nametag = searchParams.get('nametag');
    if (nametag) {
      const cleanNametag = nametag.startsWith('@') ? nametag.slice(1) : nametag;
      const formattedNametag = cleanNametag.toLowerCase().replace(/\s+/g, '-');
      setPendingDmRecipient(formattedNametag);
      setSearchParams((prev) => {
        prev.delete('nametag');
        prev.delete('product');
        prev.delete('image');
        prev.delete('price');
        prev.delete('purchased');
        return prev;
      });
    }
  }, [searchParams, setSearchParams]);

  // `peer` carries any identifier the SDK resolves — @nametag, DIRECT://, or a
  // pubkey — and is passed through UNCHANGED. The older `nametag` param is
  // lowercased and slugified above, which is right for a display name typed
  // by a human and wrong for a DIRECT:// address or a hex key, so the two
  // cannot share one param. startNewConversation normalizes whatever arrives.
  useEffect(() => {
    const peer = searchParams.get('peer');
    if (peer) {
      setPendingDmRecipient(peer);
      setChatMode('dm');
      // `replace: true` — same rationale as DMChatSection's own ?peer=
      // effect: a push here would make this strip itself a Back-button stop,
      // bouncing the user between the deep link and its stripped form.
      setSearchParams((prev) => {
        prev.delete('peer');
        return prev;
      }, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const handleModeChange = (mode: string, dmRecipient?: string) => {
    if (mode === 'dm' && dmRecipient) {
      setPendingDmRecipient(dmRecipient);
    }
    setChatMode(mode as ChatMode);
  };

  const handleDmRecipientHandled = () => {
    setPendingDmRecipient(null);
  };

  // DM mode - render DMChatSection
  if (chatMode === 'dm') {
    return (
      <DMChatSection
        pendingRecipient={pendingDmRecipient}
        onPendingRecipientHandled={handleDmRecipientHandled}
      />
    );
  }

  // Global mode - render GroupChatSection
  return <GroupChatSection onModeChange={handleModeChange} />;
}
