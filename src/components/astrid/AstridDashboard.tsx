import { useState } from 'react';
import { LayoutDashboard, Wallet, Boxes, Plug, BarChart3 } from 'lucide-react';
import { DashboardOverview } from './dashboard/DashboardOverview';
import { DashboardBalance } from './dashboard/DashboardBalance';
import { DashboardCapsules } from './dashboard/DashboardCapsules';
import { DashboardIntegrations } from './dashboard/DashboardIntegrations';
import { DashboardStats } from './dashboard/DashboardStats';

export type DashboardTab = 'overview' | 'balance' | 'capsules' | 'integrations' | 'stats';

const TABS: { id: DashboardTab; label: string; Icon: typeof LayoutDashboard }[] = [
  { id: 'overview', label: 'Overview', Icon: LayoutDashboard },
  { id: 'balance', label: 'Balance', Icon: Wallet },
  { id: 'capsules', label: 'Capsules', Icon: Boxes },
  { id: 'integrations', label: 'Integrations', Icon: Plug },
  { id: 'stats', label: 'Stats', Icon: BarChart3 },
];

export function AstridDashboard() {
  const [tab, setTab] = useState<DashboardTab>('overview');

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="px-6 py-3 border-b border-neutral-200 dark:border-white/8 flex items-center gap-1 overflow-x-auto scrollbar-hide">
        {TABS.map(({ id, label, Icon }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                active
                  ? 'bg-orange-500/15 text-orange-600 dark:text-orange-400'
                  : 'text-neutral-500 dark:text-white/55 hover:bg-neutral-100 dark:hover:bg-white/6'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          );
        })}
      </div>

      <div className="flex-1 overflow-y-auto">
        {tab === 'overview' && <DashboardOverview onNavigate={setTab} />}
        {tab === 'balance' && <DashboardBalance />}
        {tab === 'capsules' && <DashboardCapsules />}
        {tab === 'integrations' && <DashboardIntegrations />}
        {tab === 'stats' && <DashboardStats />}
      </div>
    </div>
  );
}
