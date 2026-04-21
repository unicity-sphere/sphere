import { DesktopShortcuts } from '../desktop/DesktopShortcuts';

export function MobileAppsView() {
  return (
    <div className="absolute inset-0 z-[100] flex flex-col bg-white dark:bg-[#060606] lg:hidden overflow-y-auto">
      <div className="shrink-0 px-4 py-3 border-b border-neutral-100 dark:border-[rgba(255,255,255,0.06)]">
        <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">Apps</h2>
      </div>
      <DesktopShortcuts />
    </div>
  );
}
