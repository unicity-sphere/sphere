import { useContext } from 'react';
import { Sphere } from '@unicitylabs/sphere-sdk';
import { SphereContext, type SphereContextValue } from '../../SphereContext';
import type { ISphereAdapter } from '../../adapter/types';
import type { IGroupChatAdapter } from '../../adapter/group-chat-types';

export function useSphereContext(): SphereContextValue {
  const context = useContext(SphereContext);
  if (!context) {
    throw new Error('useSphereContext must be used within SphereProvider');
  }
  return context;
}

export function useSphere(): Sphere {
  const { sphere } = useSphereContext();
  if (!sphere) {
    throw new Error('Wallet not initialized');
  }
  return sphere;
}

/** Get the platform adapter (throws if not initialized) */
export function useAdapter(): ISphereAdapter {
  const { adapter } = useSphereContext();
  if (!adapter) {
    throw new Error('Adapter not initialized');
  }
  return adapter;
}

/** Get the platform adapter or null */
export function useOptionalAdapter(): ISphereAdapter | null {
  return useSphereContext().adapter;
}

/** Get the group chat adapter (throws if not available) */
export function useGroupChatAdapter(): IGroupChatAdapter {
  const { groupChat } = useSphereContext();
  if (!groupChat) {
    throw new Error('Group chat not available');
  }
  return groupChat;
}

/** Get the group chat adapter or null */
export function useOptionalGroupChatAdapter(): IGroupChatAdapter | null {
  return useSphereContext().groupChat;
}
