import { useState } from 'react';
import { X } from 'lucide-react';

export function UxfBanner() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="relative flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium text-center"
      style={{
        background: 'var(--color-brand-uxf-dim, rgba(34,197,94,0.08))',
        borderBottom: '1px solid var(--color-brand-uxf-border, rgba(34,197,94,0.30))',
        color: 'var(--color-brand-uxf, #22c55e)',
      }}
    >
      <span>
        Experimental UXF build — Profile data uses OrbitDB sync; features may change without notice.
      </span>
      <button
        onClick={() => setDismissed(true)}
        aria-label="Dismiss UXF banner"
        className="absolute right-2 p-0.5 rounded opacity-70 hover:opacity-100 transition-opacity"
        style={{ color: 'inherit' }}
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
