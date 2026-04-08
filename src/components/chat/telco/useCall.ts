import { useContext } from 'react';
import { CallContext, type CallContextValue } from './CallContext';

/**
 * Hook to access call functionality.
 * Must be used within a CallProvider.
 */
export function useCall(): CallContextValue {
  const ctx = useContext(CallContext);
  if (!ctx) {
    throw new Error('useCall must be used within a CallProvider');
  }
  return ctx;
}
