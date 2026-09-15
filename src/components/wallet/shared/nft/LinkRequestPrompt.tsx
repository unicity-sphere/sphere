import type { LinkRequest } from '../../../../sdk/hooks/payments/linkFetchGate';

interface LinkRequestPromptProps {
  request: LinkRequest;
  /** What the link holds, starting the sentence: "Image", "Video", "Audio" or "Metadata". */
  noun: string;
  /** The user asked, and the file could not be loaded. */
  failed: boolean;
}

/**
 * Asks before an NFT link is fetched from a host its minter chose (#785), and says
 * what loading it gives away.
 */
export function LinkRequestPrompt({ request, noun, failed }: LinkRequestPromptProps) {
  return (
    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-neutral-400">
      <span className="break-all">
        {failed
          ? `${noun} could not be loaded from ${request.host}`
          : `${noun} hosted at ${request.host}. Loading it shows that site your IP address.`}
      </span>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          request.load();
        }}
        className="rounded-md bg-white/10 px-2 py-0.5 font-medium text-neutral-200 hover:bg-white/20"
      >
        {failed ? 'Try again' : 'Load'}
      </button>
    </div>
  );
}
