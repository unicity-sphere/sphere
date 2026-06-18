import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Loader2, User, CheckCircle, Coins, Hash, Copy, Check } from 'lucide-react';
import type { Asset } from '@unicitylabs/sphere-sdk';
import { parseTokenAmount, safeParseTokenAmount } from '@unicitylabs/sphere-sdk';
import { useAssets, useTransfer, formatAmount } from '../../../../sdk';
import { getErrorMessage } from '../../../../sdk/errors';
import { useSphereContext } from '../../../../sdk/hooks/core/useSphere';
import { WalletScreen } from '../../ui/WalletScreen';
import { ModalHeader, Button } from '../../ui';

type Step = 'asset' | 'details' | 'confirm' | 'processing' | 'success';

export interface SendPrefill {
  to: string;
  amount: string;
  coinId: string;
  memo?: string;
}

interface SendModalProps {
  isOpen: boolean;
  onClose: (result?: { success: boolean }) => void;
  prefill?: SendPrefill;
  /** Render as centered modal dialog instead of slide-in panel */
  asModal?: boolean;
}

export function SendModal({ isOpen, onClose, prefill, asModal }: SendModalProps) {
  const { assets: sdkAssets } = useAssets();
  const { transfer, isLoading: isTransferring } = useTransfer();
  const { sphere } = useSphereContext();

  const assets = sdkAssets;

  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const copyToClipboard = useCallback((text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    }).catch(() => {});
  }, []);

  // State
  const [step, setStep] = useState<Step>('asset');
  const [recipientMode, setRecipientMode] = useState<'nametag' | 'direct'>('nametag');
  const [recipient, setRecipient] = useState('');
  const [isCheckingRecipient, setIsCheckingRecipient] = useState(false);
  const [recipientError, setRecipientError] = useState<string | null>(null);

  const [resolvedAddress, setResolvedAddress] = useState<string | null>(null);

  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [amountInput, setAmountInput] = useState('');
  const [memoInput, setMemoInput] = useState('');

  // Pre-fill from connect intent (dApp request)
  const prefillApplied = useRef(false);
  useEffect(() => {
    if (!prefill || !isOpen || prefillApplied.current) return;
    if (assets.length === 0) return;

    const { to, amount, coinId } = prefill;

    if (to.startsWith('DIRECT://')) {
      setRecipientMode('direct');
      setRecipient(to);
    } else {
      setRecipientMode('nametag');
      setRecipient(to.replace(/^@/, ''));
    }

    setAmountInput(amount);
    if (prefill.memo) setMemoInput(prefill.memo);

    const asset = assets.find(a => a.coinId === coinId);
    if (asset) {
      setSelectedAsset(asset);
      setStep('confirm');
      prefillApplied.current = true;
    }
  }, [prefill, isOpen, assets]);

  const handleRecipientChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (recipientMode === 'nametag') {
      const value = e.target.value.toLowerCase();
      if (/^@?[a-z0-9_\-+.]*$/.test(value)) {
        setRecipient(value);
        setRecipientError(null);
      }
    } else {
      setRecipient(e.target.value);
      setRecipientError(null);
    }
  };

  const reset = () => {
    setStep('asset');
    setRecipientMode('nametag');
    setRecipient('');
    setResolvedAddress(null);
    setSelectedAsset(null);
    setAmountInput('');
    setMemoInput('');
    setRecipientError(null);
    prefillApplied.current = false;
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const getBackHandler = () => {
    if (step === 'details') return () => setStep('asset');
    if (step === 'confirm') return () => setStep('details');
    return handleClose;
  };

  const getTitle = () => {
    switch (step) {
      case 'asset': return 'Select Asset';
      case 'details': return 'Send';
      case 'confirm': return 'Confirm Transfer';
      case 'processing': return 'Processing...';
      case 'success': return 'Sent!';
    }
  };

  // STEP 2: Validate recipient + amount, then go to confirm
  const handleDetailsNext = async () => {
    if (!selectedAsset || !recipient.trim() || !amountInput) return;

    const targetAmount = safeParseTokenAmount(amountInput, selectedAsset.decimals);
    if (targetAmount === null || targetAmount <= 0n) return;
    if (targetAmount > BigInt(selectedAsset.totalAmount)) return;

    setIsCheckingRecipient(true);
    setRecipientError(null);

    try {
      if (recipientMode === 'direct') {
        const addr = recipient.trim();
        if (!addr.startsWith('DIRECT://')) {
          setRecipientError('Direct address must start with DIRECT://');
          return;
        }
        setRecipient(addr);
        setResolvedAddress(addr);
        setStep('confirm');
      } else {
        const cleanTag = recipient.replace('@', '').replace('@unicity', '').trim();

        if (sphere?.resolve) {
          const peerInfo = await sphere.resolve(`@${cleanTag}`);
          if (peerInfo) {
            setRecipient(cleanTag);
            setResolvedAddress(peerInfo.directAddress || null);
            setStep('confirm');
          } else {
            setRecipientError(`User @${cleanTag} not found`);
          }
        } else {
          setRecipient(cleanTag);
          setStep('confirm');
        }
      }
    } catch (err) {
      setRecipientError(getErrorMessage(err));
    } finally {
      setIsCheckingRecipient(false);
    }
  };

  // STEP 3: Execute transfer via SDK
  const handleSend = async () => {
    if (!selectedAsset || !amountInput || !recipient) return;

    setStep('processing');
    setRecipientError(null);

    try {
      const amount = parseTokenAmount(amountInput, selectedAsset.decimals).toString();
      await transfer({
        coinId: selectedAsset.coinId,
        amount,
        recipient,
        ...(memoInput ? { memo: memoInput } : {}),
      });

      setStep('success');
    } catch (e: unknown) {
      setRecipientError(getErrorMessage(e));
      setStep('confirm');
    }
  };

  const handleSuccessClose = () => {
    reset();
    onClose({ success: true });
  };

  return (
    <WalletScreen isOpen={isOpen} onClose={handleClose} asModal={asModal}>
      <ModalHeader variant="screen" title={getTitle()} onClose={getBackHandler()} />

      <div className="px-6 py-8 flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">

          {/* 1. ASSET SELECTION */}
          {step === 'asset' && (
            <motion.div key="asset" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
              {assets.map(asset => (
                <button
                  key={asset.coinId}
                  onClick={() => { setSelectedAsset(asset); setStep('details'); }}
                  className="w-full p-3 flex items-center gap-3 bg-neutral-50 dark:bg-white/4 hover:bg-neutral-100 dark:hover:bg-white/8 border border-neutral-200 dark:border-white/5 rounded-xl transition-colors text-left"
                >
                  <img src={asset.iconUrl || ''} className="w-8 h-8 rounded-full" alt="" />
                  <div className="flex-1">
                    <div className="text-neutral-900 dark:text-white font-medium">{asset.symbol}</div>
                    <div className="text-xs text-neutral-500 dark:text-white/45">{formatAmount(asset.totalAmount, asset.decimals)} available</div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-neutral-400 dark:text-neutral-600" />
                </button>
              ))}
            </motion.div>
          )}

          {/* 2. DETAILS (recipient + amount) */}
          {step === 'details' && selectedAsset && (() => {
            const insufficientBalance = (safeParseTokenAmount(amountInput, selectedAsset.decimals) ?? 0n) > BigInt(selectedAsset.totalAmount);
            const usdValue = selectedAsset.priceUsd != null && amountInput
              ? (parseFloat(amountInput) * selectedAsset.priceUsd).toFixed(2)
              : null;
            return (
              <motion.div key="details" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {/* Asset header */}
                <div className="flex flex-col items-center mb-8">
                  <img src={selectedAsset.iconUrl || ''} className="w-14 h-14 rounded-full mb-2" alt="" />
                  <span className="text-neutral-900 dark:text-white font-semibold font-mono">{selectedAsset.name || selectedAsset.symbol}</span>
                </div>

                {/* Recipient */}
                <div className="mb-10">
                  <div className="relative">
                    {recipientMode === 'nametag' && (
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 dark:text-white/35 font-medium">@</span>
                    )}
                    <input
                      autoFocus
                      value={recipient}
                      onChange={handleRecipientChange}
                      onKeyDown={(e) => e.key === 'Enter' && handleDetailsNext()}
                      className={`w-full bg-neutral-100 dark:bg-white/6 border border-neutral-200 dark:border-white/10 rounded-2xl py-4 pr-4 text-neutral-900 dark:text-white focus:border-orange-500 outline-none transition-colors ${recipientMode === 'nametag' ? 'pl-8' : 'pl-4 font-mono'}`}
                      placeholder={recipientMode === 'nametag' ? "Recipient's Unicity ID" : 'DIRECT://...'}
                    />
                  </div>
                  <button
                    onClick={() => { setRecipientMode(recipientMode === 'nametag' ? 'direct' : 'nametag'); setRecipient(''); setRecipientError(null); }}
                    className="text-[11px] text-neutral-400 dark:text-neutral-500 hover:text-orange-500 dark:hover:text-orange-400 mt-1.5 ml-1 transition-colors"
                  >
                    {recipientMode === 'nametag' ? 'Use direct address instead' : 'Use nametag instead'}
                  </button>
                </div>

                {/* Amount */}
                <div className="mb-3">
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={amountInput}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (v === '' || /^\d*\.?\d*$/.test(v)) setAmountInput(v);
                      }}
                      className={`w-full bg-neutral-100 dark:bg-white/6 border rounded-2xl py-4 pl-4 pr-28 text-neutral-900 dark:text-white outline-none transition-colors ${insufficientBalance ? 'border-red-500 focus:border-red-500' : 'border-neutral-200 dark:border-white/10 focus:border-orange-500'}`}
                      placeholder="Amount"
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                      <span className="text-sm font-semibold text-neutral-500 dark:text-white/45">{selectedAsset.symbol}</span>
                      <button
                        onClick={() => setAmountInput(formatAmount(selectedAsset.totalAmount, selectedAsset.decimals))}
                        className="text-xs bg-neutral-200 dark:bg-white/10 text-orange-500 dark:text-orange-400 px-2.5 py-1.5 rounded-full hover:bg-neutral-300 dark:hover:bg-white/15 transition-colors font-semibold"
                      >
                        Max
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-between mt-1.5 text-xs px-1">
                    <span className="text-neutral-400 dark:text-white/35">
                      {usdValue ? `~$${usdValue}` : '~$0.00'}
                    </span>
                    {insufficientBalance
                      ? <span className="text-red-500">Insufficient balance</span>
                      : <span className="text-neutral-400 dark:text-white/35">Available {formatAmount(selectedAsset.totalAmount, selectedAsset.decimals)} {selectedAsset.symbol}</span>
                    }
                  </div>
                </div>

                {/* Memo */}
                <div className="mb-8">
                  <input
                    type="text"
                    value={memoInput}
                    onChange={(e) => setMemoInput(e.target.value)}
                    className="w-full bg-neutral-100 dark:bg-white/6 border border-neutral-200 dark:border-white/10 rounded-2xl py-4 px-4 text-neutral-900 dark:text-white outline-none focus:border-orange-500 transition-colors text-sm"
                    placeholder="Memo (optional)"
                  />
                </div>

                {recipientError && <p className="text-red-500 text-sm mb-4">{recipientError}</p>}

                <div className="flex gap-3">
                  <button
                    onClick={handleClose}
                    className="flex-1 py-4 bg-neutral-100 dark:bg-white/6 hover:bg-neutral-200 dark:hover:bg-white/10 text-neutral-700 dark:text-white/65 font-semibold font-mono rounded-full transition-colors"
                  >
                    Cancel
                  </button>
                  <Button
                    onClick={handleDetailsNext}
                    disabled={!recipient.trim() || !amountInput || insufficientBalance || isCheckingRecipient}
                    loading={isCheckingRecipient}
                    loadingText="Checking..."
                    icon={ArrowRight}
                    iconPosition="right"
                    className="flex-1 rounded-full!"
                  >
                    Review
                  </Button>
                </div>
              </motion.div>
            );
          })()}

          {/* 3. CONFIRM */}
          {step === 'confirm' && selectedAsset && (
            <motion.div key="conf" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>

              {/* Summary Card */}
              <div className="bg-orange-50/50 dark:bg-orange-500/6 rounded-2xl p-5 mb-6 border border-orange-100 dark:border-orange-500/10 text-center">
                <div className="text-sm text-neutral-500 dark:text-white/45 mb-1">You are sending</div>
                <div className="text-3xl font-bold text-neutral-900 dark:text-white">
                  {amountInput} <span className="text-orange-500">{selectedAsset.symbol}</span>
                </div>
                {selectedAsset.priceUsd != null && (
                  <div className="text-xs text-neutral-400 dark:text-neutral-500 mb-3">
                    ≈ ${(parseFloat(amountInput) * selectedAsset.priceUsd).toFixed(2)} USD
                  </div>
                )}
                {selectedAsset.priceUsd == null && <div className="mb-4" />}

                <div className="flex flex-col items-center gap-1.5">
                  <div className="flex items-center gap-1.5">
                    <div className="flex items-center gap-2 text-sm bg-neutral-200 dark:bg-white/4 p-2 rounded-lg">
                      {recipientMode === 'direct' ? (
                        <Hash className="w-4 h-4 text-neutral-500 dark:text-white/45" />
                      ) : (
                        <User className="w-4 h-4 text-neutral-500 dark:text-white/45" />
                      )}
                      <span className={`text-neutral-700 dark:text-white/65 ${recipientMode === 'direct' ? 'font-mono text-xs break-all' : ''}`}>
                        {recipientMode === 'direct' ? recipient : `@${recipient}`}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(
                        recipientMode === 'direct' ? recipient : `@${recipient}`,
                        'recipient'
                      )}
                      className="p-1.5 hover:bg-neutral-200 dark:hover:bg-white/10 rounded-lg transition-colors"
                      title="Copy"
                    >
                      {copiedKey === 'recipient'
                        ? <Check className="w-3.5 h-3.5 text-emerald-500" />
                        : <Copy className="w-3.5 h-3.5 text-neutral-400" />
                      }
                    </button>
                  </div>
                  {recipientMode === 'nametag' && resolvedAddress && (
                    <div className="flex items-center gap-1">
                      <span
                        className="text-[10px] font-mono text-neutral-400/40 dark:text-neutral-600/50 truncate max-w-52"
                        title={resolvedAddress}
                      >
                        {resolvedAddress.length > 30
                          ? `${resolvedAddress.slice(0, 18)}...${resolvedAddress.slice(-8)}`
                          : resolvedAddress}
                      </span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(resolvedAddress, 'address')}
                        className="p-0.5 hover:bg-neutral-200 dark:hover:bg-white/10 rounded transition-colors"
                        title="Copy address"
                      >
                        {copiedKey === 'address'
                          ? <Check className="w-3 h-3 text-emerald-500" />
                          : <Copy className="w-3 h-3 text-neutral-500/40" />
                        }
                      </button>
                    </div>
                  )}
                </div>
                {memoInput && (
                  <div className="text-sm text-neutral-300 dark:text-white/45 mt-3 italic">
                    &ldquo;{memoInput}&rdquo;
                  </div>
                )}
              </div>

              {/* Strategy Info */}
              <div className="mb-6 space-y-2">
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-start gap-3">
                  <Coins className="w-5 h-5 text-emerald-500 dark:text-emerald-400 mt-0.5" />
                  <div>
                    <div className="text-emerald-600 dark:text-emerald-400 text-sm font-medium">Smart Transfer</div>
                    <div className="text-xs text-neutral-500 dark:text-white/45 mt-1">
                      Token splitting and transfer optimization is handled automatically.
                    </div>
                  </div>
                </div>
              </div>

              {recipientError && <p className="text-red-500 text-sm mb-4 text-center">{recipientError}</p>}

              <div className="flex gap-3">
                <button
                  onClick={handleClose}
                  className="flex-1 py-4 bg-neutral-100 dark:bg-white/6 hover:bg-neutral-200 dark:hover:bg-white/10 text-neutral-700 dark:text-white/65 font-semibold font-mono rounded-full transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSend}
                  disabled={isTransferring}
                  className="flex-1 py-4 bg-orange-500 hover:bg-orange-600 dark:bg-brand-orange dark:hover:bg-brand-orange-dark text-white font-bold font-mono rounded-full transition-colors disabled:opacity-50"
                >
                  Send
                </button>
              </div>
            </motion.div>
          )}

          {/* 4. PROCESSING */}
          {step === 'processing' && (
            <motion.div key="proc" className="flex-1 flex flex-col items-center justify-center text-center py-10">
              <Loader2 className="w-12 h-12 text-orange-500 animate-spin mx-auto mb-4" />
              <h3 className="text-neutral-900 dark:text-white font-medium text-lg">Sending Transaction...</h3>
              <p className="text-neutral-500 text-sm mt-2">Processing proofs and broadcasting via Nostr</p>
            </motion.div>
          )}

          {/* 5. SUCCESS */}
          {step === 'success' && (
            <motion.div key="done" className="flex-1 flex flex-col items-center justify-center text-center py-10">
              <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-500/50">
                <CheckCircle className="w-8 h-8 text-emerald-500" />
              </div>
              <h3 className="text-neutral-900 dark:text-white font-bold text-2xl mb-2">Success!</h3>
              <p className="text-neutral-500 dark:text-white/45">
                Successfully sent <b>{amountInput} {selectedAsset?.symbol}</b> to <b>{recipientMode === 'direct' ? recipient : `@${recipient}`}</b>
              </p>
              <button onClick={handleSuccessClose} className="mt-8 px-8 py-2 bg-neutral-100 dark:bg-white/6 rounded-lg hover:bg-neutral-200 dark:hover:bg-white/10 text-neutral-900 dark:text-white transition-colors">
                Close
              </button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </WalletScreen>
  );
}
