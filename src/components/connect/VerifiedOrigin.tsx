interface VerifiedOriginProps {
  /** The transport-verified origin. NEVER dapp.url. */
  origin: string;
  /** Goes on the single element whose textContent is EXACTLY `origin`. Keep it on that element. */
  testId?: string;
  size?: 'sm' | 'md' | 'lg';
  /** 'span' when the origin opens a sentence (the rejection modal); 'p' otherwise. */
  as?: 'p' | 'span';
  className?: string;
}

/**
 * The address the wallet is actually talking to, set the way a browser's address bar sets one:
 * scheme muted, host emphasised, inside ONE element so its textContent is still exactly the
 * origin a test or a reader compares against.
 *
 * Connect-specific on purpose rather than part of the shared UI kit: what it encodes is the
 * Connect rule that the TRANSPORT-VERIFIED origin is the trust anchor and the dApp's own
 * `dapp.url` is decoration. There is deliberately no "verified" badge and no eyebrow caption —
 * the emphasis is the label, and the single trust sentence on the approval screen is what says
 * out loud which guarantee this is.
 */
export function VerifiedOrigin({ origin, testId, size = 'md', as = 'p', className = '' }: VerifiedOriginProps) {
  // ConnectPage's origin is a RAW ?origin= search param: nothing on that page runs it through
  // isUsableOrigin, so `new URL(origin)` can throw, and a normalising URL could also hand back
  // something that is not the string we were given. Either way we fall back to the raw text,
  // because the one invariant is that this element's textContent IS the origin — the screen that
  // exists to explain a failure must not be the screen that throws.
  let parts: { scheme: string; host: string } | null = null;
  try {
    const url = new URL(origin);
    if (`${url.protocol}//${url.host}` === origin) parts = { scheme: `${url.protocol}//`, host: url.host };
  } catch {
    /* fall through to the raw string */
  }

  const Tag = as;
  const sizeClass = { sm: 'text-xs', md: 'text-sm', lg: 'text-base' }[size];

  return (
    <Tag data-testid={testId} className={`font-mono break-all leading-snug ${sizeClass} ${className}`}>
      {parts ? (
        <>
          <span className="text-neutral-400 dark:text-white/40">{parts.scheme}</span>
          <span className="font-semibold text-neutral-900 dark:text-white">{parts.host}</span>
        </>
      ) : (
        <span className="font-semibold text-neutral-900 dark:text-white">{origin}</span>
      )}
    </Tag>
  );
}
