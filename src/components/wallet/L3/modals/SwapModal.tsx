import { useState, useMemo, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowDownUp, Loader2, CheckCircle, ChevronDown } from 'lucide-react';
import { useAssets, useTransfer } from '../../../../sdk';
import type { Asset } from '@unicitylabs/sphere-sdk';
import { parseTokenAmount, toHumanReadable } from '@unicitylabs/sphere-sdk';
import { TokenRegistry } from '@unicitylabs/sphere-sdk';
import { useSphereContext } from '../../../../sdk/hooks/core/useSphere';
import { SPHERE_KEYS } from '../../../../sdk/queryKeys';
import { getErrorMessage } from '../../../../sdk/errors';
import { WalletScreen } from '../../ui/WalletScreen';
import { ModalHeader } from '../../ui';

type Step = 'swap' | 'processing' | 'success';

const FALLBACK_PRICES: Record<string, { priceUsd: number; priceEur: number }> = {
  unicity:       { priceUsd: 1.0, priceEur: 0.92 },
  'unicity-usd': { priceUsd: 1.0, priceEur: 0.92 },
};

function formatAssetAmount(asset: Asset): string {
  return toHumanReadable(asset.totalAmount, asset.decimals);
}

interface SwapModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SwapModal({ isOpen, onClose }: SwapModalProps) {
  const { assets } = useAssets();
  const { transfer } = useTransfer();
  const { sphere, providers } = useSphereContext();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<Step>('swap');
  const [fromAsset, setFromAsset] = useState<Asset | null>(null);
  const [toAsset, setToAsset] = useState<Asset | null>(null);
  const [fromAmount, setFromAmount] = useState('');
  const [showFromDropdown, setShowFromDropdown] = useState(false);
  const [showToDropdown, setShowToDropdown] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [allSwappableAssets, setAllSwappableAssets] = useState<Asset[]>([]);
  const [isSwapHovered, setIsSwapHovered] = useState(false);

  useEffect(() => {
    const loadSwappableCoins = async () => {
      const registry = TokenRegistry.getInstance();
      const definitions = registry.getAllDefinitions();
      const SUPPORTED_SWAP_COINS = ['bitcoin', 'ethereum', 'solana', 'unicity', 'tether', 'usd-coin', 'unicity-usd'];
      const fungibleDefs = definitions.filter(def =>
        def.assetKind === 'fungible' && SUPPORTED_SWAP_COINS.includes(def.name.toLowerCase())
      );
      const tokenNames = fungibleDefs.map(def => def.name.toLowerCase());
      let pricesMap = new Map<string, { priceUsd: number; priceEur?: number; change24h?: number }>();
      if (providers?.price) {
        try { pricesMap = await providers.price.getPrices(tokenNames); }
        catch (e) { console.warn('Failed to fetch prices:', e); }
      }
      const swappableAssets: Asset[] = fungibleDefs.map(def => {
        const symbol = def.symbol || def.name.toUpperCase();
        const priceData = pricesMap.get(def.name.toLowerCase());
        const fallback = FALLBACK_PRICES[def.name.toLowerCase()];
        const iconUrl = registry.getIconUrl(def.id);
        return {
          coinId: def.id, symbol, name: def.name,
          totalAmount: '0', decimals: def.decimals || 0, tokenCount: 0,
          confirmedAmount: '0', unconfirmedAmount: '0', transferringAmount: '0',
          confirmedTokenCount: 0, unconfirmedTokenCount: 0, transferringTokenCount: 0,
          iconUrl: iconUrl ?? undefined,
          priceUsd: priceData?.priceUsd || fallback?.priceUsd || 1.0,
          priceEur: priceData?.priceEur || fallback?.priceEur || 0.92,
          change24h: priceData?.change24h ?? 0,
          fiatValueUsd: null, fiatValueEur: null,
        };
      });
      setAllSwappableAssets(swappableAssets);

      // Set defaults immediately while we have both data sources in scope
      if (assets.length > 0) {
        setFromAsset(prev => prev ?? assets[0]);
        setToAsset(prev => {
          if (prev) return prev;
          return swappableAssets.find(a => a.coinId !== assets[0]?.coinId) ?? null;
        });
      }
    };
    if (isOpen) loadSwappableCoins();
  }, [isOpen, providers?.price, assets]);

  const getUserBalance = (coinId: string): string => {
    const userAsset = assets.find(a => a.coinId === coinId);
    return userAsset ? formatAssetAmount(userAsset) : '0';
  };

  const resolvePrice = (asset: Asset): number => {
    if (asset.priceUsd && asset.priceUsd > 0) return asset.priceUsd;
    const name = (asset.name ?? asset.symbol ?? '').toLowerCase();
    return FALLBACK_PRICES[name]?.priceUsd ?? 0;
  };

  const exchangeInfo = useMemo(() => {
    if (!fromAsset || !toAsset || !fromAmount || parseFloat(fromAmount) <= 0) return null;
    const fromAmountNum = parseFloat(fromAmount);
    const fromPrice = resolvePrice(fromAsset);
    const toPrice = resolvePrice(toAsset);
    if (fromPrice === 0 || toPrice === 0) return null;
    const rate = fromPrice / toPrice;
    const toAmount = fromAmountNum * rate;
    return { rate, fromValueUSD: fromAmountNum * fromPrice, toAmount, toValueUSD: toAmount * toPrice };
  }, [fromAsset, toAsset, fromAmount]);

  const reset = () => {
    setStep('swap'); setFromAsset(null); setToAsset(null); setFromAmount('');
    setError(null); setShowFromDropdown(false); setShowToDropdown(false);
  };

  const handleClose = () => { reset(); onClose(); };

  const handleMax = () => {
    if (!fromAsset) return;
    setFromAmount(formatAssetAmount(fromAsset));
  };

  const handleSwap = async () => {
    if (!fromAsset || !toAsset || !fromAmount || !exchangeInfo || !sphere) return;
    setStep('processing'); setError(null);
    try {
      // 1. Send the "from" asset to the swap stub recipient (unchanged).
      const fromAmountSmallestUnit = parseTokenAmount(fromAmount, fromAsset.decimals);
      await transfer({ recipient: 'sphere-swap', amount: fromAmountSmallestUnit.toString(), coinId: fromAsset.coinId });

      // 2. Self-mint the "to" asset to this wallet (replaces the faucet call).
      const toAmountSmallestUnit = parseTokenAmount(exchangeInfo.toAmount.toFixed(toAsset.decimals), toAsset.decimals);
      const mintResult = await sphere.payments.mintFungibleToken(toAsset.coinId, toAmountSmallestUnit);
      if (!mintResult.success) throw new Error(mintResult.error);

      // useTransfer's refetch already fired after step 1 (before the mint), so
      // refetch again here for the freshly minted asset to show up immediately.
      queryClient.refetchQueries({ queryKey: SPHERE_KEYS.payments.tokens.all });
      queryClient.refetchQueries({ queryKey: SPHERE_KEYS.payments.balance.all });
      queryClient.refetchQueries({ queryKey: SPHERE_KEYS.payments.assets.all });
      queryClient.refetchQueries({ queryKey: SPHERE_KEYS.payments.transactions.all });

      setStep('success');
    } catch (e: unknown) {
      setError(getErrorMessage(e));
      setStep('swap');
    }
  };

  const handleFlipAssets = () => {
    if (!fromAsset || !toAsset) return;
    const newFromAsset = assets.find(a => a.coinId === toAsset.coinId);
    const newToAsset = allSwappableAssets.find(a => a.coinId === fromAsset.coinId);
    if (!newFromAsset) { setError(`You don't have any ${toAsset.symbol} to swap from`); return; }
    setFromAsset(newFromAsset);
    setToAsset(newToAsset || fromAsset);
    setError(null);
    if (exchangeInfo && exchangeInfo.toAmount > 0) {
      setFromAmount(parseFloat(exchangeInfo.toAmount.toFixed(6)).toString());
    } else {
      setFromAmount('');
    }
  };

  const isValidAmount = useMemo(() => {
    if (!fromAsset || !fromAmount) return false;
    const amount = parseFloat(fromAmount);
    if (isNaN(amount) || amount <= 0) return false;
    return amount <= parseFloat(formatAssetAmount(fromAsset));
  }, [fromAsset, fromAmount]);

  const getTitle = () => {
    switch (step) {
      case 'swap': return 'Swap';
      case 'processing': return 'Processing...';
      case 'success': return 'Swap Complete!';
    }
  };

  return (
    <WalletScreen isOpen={isOpen} onClose={handleClose}>
      <ModalHeader variant="screen" title={getTitle()} onClose={handleClose} />

      <div className="px-6 py-8 flex-1 overflow-y-auto">
        <AnimatePresence>

          {step === 'swap' && (
            <motion.div key="swap" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>

              {/* YOU PAY */}
              <div className="bg-neutral-50 dark:bg-white/4 border border-neutral-100 dark:border-white/5 rounded-2xl p-4 mb-3">
                <div className="text-xs font-sans text-neutral-400 dark:text-white/35 mb-3">You Pay</div>
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={fromAmount}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === '' || /^\d*\.?\d*$/.test(v)) setFromAmount(v);
                    }}
                    placeholder="0"
                    disabled={!fromAsset}
                    className="flex-1 bg-transparent text-3xl font-semibold font-sans text-neutral-900 dark:text-white outline-none placeholder-neutral-300 dark:placeholder-white/20 disabled:opacity-40 min-w-0"
                  />
                  <div className="relative shrink-0">
                    <button
                      onClick={() => { setShowFromDropdown(!showFromDropdown); setShowToDropdown(false); }}
                      className="flex items-center gap-2 bg-white dark:bg-white/8 border border-neutral-200 dark:border-white/10 rounded-full pl-2 pr-3 py-2 hover:bg-neutral-100 dark:hover:bg-white/12 transition-colors"
                    >
                      {fromAsset ? (
                        <>
                          {fromAsset.iconUrl
                            ? <img src={fromAsset.iconUrl} className="w-5 h-5 rounded-full" alt="" />
                            : <div className="w-5 h-5 rounded-full bg-neutral-200 dark:bg-white/10 flex items-center justify-center text-[9px] font-bold">{fromAsset.symbol.slice(0, 2)}</div>
                          }
                          <span className="text-neutral-900 dark:text-white font-semibold font-mono text-sm">{fromAsset.symbol}</span>
                        </>
                      ) : (
                        <span className="text-neutral-900 dark:text-white font-semibold font-sans text-sm">Select</span>
                      )}
                      <ChevronDown className="w-3.5 h-3.5 text-neutral-400 dark:text-white/35" />
                    </button>

                    {showFromDropdown && (
                      <div className="absolute top-full right-0 mt-2 w-48 bg-white dark:bg-[#1a0e00] border border-neutral-200 dark:border-white/10 rounded-xl shadow-xl z-60 max-h-52 overflow-y-auto">
                        {assets.map(asset => (
                          <button
                            key={asset.coinId}
                            onClick={() => { setFromAsset(asset); setShowFromDropdown(false); setFromAmount(''); }}
                            className="w-full flex items-center gap-3 p-3 hover:bg-neutral-50 dark:hover:bg-white/8 transition-colors text-left"
                          >
                            {asset.iconUrl
                              ? <img src={asset.iconUrl} className="w-6 h-6 rounded-full" alt="" />
                              : <div className="w-6 h-6 rounded-full bg-neutral-200 dark:bg-white/10 flex items-center justify-center text-[10px] font-bold">{asset.symbol.slice(0, 2)}</div>
                            }
                            <div className="flex-1 min-w-0">
                              <div className="text-neutral-900 dark:text-white font-medium font-mono text-sm truncate">{asset.symbol}</div>
                              <div className="text-xs font-sans text-neutral-500 dark:text-white/35 truncate">{formatAssetAmount(asset)}</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between mt-2.5">
                  <span className="text-xs font-sans text-neutral-400 dark:text-white/35">
                    {fromAmount && fromAsset && parseFloat(fromAmount) > 0
                      ? `≈ $${(parseFloat(fromAmount) * resolvePrice(fromAsset)).toFixed(2)}`
                      : '$0.00'}
                  </span>
                  {fromAsset && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-sans text-neutral-400 dark:text-white/35">
                        {formatAssetAmount(fromAsset)} {fromAsset.symbol}
                      </span>
                      <button
                        onClick={handleMax}
                        className="text-xs font-mono text-orange-500 hover:text-orange-400 font-semibold transition-colors"
                      >
                        Max
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* FLIP BUTTON — separated */}
              <div className="flex justify-center my-3">
                <button
                  onClick={handleFlipAssets}
                  disabled={!fromAsset || !toAsset}
                  className="w-9 h-9 bg-neutral-100 dark:bg-white/6 border border-neutral-200 dark:border-white/10 rounded-full flex items-center justify-center hover:bg-neutral-200 dark:hover:bg-white/10 transition-colors disabled:opacity-50"
                >
                  <ArrowDownUp className="w-4 h-4 text-neutral-500 dark:text-white/45" />
                </button>
              </div>

              {/* YOU RECEIVE */}
              <div className="bg-neutral-50 dark:bg-white/4 border border-neutral-100 dark:border-white/5 rounded-2xl p-4 mb-5">
                <div className="text-xs font-sans text-neutral-400 dark:text-white/35 mb-3">You Receive</div>
                <div className="flex items-center gap-3">
                  <div className="flex-1 text-3xl font-semibold font-sans text-neutral-900 dark:text-white min-w-0 truncate">
                    {exchangeInfo ? exchangeInfo.toAmount.toFixed(6) : '0'}
                  </div>
                  <div className="relative shrink-0">
                    <button
                      onClick={() => { setShowToDropdown(!showToDropdown); setShowFromDropdown(false); }}
                      className="flex items-center gap-2 bg-white dark:bg-white/8 border border-neutral-200 dark:border-white/10 rounded-full pl-2 pr-3 py-2 hover:bg-neutral-100 dark:hover:bg-white/12 transition-colors"
                    >
                      {toAsset ? (
                        <>
                          {toAsset.iconUrl
                            ? <img src={toAsset.iconUrl} className="w-5 h-5 rounded-full" alt="" />
                            : <div className="w-5 h-5 rounded-full bg-neutral-200 dark:bg-white/10 flex items-center justify-center text-[9px] font-bold">{toAsset.symbol.slice(0, 2)}</div>
                          }
                          <span className="text-neutral-900 dark:text-white font-semibold font-mono text-sm">{toAsset.symbol}</span>
                        </>
                      ) : (
                        <span className="text-neutral-900 dark:text-white font-semibold font-sans text-sm">Select</span>
                      )}
                      <ChevronDown className="w-3.5 h-3.5 text-neutral-400 dark:text-white/35" />
                    </button>

                    {showToDropdown && (
                      <div className="absolute top-full right-0 mt-2 w-48 bg-white dark:bg-[#1a0e00] border border-neutral-200 dark:border-white/10 rounded-xl shadow-xl z-60 max-h-52 overflow-y-auto">
                        {allSwappableAssets.map(asset => (
                          <button
                            key={asset.coinId}
                            onClick={() => { setToAsset(asset); setShowToDropdown(false); }}
                            className="w-full flex items-center gap-3 p-3 hover:bg-neutral-50 dark:hover:bg-white/8 transition-colors text-left"
                          >
                            {asset.iconUrl
                              ? <img src={asset.iconUrl} className="w-6 h-6 rounded-full" alt="" />
                              : <div className="w-6 h-6 rounded-full bg-neutral-200 dark:bg-white/10 flex items-center justify-center text-[10px] font-bold">{asset.symbol.slice(0, 2)}</div>
                            }
                            <div className="flex-1 min-w-0">
                              <div className="text-neutral-900 dark:text-white font-medium font-mono text-sm truncate">{asset.symbol}</div>
                              <div className="text-xs font-sans text-neutral-500 dark:text-white/35 truncate">{getUserBalance(asset.coinId)}</div>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between mt-2.5">
                  <span className="text-xs font-sans text-neutral-400 dark:text-white/35">
                    {exchangeInfo ? `≈ $${exchangeInfo.toValueUSD.toFixed(2)}` : '$0.00'}
                  </span>
                  {toAsset && (
                    <span className="text-xs font-sans text-neutral-400 dark:text-white/35">
                      Balance: {getUserBalance(toAsset.coinId)} {toAsset.symbol}
                    </span>
                  )}
                </div>
              </div>

              {/* Exchange rate */}
              {exchangeInfo && fromAsset && toAsset && (
                <div className="flex items-center gap-3 px-4 py-4 bg-orange-50 dark:bg-orange-500/8 border border-orange-200 dark:border-orange-500/20 rounded-2xl mb-5">
                  <ArrowDownUp className="w-4 h-4 text-orange-500 dark:text-orange-400 shrink-0" />
                  <span className="text-sm font-sans text-orange-600/70 dark:text-orange-300/60">
                    1{' '}
                    <span className="font-mono font-semibold text-orange-700 dark:text-orange-300/80">{fromAsset.symbol}</span>
                    {' = '}
                    <span className="font-mono font-semibold text-orange-700 dark:text-orange-300/80">{exchangeInfo.rate.toFixed(4)} {toAsset.symbol}</span>
                  </span>
                </div>
              )}

              {error && (
                <p className="text-sm text-red-500 dark:text-red-400 text-center mb-4">{error}</p>
              )}

              <motion.button
                onClick={handleSwap}
                disabled={!isValidAmount || !toAsset || !exchangeInfo}
                onHoverStart={() => setIsSwapHovered(true)}
                onHoverEnd={() => setIsSwapHovered(false)}
                whileTap={(!isValidAmount || !toAsset || !exchangeInfo) ? {} : { scale: 0.98 }}
                className="relative w-full h-14 rounded-full overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: '#FF6F00' }}
              >
                {/* White fill layer — animates from bottom, no border-radius (parent clips) */}
                <motion.div
                  className="absolute inset-0 bg-white"
                  initial={{ y: '100%' }}
                  animate={{ y: isSwapHovered && isValidAmount && toAsset && exchangeInfo ? '0%' : '100%' }}
                  transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
                />
                <motion.span
                  animate={{ color: isSwapHovered && isValidAmount && toAsset && exchangeInfo ? '#7c2d00' : '#ffffff' }}
                  transition={{ duration: 0.25 }}
                  className="relative z-10 flex items-center justify-center gap-2 font-semibold font-mono text-base"
                >
                  <ArrowDownUp className="w-5 h-5" />
                  Swap
                </motion.span>
              </motion.button>
            </motion.div>
          )}

          {/* PROCESSING */}
          {step === 'processing' && (
            <motion.div
              key="processing"
              className="flex-1 flex flex-col items-center justify-center text-center py-10"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            >
              <Loader2 className="w-12 h-12 text-orange-500 animate-spin mx-auto mb-4" />
              <h3 className="text-neutral-900 dark:text-white font-medium text-lg">Processing Swap...</h3>
              <p className="text-neutral-500 dark:text-white/45 text-sm mt-2">Sending tokens and requesting swap</p>
            </motion.div>
          )}

          {/* SUCCESS */}
          {step === 'success' && fromAsset && toAsset && exchangeInfo && (
            <motion.div
              key="success"
              className="flex-1 flex flex-col items-center justify-center text-center py-10"
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
            >
              <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-500/50">
                <CheckCircle className="w-8 h-8 text-emerald-500" />
              </div>
              <h3 className="text-neutral-900 dark:text-white font-bold text-2xl mb-2">Swap Complete!</h3>
              <p className="text-neutral-500 dark:text-white/45 mb-1">
                Swapped <b>{fromAmount} {fromAsset.symbol}</b>
              </p>
              <p className="text-neutral-500 dark:text-white/45">
                for <b>{exchangeInfo.toAmount.toFixed(6)} {toAsset.symbol}</b>
              </p>
              <button
                onClick={handleClose}
                className="mt-8 px-8 py-2 bg-neutral-100 dark:bg-white/6 rounded-lg hover:bg-neutral-200 dark:hover:bg-white/10 text-neutral-900 dark:text-white transition-colors font-mono"
              >
                Close
              </button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </WalletScreen>
  );
}
