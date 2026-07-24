import { Plus, ArrowUpRight, ArrowDownUp, Loader2, Coins, Layers, Eye, EyeOff, Wifi, Shield, AlertCircle, FileJson } from 'lucide-react';
import { AnimatePresence, motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { AssetRow } from '../../shared/components';
import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useIdentity, useAssets, useTokens } from '../../../../sdk';
import { useSphereContext } from '../../../../sdk/hooks/core/useSphere';
import { CreateWalletFlow } from '../../onboarding/CreateWalletFlow';
import { TokenRow } from '../../shared/components';
import { SendModal } from '../modals/SendModal';
import { SwapModal } from '../modals/SwapModal';
import { PaymentRequestsModal } from '../modals/PaymentRequestModal';
import { TopUpModal } from '../modals/TopUpModal';
import { SeedPhraseModal } from '../modals/SeedPhraseModal';
import { TransactionHistoryModal } from '../modals/TransactionHistoryModal';
import { SettingsModal } from '../modals/SettingsModal';
import { BackupWalletModal, LogoutConfirmModal } from '../../shared/modals';
import { WalletScreen } from '../../ui/WalletScreen';
import { ModalHeader } from '../../ui';
type Tab = 'assets' | 'tokens';

// Animated balance display with smooth number transitions
function BalanceDisplay({
  totalValue,
  showBalances,
  onToggle,
  isLoading
}: {
  totalValue: number;
  showBalances: boolean;
  onToggle: () => void;
  isLoading?: boolean;
}) {
  const motionValue = useMotionValue(0);
  const displayed = useTransform(motionValue, (v) =>
    `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  );

  useEffect(() => {
    // Only animate if current value differs from target
    if (Math.abs(motionValue.get() - totalValue) > 0.001) {
      const controls = animate(motionValue, totalValue, {
        duration: 0.5,
        ease: 'easeOut',
      });
      return controls.stop;
    }
  }, [totalValue, motionValue]);

  return (
    <div className="flex items-center gap-3">
      <h2 className="text-4xl text-neutral-900 dark:text-[#fefefe] font-bold tracking-tight" style={{ fontFamily: "'Geist Mono', monospace" }}>
        {isLoading ? (
          <span className="inline-flex items-center gap-2">
            <span className="inline-block w-32 h-9 bg-neutral-200 dark:bg-[rgba(255,255,255,0.07)] rounded-lg animate-pulse" />
          </span>
        ) : showBalances ? (
          <motion.span>{displayed}</motion.span>
        ) : (
          '••••••'
        )}
      </h2>
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={onToggle}
        className="p-1.5 hover:bg-neutral-100 dark:hover:bg-[rgba(255,255,255,0.06)] rounded-lg transition-colors text-neutral-400 dark:text-[rgba(255,255,255,0.28)] hover:text-neutral-900 dark:hover:text-white"
        title={showBalances ? "Hide balances" : "Show balances"}
      >
        {showBalances ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
      </motion.button>
    </div>
  );
}

// Inline status line showing current wallet activity
function WalletStatusLine({
  isLoadingAssets,
  pendingCount,
}: {
  isLoadingAssets: boolean;
  pendingCount: number;
}) {
  const items: { label: string; spinning?: boolean }[] = [];

  if (isLoadingAssets) items.push({ label: 'Loading assets', spinning: true });
  if (pendingCount > 0) items.push({ label: `${pendingCount} pending transfer${pendingCount > 1 ? 's' : ''}` });

  if (items.length === 0) return null;

  // Show the first (most relevant) status item
  const current = items[0];

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={current.label}
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 4 }}
        className="flex items-center justify-center gap-1.5 text-xs text-neutral-400 dark:text-[rgba(255,255,255,0.28)]"
      >
        {current.spinning ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : (
          <Wifi className="w-3 h-3" />
        )}
        <span>{current.label}...</span>
      </motion.div>
    </AnimatePresence>
  );
}

interface L3WalletViewProps {
  showBalances: boolean;
  setShowBalances: (value: boolean) => void;
  isHistoryOpen: boolean;
  setIsHistoryOpen: (value: boolean) => void;
  isRequestsOpen: boolean;
  setIsRequestsOpen: (value: boolean) => void;
  isSettingsOpen: boolean;
  setIsSettingsOpen: (value: boolean) => void;
  paymentRequests: import('../hooks/useIncomingPaymentRequests').IncomingPaymentRequest[];
  paymentRequestsPendingCount: number;
  paymentRequestsReject: (request: import('../hooks/useIncomingPaymentRequests').IncomingPaymentRequest) => Promise<void>;
  paymentRequestsPay: (request: import('../hooks/useIncomingPaymentRequests').IncomingPaymentRequest) => Promise<void>;
  paymentRequestsClearProcessed: () => void;
}

export function L3WalletView({
  showBalances,
  setShowBalances,
  isHistoryOpen,
  setIsHistoryOpen,
  isRequestsOpen,
  setIsRequestsOpen,
  isSettingsOpen,
  setIsSettingsOpen,
  paymentRequests,
  paymentRequestsPendingCount,
  paymentRequestsReject,
  paymentRequestsPay,
  paymentRequestsClearProcessed,
}: L3WalletViewProps) {
  const navigate = useNavigate();

  // SDK hooks
  const { identity, isLoading: isLoadingIdentity } = useIdentity();
  const { assets: sdkAssets, isLoading: isLoadingAssets } = useAssets();
  const { tokens: sdkTokens, pendingTokens } = useTokens();
  const { sphere, deleteWallet } = useSphereContext();

  const assets = sdkAssets;

  const tokens = sdkTokens;
  const sendableTokens = useMemo(() => tokens.filter(t => t.coinId !== 'NAMETAG'), [tokens]);

  const [activeTab, setActiveTab] = useState<Tab>('assets');
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);
  const [isSwapModalOpen, setIsSwapModalOpen] = useState(false);
  const [isSeedPhraseOpen, setIsSeedPhraseOpen] = useState(false);
  const [seedPhrase, setSeedPhrase] = useState<string[]>([]);
  const [isTopUpModalOpen, setIsTopUpModalOpen] = useState(false);

  // Track previous token/asset IDs to detect truly new items
  const prevTokenIdsRef = useRef<Set<string>>(new Set());
  const prevAssetCoinIdsRef = useRef<Set<string>>(new Set());
  const isFirstLoadRef = useRef(true);

  // Compute new token IDs by comparing with previous snapshot
  const newTokenIds = useMemo(() => {
    if (isFirstLoadRef.current) {
      return new Set<string>(); // First load - no animations
    }

    const newIds = new Set<string>();
    tokens.filter(t => t.coinId !== 'NAMETAG').forEach(token => {
      if (!prevTokenIdsRef.current.has(token.id)) {
        newIds.add(token.id);
      }
    });
    return newIds;
  }, [tokens]);

  // Compute new asset IDs by comparing with previous snapshot
  const newAssetCoinIds = useMemo(() => {
    if (isFirstLoadRef.current) {
      return new Set<string>(); // First load - no animations
    }

    const newIds = new Set<string>();
    assets.forEach(asset => {
      if (!prevAssetCoinIdsRef.current.has(asset.coinId)) {
        newIds.add(asset.coinId);
      }
    });
    return newIds;
  }, [assets]);

  // Update previous snapshots after render (for next comparison)
  useEffect(() => {
    const currentIds = new Set(tokens.filter(t => t.coinId !== 'NAMETAG').map(t => t.id));
    prevTokenIdsRef.current = currentIds;
    isFirstLoadRef.current = false;
  }, [tokens]);

  useEffect(() => {
    const currentIds = new Set(assets.map(a => a.coinId));
    prevAssetCoinIdsRef.current = currentIds;
  }, [assets]);

  // New modal states
  const [isBackupOpen, setIsBackupOpen] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const [isSaveWalletOpen, setIsSaveWalletOpen] = useState(false);

  // Stable callback for toggling balance visibility (for memoized BalanceDisplay)
  const handleToggleBalances = useCallback(() => {
    setShowBalances(!showBalances);
  }, [showBalances, setShowBalances]);

  const totalValue = useMemo(() => {
    // Sum up L3 asset values (using SDK-provided fiat values for accuracy)
    return sdkAssets.reduce((sum, asset) => sum + (asset.fiatValueUsd ?? 0), 0);
  }, [sdkAssets]);

  const handleShowSeedPhrase = () => {
    if (!sphere) return;
    const mnemonic = sphere.getMnemonic();
    if (mnemonic) {
      setSeedPhrase(mnemonic.split(' '));
      setIsSeedPhraseOpen(true);
    } else {
      alert("Recovery phrase not available.\n\nThis wallet was imported from a file that doesn't contain a mnemonic phrase. Only the master key was imported.");
    }
  };

  // Check if wallet was created from mnemonic (not legacy file import)
  const hasMnemonic = useMemo(() => {
    const source = sphere?.getWalletInfo()?.source;
    return source !== 'file' && source !== 'unknown';
  }, [sphere]);

  // Handle export wallet file (using SDK's exportToJSON)
  const handleExportWalletFile = () => {
    setIsSaveWalletOpen(true);
  };

  // Handle save wallet
  const handleSaveWallet = async (filename: string, password?: string) => {
    if (!sphere) return;
    try {
      const jsonData = await sphere.exportToJSON({ password, includeMnemonic: true });
      const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename.endsWith('.json') ? filename : `${filename}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setIsSaveWalletOpen(false);
    } catch (err) {
      console.error('Failed to save wallet:', err);
    }
  };

  // Handle logout
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      // Await full cleanup before navigating so IntroPage sees clean state.
      await deleteWallet();
      navigate('/', { replace: true });
    } catch (err) {
      console.error('Failed to logout:', err);
      setIsLoggingOut(false);
    }
  };

  // Handle backup and logout
  const handleBackupAndLogout = () => {
    // Keep the logout confirm mounted (z-10) behind the Backup screen (z-20) so
    // Backup slides in cleanly on top instead of crossing the logout panel's
    // slide-out. Closing Backup returns to the logout confirm.
    setIsBackupOpen(true);
  };

  if (isLoadingIdentity) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <Loader2 className="animate-spin text-neutral-400 dark:text-neutral-600" />
        <WalletStatusLine
          isLoadingAssets={isLoadingAssets}
          pendingCount={0}
        />
      </div>
    );
  }

  if (!identity) {
    return <CreateWalletFlow />;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Main Balance - Centered with Eye Toggle */}
      <div className="px-6 mb-6 shrink-0">
        <div className="flex flex-col items-center justify-center mb-6 pt-2">
          <BalanceDisplay
            totalValue={totalValue}
            showBalances={showBalances}
            onToggle={handleToggleBalances}
            isLoading={isLoadingAssets && totalValue === 0}
          />
          <WalletStatusLine
            isLoadingAssets={isLoadingAssets}
            pendingCount={pendingTokens.length}
          />
        </div>

        {/* Actions - Speed focused */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <motion.button
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setIsTopUpModalOpen(true)}
            className="relative px-2 py-2.5 sm:px-3 sm:py-3 rounded-xl bg-linear-to-br from-orange-500 to-orange-600 dark:from-brand-orange dark:to-brand-orange-dark text-white text-xs sm:text-sm flex items-center justify-center gap-1.5 sm:gap-2 overflow-hidden whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>Top Up</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setIsSwapModalOpen(true)}
            className="relative px-2 py-2.5 sm:px-3 sm:py-3 rounded-xl bg-neutral-100 dark:bg-[rgba(255,255,255,0.06)] hover:bg-neutral-200 dark:hover:bg-[rgba(255,255,255,0.1)] text-neutral-900 dark:text-white text-xs sm:text-sm flex items-center justify-center gap-1.5 sm:gap-2 whitespace-nowrap"
          >
            <ArrowDownUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>Swap</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: sendableTokens.length > 0 ? 1.02 : 1, y: sendableTokens.length > 0 ? -2 : 0 }}
            whileTap={{ scale: sendableTokens.length > 0 ? 0.98 : 1 }}
            onClick={() => setIsSendModalOpen(true)}
            disabled={sendableTokens.length === 0}
            className="relative px-2 py-2.5 sm:px-3 sm:py-3 rounded-xl bg-neutral-100 dark:bg-[rgba(255,255,255,0.06)] hover:bg-neutral-200 dark:hover:bg-[rgba(255,255,255,0.1)] text-neutral-900 dark:text-white text-xs sm:text-sm flex items-center justify-center gap-1.5 sm:gap-2 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ArrowUpRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>Send</span>
          </motion.button>
        </div>

      </div>

      <div className="px-6 mb-4 shrink-0">
        <div className="flex p-1 bg-neutral-100 dark:bg-white/6 rounded-xl relative">
          {/* Sliding indicator */}
          <div
            className={`absolute top-1 bottom-1 bg-white dark:bg-white/10 rounded-lg shadow-sm transition-all duration-250 ease-in-out ${
              activeTab === 'tokens' ? 'left-[50%] right-1' : 'left-1 right-[50%]'
            }`}
          />
          <button
            onClick={() => setActiveTab('assets')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-medium rounded-lg transition-colors relative z-10 ${activeTab === 'assets' ? 'text-neutral-900 dark:text-[#fefefe]' : 'text-neutral-500 hover:text-neutral-700 dark:text-white/35 dark:hover:text-white'}`}
          >
            <Layers className="w-3 h-3" /> Assets
          </button>
          <button
            onClick={() => setActiveTab('tokens')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-medium rounded-lg transition-colors relative z-10 ${activeTab === 'tokens' ? 'text-neutral-900 dark:text-[#fefefe]' : 'text-neutral-500 hover:text-neutral-700 dark:text-white/35 dark:hover:text-white'}`}
          >
            <Coins className="w-3 h-3" /> Tokens
          </button>
        </div>
      </div>

      {/* Assets List */}
      <div className="p-6 pt-0 flex-1 overflow-y-auto custom-scrollbar">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm text-neutral-500 dark:text-[rgba(255,255,255,0.45)]" style={{ fontFamily: "'Geist Mono', monospace" }}>Network Assets</h4>
        </div>

        <div className="relative min-h-50">
          {isLoadingAssets ? (
            <div className="py-10 text-center">
              <Loader2 className="w-6 h-6 text-orange-500 animate-spin mx-auto" />
            </div>
          ) : (
            <>
              {/* ASSETS VIEW - no container animation, only item animations */}
              {activeTab === 'assets' && (
                <div className="space-y-2">
                  {assets.length === 0 ? (
                    <EmptyState />
                  ) : (
                    assets.map((asset, index) => (
                      <AssetRow
                        key={asset.coinId}
                        asset={asset}
                        showBalances={showBalances}
                        delay={newAssetCoinIds.has(asset.coinId) ? (index + 1) * 0.05 : 0}
                        layer="L3"
                        isNew={newAssetCoinIds.has(asset.coinId)}
                      />
                    ))
                  )}
                </div>
              )}

              {/* TOKENS VIEW - no container animation, only item animations */}
              {activeTab === 'tokens' && (
                <div className="space-y-2">
                  {tokens.filter(t => t.coinId !== 'NAMETAG').length === 0 ? (
                    <EmptyState text="No individual tokens found." />
                  ) : (
                    tokens
                      .filter(t => t.coinId !== 'NAMETAG')
                      .sort((a, b) => b.createdAt - a.createdAt)
                      .map((token, index) => (
                        <TokenRow
                          key={token.id}
                          token={token}
                          delay={newTokenIds.has(token.id) ? index * 0.05 : 0}
                          isNew={newTokenIds.has(token.id)}
                        />
                      ))
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Modals */}
      <TopUpModal isOpen={isTopUpModalOpen} onClose={() => setIsTopUpModalOpen(false)} />
      <SendModal isOpen={isSendModalOpen} onClose={() => setIsSendModalOpen(false)} />
      <SwapModal isOpen={isSwapModalOpen} onClose={() => setIsSwapModalOpen(false)} />
      <PaymentRequestsModal
        isOpen={isRequestsOpen}
        onClose={() => setIsRequestsOpen(false)}
        requests={paymentRequests}
        pendingCount={paymentRequestsPendingCount}
        reject={paymentRequestsReject}
        pay={paymentRequestsPay}
        clearProcessed={paymentRequestsClearProcessed}
      />
      <TransactionHistoryModal isOpen={isHistoryOpen} onClose={() => setIsHistoryOpen(false)} />

      {/* New Modals */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onBackupWallet={() => setIsBackupOpen(true)}
        onLogout={() => setIsLogoutConfirmOpen(true)}
        hasMnemonic={hasMnemonic}
      />

      <BackupWalletModal
        isOpen={isBackupOpen}
        onClose={() => setIsBackupOpen(false)}
        onExportWalletFile={handleExportWalletFile}
        onShowRecoveryPhrase={handleShowSeedPhrase}
        hasMnemonic={hasMnemonic}
      />

      {/* Rendered AFTER Settings/Backup so, when opened from the Backup
          drill-in (which keeps Settings mounted behind it), the seed screen
          stacks ON TOP of them instead of being hidden behind the menu. */}
      <SeedPhraseModal
        isOpen={isSeedPhraseOpen}
        onClose={() => setIsSeedPhraseOpen(false)}
        seedPhrase={seedPhrase}
      />

      <LogoutConfirmModal
        isOpen={isLogoutConfirmOpen}
        onClose={() => setIsLogoutConfirmOpen(false)}
        onBackupAndLogout={handleBackupAndLogout}
        onLogoutWithoutBackup={handleLogout}
        isLoggingOut={isLoggingOut}
      />

      <SaveWalletModal
        show={isSaveWalletOpen}
        onConfirm={handleSaveWallet}
        onCancel={() => setIsSaveWalletOpen(false)}
        hasMnemonic={hasMnemonic}
        defaultFilename={identity?.nametag?.replace(/^@/, '') || 'sphere_wallet_backup'}
      />

    </div>
  );
}

// Helper Component
function EmptyState({ text }: { text?: string }) {
  return (
    <div className="text-center py-10 flex flex-col items-center gap-3">
      <div className="w-12 h-12 rounded-full bg-neutral-100 dark:bg-[rgba(255,255,255,0.06)] flex items-center justify-center">
        <Coins className="w-6 h-6 text-neutral-300 dark:text-[rgba(255,255,255,0.2)]" />
      </div>
      <div className="text-neutral-500 text-sm">
        {text || <>Wallet is empty.<br />Mint some tokens to start!</>}
      </div>
    </div>
  );
}

// Wallet-export ("Backup Wallet") modal. Generic L3 wallet JSON export —
// inlined here because it is consumed only by this view.
interface SaveWalletModalProps {
  show: boolean;
  onConfirm: (filename: string, password?: string) => void;
  onCancel: () => void;
  /** Whether mnemonic is available (shows indicator) */
  hasMnemonic?: boolean;
  /** Default filename (without extension) */
  defaultFilename?: string;
}

function SaveWalletModal({ show, onConfirm, onCancel, hasMnemonic, defaultFilename = "sphere_wallet_backup" }: SaveWalletModalProps) {
  const [filename, setFilename] = useState(defaultFilename);
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [error, setError] = useState("");

  const handleConfirm = () => {
    setError("");
    if (password) {
      if (password !== passwordConfirm) {
        setError("Passwords do not match!");
        return;
      }
      if (password.length < 4) {
        setError("Password must be at least 4 characters");
        return;
      }
    }

    onConfirm(filename, password || undefined);

    // Reset state
    setFilename(defaultFilename);
    setPassword("");
    setPasswordConfirm("");
    setError("");
  };

  return (
    <WalletScreen isOpen={show} onClose={onCancel} className="!z-30">
      <ModalHeader variant="screen" title="Backup Wallet" onClose={onCancel} />
      <div className="px-6 py-8 flex flex-col flex-1 overflow-y-auto">
        <div className="flex flex-col items-center text-center mb-6">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
            className="w-16 h-16 bg-orange-500/10 rounded-full flex items-center justify-center mb-4"
          >
            <motion.div
              animate={{ y: [0, -2, 0] }}
              transition={{ delay: 0.2, duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            >
              <Shield className="w-7 h-7 text-orange-500" />
            </motion.div>
          </motion.div>
          <p className="text-xs text-neutral-500 dark:text-white/45">
            Export your wallet keys to a JSON file. Keep this safe!
          </p>
        </div>

        {/* Format indicator */}
        <div className="flex items-center justify-center gap-2 mb-4 p-2 bg-orange-500/10 border border-orange-500/20 rounded-lg">
          <FileJson className="w-4 h-4 text-orange-500" />
          <span className="text-sm text-orange-500 font-medium">JSON Format</span>
          {hasMnemonic && (
            <span className="text-[10px] bg-green-500/20 text-green-500 px-1.5 py-0.5 rounded">
              +mnemonic
            </span>
          )}
        </div>

        <p className="text-[10px] text-neutral-400 mb-4 text-center">
          Includes verification address{hasMnemonic ? " and recovery phrase" : ""}
        </p>

        <label className="text-xs text-neutral-500 mb-1 block">
          Filename
        </label>
        <input
          placeholder="Filename"
          value={filename}
          onChange={(e) => setFilename(e.target.value)}
          className="w-full mb-3 px-4 py-3 bg-neutral-100 dark:bg-white/6 rounded-xl text-neutral-800 dark:text-neutral-200 placeholder-neutral-400 border border-neutral-200 dark:border-white/8 focus:border-orange-500 outline-none transition-colors"
        />

        <label className="text-xs text-neutral-500 mb-1 block">
          Encryption Password (Optional)
        </label>
        <input
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full mb-3 px-4 py-3 bg-neutral-100 dark:bg-white/6 rounded-xl text-neutral-800 dark:text-neutral-200 placeholder-neutral-400 border border-neutral-200 dark:border-white/8 focus:border-orange-500 outline-none transition-colors"
        />

        <input
          placeholder="Confirm Password"
          type="password"
          value={passwordConfirm}
          onChange={(e) => setPasswordConfirm(e.target.value)}
          className="w-full mb-4 px-4 py-3 bg-neutral-100 dark:bg-white/6 rounded-xl text-neutral-800 dark:text-neutral-200 placeholder-neutral-400 border border-neutral-200 dark:border-white/8 focus:border-orange-500 outline-none transition-colors"
        />

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-3 bg-red-500/10 border border-red-900/50 rounded-lg flex items-center gap-2"
          >
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <span className="text-red-400 text-sm">{error}</span>
          </motion.div>
        )}

        <div className="flex gap-3 mt-2">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onCancel}
            className="flex-1 py-3 bg-neutral-100 dark:bg-white/6 rounded-xl text-neutral-700 dark:text-white/65 hover:bg-neutral-200 dark:hover:bg-white/10 transition-colors font-medium"
          >
            Cancel
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleConfirm}
            className="flex-1 py-3 bg-orange-500 hover:bg-orange-600 rounded-xl text-white font-medium transition-all shadow-lg shadow-orange-500/20"
          >
            Save
          </motion.button>
        </div>
      </div>
    </WalletScreen>
  );
}
