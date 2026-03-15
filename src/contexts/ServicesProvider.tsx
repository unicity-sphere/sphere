import React, { useState, useEffect, useMemo, type ReactNode } from 'react';
import { ServicesContext } from './ServicesContext';
import { useSphereContext } from '../sdk/hooks/core/useSphere';
import { PINNED_GROUP_IDS } from '../components/chat/utils/groupChatHelpers';

export const ServicesProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isGroupChatConnected, setIsGroupChatConnected] = useState(false);
  const { adapter, groupChat: ctxGroupChat } = useSphereContext();

  const groupChat = ctxGroupChat;

  // Auto-connect group chat when available
  useEffect(() => {
    if (!groupChat || !adapter) return;

    groupChat.connect().then(async () => {
      setIsGroupChatConnected(await groupChat.getConnectionStatus());
    }).catch((err) => {
      console.error('[ServicesProvider] Group chat connect failed:', err);
    });

    // On address change, reload group chat data and reconnect.
    // The SDK now stores groups per-address (STORAGE_KEYS_ADDRESS), so load()
    // reads the new address's data and connect() restores from relay if needed.
    const handleIdentityChange = async () => {
      setIsGroupChatConnected(false);
      try {
        await groupChat.load();
        await groupChat.connect();
        setIsGroupChatConnected(await groupChat.getConnectionStatus());
      } catch (err) {
        console.error('[ServicesProvider] Group chat reconnect failed:', err);
      }
    };

    // Auto-join pinned groups when connected (if not already a member)
    const handleConnection = (data?: unknown) => {
      const { connected } = data as { connected: boolean };
      setIsGroupChatConnected(connected);
      if (connected) {
        groupChat.getGroups().then(groups => {
          const joinedIds = new Set(groups.map(g => g.id));
          for (const id of PINNED_GROUP_IDS) {
            if (!joinedIds.has(id)) {
              groupChat.joinGroup(id).catch(() => {});
            }
          }
        });
      }
    };

    adapter.on('groupchat:connection', handleConnection);
    adapter.on('identity:changed', handleIdentityChange);

    return () => {
      adapter.off('groupchat:connection', handleConnection);
      adapter.off('identity:changed', handleIdentityChange);
    };
  }, [groupChat, adapter]);

  const value = useMemo(() => ({
    groupChat,
    isGroupChatConnected,
  }), [groupChat, isGroupChatConnected]);

  return (
    <ServicesContext.Provider value={value}>
      {children}
    </ServicesContext.Provider>
  );
};
