import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  detectStorageState,
  UXF_MIGRATION_SKIP_KEY,
  UXF_MIGRATION_CHOICE_KEY,
  type UxfMigrationChoice,
} from '../../config/uxf';

type PromptVariant = 'legacy-only' | 'both';

interface MigrationPromptProps {
  onChoice: (choice: UxfMigrationChoice, eraseLegacy: boolean) => void;
  onSkip: () => void;
  variant: PromptVariant;
}

function MigrationModal({ onChoice, onSkip, variant }: MigrationPromptProps) {
  const [eraseLegacy, setEraseLegacy] = useState(false);
  const [selected, setSelected] = useState<UxfMigrationChoice>('merge');

  const isBoth = variant === 'both';

  function handleConfirm() {
    onChoice(isBoth ? selected : 'merge', eraseLegacy);
  }

  const showEraseCheckbox = !isBoth || selected !== 'legacy-only';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 8 }}
        transition={{ duration: 0.18 }}
        className="relative z-10 w-full max-w-md rounded-2xl border p-6 shadow-2xl"
        style={{
          background: 'var(--color-bg-secondary)',
          borderColor: 'var(--color-brand-uxf-border, rgba(34,197,94,0.30))',
          boxShadow: '0 0 40px var(--color-brand-uxf-glow, rgba(34,197,94,0.15))',
        }}
      >
        <h2
          className="text-base font-semibold mb-1"
          style={{ color: 'var(--color-text-primary)' }}
        >
          {isBoth ? 'Legacy & UXF profiles detected' : 'Legacy wallet detected'}
        </h2>
        <p className="text-xs mb-4" style={{ color: 'var(--color-text-secondary)' }}>
          {isBoth
            ? 'Both a legacy wallet and a UXF OrbitDB profile exist in this browser. Choose how to proceed.'
            : 'Your wallet uses the legacy IndexedDB schema. Migrate to the new UXF OrbitDB profile to unlock cross-device sync.'}
        </p>

        {isBoth ? (
          <div className="flex flex-col gap-2 mb-4">
            {(
              [
                { value: 'merge' as const, label: 'Merge into UXF profile', sublabel: 'Recommended — combine both into OrbitDB' },
                { value: 'legacy-only' as const, label: 'Load legacy only', sublabel: 'Ignore the UXF profile for this session' },
                { value: 'uxf-only' as const, label: 'Load UXF only', sublabel: 'Ignore the legacy wallet for this session' },
              ] satisfies { value: UxfMigrationChoice; label: string; sublabel: string }[]
            ).map(({ value, label, sublabel }) => (
              <label
                key={value}
                className="flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors"
                style={{
                  borderColor: selected === value
                    ? 'var(--color-brand-uxf, #22c55e)'
                    : 'var(--color-border-primary)',
                  background: selected === value
                    ? 'var(--color-brand-uxf-dim, rgba(34,197,94,0.08))'
                    : 'transparent',
                }}
              >
                <input
                  type="radio"
                  className="mt-0.5 accent-green-500"
                  checked={selected === value}
                  onChange={() => setSelected(value)}
                />
                <span>
                  <span className="block text-xs font-medium" style={{ color: 'var(--color-text-primary)' }}>
                    {label}
                  </span>
                  <span className="block text-xs" style={{ color: 'var(--color-text-tertiary)' }}>
                    {sublabel}
                  </span>
                </span>
              </label>
            ))}
          </div>
        ) : null}

        {showEraseCheckbox && (
          <label className="flex items-center gap-2 mb-5 cursor-pointer select-none">
            <input
              type="checkbox"
              className="rounded accent-green-500"
              checked={eraseLegacy}
              onChange={e => setEraseLegacy(e.target.checked)}
            />
            <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              Erase legacy profile after successful migration
            </span>
          </label>
        )}

        <div className="flex gap-2">
          <button
            onClick={handleConfirm}
            className="flex-1 py-2 px-4 rounded-xl text-xs font-semibold transition-colors"
            style={{
              background: 'var(--color-brand-uxf, #22c55e)',
              color: '#000',
            }}
          >
            {isBoth ? 'Confirm' : 'Migrate'}
          </button>
          <button
            onClick={onSkip}
            className="py-2 px-4 rounded-xl text-xs font-medium border transition-colors"
            style={{
              borderColor: 'var(--color-border-primary)',
              color: 'var(--color-text-secondary)',
            }}
          >
            Skip
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export function UxfMigrationPrompt() {
  const [variant, setVariant] = useState<PromptVariant | null>(null);

  useEffect(() => {
    const skipped = sessionStorage.getItem(UXF_MIGRATION_SKIP_KEY);
    const persisted = localStorage.getItem(UXF_MIGRATION_CHOICE_KEY);
    if (skipped || persisted) return;

    detectStorageState().then(({ hasLegacy, hasUxf }) => {
      if (hasLegacy && hasUxf) setVariant('both');
      else if (hasLegacy) setVariant('legacy-only');
    });
  }, []);

  function handleChoice(choice: UxfMigrationChoice, eraseLegacy: boolean) {
    localStorage.setItem(UXF_MIGRATION_CHOICE_KEY, JSON.stringify({ choice, eraseLegacy }));
    setVariant(null);
    // Actual migration execution is delegated to SphereProvider / the SDK;
    // we just record the user's intent here so it survives page reloads.
    window.dispatchEvent(new CustomEvent('sphere:uxf-migration-choice', { detail: { choice, eraseLegacy } }));
  }

  function handleSkip() {
    sessionStorage.setItem(UXF_MIGRATION_SKIP_KEY, '1');
    setVariant(null);
  }

  return (
    <AnimatePresence>
      {variant && (
        <MigrationModal
          key={variant}
          variant={variant}
          onChoice={handleChoice}
          onSkip={handleSkip}
        />
      )}
    </AnimatePresence>
  );
}
