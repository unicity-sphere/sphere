import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useSphereContext } from '../../../../sdk/hooks/core/useSphere';
import { moduleActions } from '../../../../modules/registry';

/**
 * Actions contributed by wallet modules (src/modules). Two pieces because the
 * wallet view stacks by DOM order: the buttons sit under the built-in ones, and
 * the screens are mounted at the END of the view next to the built-in modals,
 * so they paint above the tab bar and the lists like every other screen does.
 * The view owns only which action is open.
 */
export function ModuleActionButtons({ onOpen }: { onOpen: (id: string) => void }) {
  const { network } = useSphereContext();
  const actions = useMemo(() => moduleActions(network), [network]);
  if (actions.length === 0) return null;

  return (
    <div
      className="grid gap-2 sm:gap-3 mt-2 sm:mt-3"
      style={{ gridTemplateColumns: `repeat(${actions.length}, minmax(0, 1fr))` }}
    >
      {actions.map(({ id, label, icon: Icon }) => (
        <motion.button
          key={id}
          whileHover={{ scale: 1.02, y: -2 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onOpen(id)}
          className="relative px-2 py-2.5 sm:px-3 sm:py-3 rounded-xl bg-neutral-100 dark:bg-[rgba(255,255,255,0.06)] hover:bg-neutral-200 dark:hover:bg-[rgba(255,255,255,0.1)] text-neutral-900 dark:text-white text-xs sm:text-sm flex items-center justify-center gap-1.5 sm:gap-2 whitespace-nowrap"
        >
          <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span>{label}</span>
        </motion.button>
      ))}
    </div>
  );
}

/** Every module action's screen, always mounted; the one whose id is `openId` is shown. */
export function ModuleScreens({ openId, onClose }: { openId: string | null; onClose: () => void }) {
  const { network } = useSphereContext();
  const actions = useMemo(() => moduleActions(network), [network]);
  return (
    <>
      {actions.map(({ id, Screen }) => (
        <Screen key={id} isOpen={openId === id} onClose={onClose} />
      ))}
    </>
  );
}
