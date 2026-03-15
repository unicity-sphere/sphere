// Adapter infrastructure for multi-platform SDK access

// Types
export type { ISphereAdapter } from './types';
export type { IGroupChatAdapter } from './group-chat-types';
export type { EventCallback } from './events';

// Event emitter
export { AdapterEventEmitter } from './events';

// Web implementations
export { DirectAdapter } from './DirectAdapter';
export { DirectGroupChatAdapter } from './DirectGroupChatAdapter';

// Extension implementations
export { ExtensionAdapter } from './ExtensionAdapter';
export { ExtGroupChatAdapter } from './ExtGroupChatAdapter';
