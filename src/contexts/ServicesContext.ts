import { createContext } from 'react';
import type { IGroupChatAdapter } from '../sdk/adapter/group-chat-types';

export interface ServicesContextType {
  groupChat: IGroupChatAdapter | null;
  isGroupChatConnected: boolean;
}

export const ServicesContext = createContext<ServicesContextType | undefined>(undefined);
