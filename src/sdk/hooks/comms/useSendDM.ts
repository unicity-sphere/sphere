import { useMutation } from '@tanstack/react-query';
import { useSphereContext } from '../core/useSphere';
import type { DirectMessage } from '@unicitylabs/sphere-sdk';

export interface UseSendDMReturn {
  sendDM: (params: { recipient: string; content: string }) => Promise<DirectMessage>;
  isLoading: boolean;
  error: Error | null;
}

export function useSendDM(): UseSendDMReturn {
  const { adapter } = useSphereContext();

  const mutation = useMutation({
    mutationFn: async ({ recipient, content }: { recipient: string; content: string }): Promise<DirectMessage> => {
      if (!adapter) throw new Error('Wallet not initialized');
      return adapter.sendDM(recipient, content);
    },
    // onError inherited from global handler → auto-toast
  });

  return {
    sendDM: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error,
  };
}
