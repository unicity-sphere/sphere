import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Loader2, User, CheckCircle, Hash, Receipt } from 'lucide-react';
import { TokenRegistry, parseTokenAmount, safeParseTokenAmount } from '@unicitylabs/sphere-sdk';
import { useSphereContext } from '../../../../sdk/hooks/core/useSphere';
import { getErrorMessage } from '../../../../sdk/errors';
import { WalletScreen } from '../../ui/WalletScreen';
import { ModalHeader, Button } from '../../ui';

type Step = 'coin' | 'details' | 'confirm' | 'processing' | 'success';

interface CoinOption {
  coinId: string;
  symbol: string;
  name: string;
  decimals: number;
  iconUrl?: string;
}

export interface PaymentRequestPrefill {
  to: string;
  amount: string;
  coinId: string;
  message?: string;
}

interface SendPaymentRequestModalProps {
  isOpen: boolean;
  onClose: (result?: { success: boolean; requestId?: string }) => void;
  prefill?: PaymentRequestPrefill;
  /** Render as centered modal dialog instead of slide-in panel */
  asModal?: boolean;
}

export function SendPaymentRequestModal({ isOpen, onClose, prefill, asModal }: SendPaymentRequestModalProps) {
  const { sphere } = useSphereContext();

  const [step, setStep] = useState<Step>('coin');
  const [recipientMode, setRecipientMode] = useState<'nametag' | 'direct'>('nametag');
  const [recipient, setRecipient] = useState('');
  const [isCheckingRecipient, setIsCheckingRecipient] = useState(false);
  const [recipientError, setRecipientError] = useState<string | null>(null);

  const [availableCoins, setAvailableCoins] = useState<CoinOption[]>([]);
  const [selectedCoin, setSelectedCoin] = useState<CoinOption | null>(null);
  const [amountInput, setAmountInput] = useState('');
  const [messageInput, setMessageInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const registry = TokenRegistry.getInstance();
    const definitions = registry.getAllDefinitions();

    const coins: CoinOption[] = definitions
      .filter(def => def.assetKind === 'fungible')
      .map(def => ({
        coinId: def.id,
        symbol: def.symbol || def.name.toUpperCase(),
        name: def.name,
        decimals: def.decimals || 0,
        iconUrl: registry.getIconUrl(def.id) ?? undefined,
      }));

    setAvailableCoins(coins);
  }, [isOpen]);

  const prefillApplied = useRef(false);
  useEffect(() => {
    if (!prefill || !isOpen || prefillApplied.current) return;
    if (availableCoins.length === 0) return;

    const { to, amount, coinId, message } = prefill;

    if (to.startsWith('DIRECT://')) {
      setRecipientMode('direct');
      setRecipient(to);
    } else {
      setRecipientMode('nametag');
      setRecipient(to.replace(/^@/, ''));
    }

    setAmountInput(amount);
    if (message) setMessageInput(message);

    const coin = availableCoins.find(c => c.coinId === coinId);
    if (coin) {
      setSelectedCoin(coin);
      setStep('confirm');
      prefillApplied.current = true;
    }
  }, [prefill, isOpen, availableCoins]);

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
    setStep('coin');
    setRecipientMode('nametag');
    setRecipient('');
    setSelectedCoin(null);
    setAmountInput('');
    setMessageInput('');
    setRecipientError(null);
    setError(null);
    setRequestId(null);
    prefillApplied.current = false;
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const getBackHandler = () => {
    if (step === 'details') return () => setStep('coin');
    if (step === 'confirm') return () => setStep('details');
    return handleClose;
  };

  const getTitle = () => {
    switch (step) {
      case 'coin': return 'Select Currency';
      case 'details': return 'Payment Request';
      case 'confirm': return 'Confirm Request';
      case 'processing': return 'Sending...';
      case 'success': return 'Request Sent!';
    }
  };

  // Validate recipient + amount → go to confirm
  const handleDetailsNext = async () => {
    if (!selectedCoin || !recipient.trim() || !amountInput) return;
    const targetAmount = safeParseTokenAmount(amountInput, selectedCoin.decimals);
    if (targetAmount === null || targetAmount <= 0n) return;

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
        setStep('confirm');
      } else {
        const cleanTag = recipient.replace('@', '').replace('@unicity', '').trim();
        const transport = sphere?.getTransport();

        if (transport?.resolveNametag) {
          const pubkey = await transport.resolveNametag(cleanTag);
          if (pubkey) {
            setRecipient(cleanTag);
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

  const handleSendRequest = async () => {
    if (!selectedCoin || !amountInput || !recipient) return;

    setStep('processing');
    setError(null);

    try {
      const amount = parseTokenAmount(amountInput, selectedCoin.decimals).toString();
      const recipientStr = recipientMode === 'nametag' ? `@${recipient}` : recipient;

      const result = await sphere!.payments.sendPaymentRequest(recipientStr, {
        amount,
        coinId: selectedCoin.coinId,
        ...(messageInput ? { message: messageInput } : {}),
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to send payment request');
      }

      setRequestId(result.requestId || null);
      setStep('success');
    } catch (e: unknown) {
      setError(getErrorMessage(e));
      setStep('confirm');
    }
  };

  const handleSuccessClose = () => {
    reset();
    onClose({ success: true, requestId: requestId || undefined });
  };

  return (
    <WalletScreen isOpen={isOpen} onClose={handleClose} asModal={asModal}>
      <ModalHeader variant="screen" title={getTitle()} onClose={getBackHandler()} />

      <div className="px-6 py-8 flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">

          {/* 1. COIN SELECTION */}
          {step === 'coin' && (
            <motion.div key="coin" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
              {availableCoins.map(coin => (
                <button
                  key={coin.coinId}
                  onClick={() => { setSelectedCoin(coin); setStep('details'); }}
                  className="w-full p-3 flex items-center gap-3 bg-neutral-50 dark:bg-white/4 hover:bg-neutral-100 dark:hover:bg-white/8 border border-neutral-200 dark:border-white/5 rounded-xl transition-colors text-left"
                >
                  {coin.iconUrl ? (
                    <img src={coin.iconUrl} className="w-8 h-8 rounded-full" alt="" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-neutral-200 dark:bg-white/10 flex items-center justify-center text-xs font-bold text-neutral-500">
                      {coin.symbol.slice(0, 2)}
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="text-neutral-900 dark:text-white font-medium">{coin.symbol}</div>
                    <div className="text-xs text-neutral-500 dark:text-white/45">{coin.name}</div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-neutral-400 dark:text-neutral-600" />
                </button>
              ))}
            </motion.div>
          )}

          {/* 2. DETAILS (recipient + amount + message) */}
          {step === 'details' && selectedCoin && (
            <motion.div key="details" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {/* Coin header */}
              <div className="flex flex-col items-center mb-8">
                {selectedCoin.iconUrl ? (
                  <img src={selectedCoin.iconUrl} className="w-14 h-14 rounded-full mb-2" alt="" />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-neutral-200 dark:bg-white/10 flex items-center justify-center text-lg font-bold text-neutral-500 mb-2">
                    {selectedCoin.symbol.slice(0, 2)}
                  </div>
                )}
                <span className="text-neutral-900 dark:text-white font-semibold font-mono">{selectedCoin.name || selectedCoin.symbol}</span>
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
                    placeholder={recipientMode === 'nametag' ? "Who should pay you?" : 'DIRECT://...'}
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
                    className="w-full bg-neutral-100 dark:bg-white/6 border border-neutral-200 dark:border-white/10 rounded-2xl py-4 pl-4 pr-20 text-neutral-900 dark:text-white outline-none focus:border-orange-500 transition-colors"
                    placeholder="Amount"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-neutral-500 dark:text-white/45">
                    {selectedCoin.symbol}
                  </span>
                </div>
              </div>

              {/* Message */}
              <div className="mb-8">
                <input
                  type="text"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  className="w-full bg-neutral-100 dark:bg-white/6 border border-neutral-200 dark:border-white/10 rounded-2xl py-4 px-4 text-neutral-900 dark:text-white outline-none focus:border-orange-500 transition-colors text-sm"
                  placeholder="Message (optional)"
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
                  disabled={!recipient.trim() || !amountInput || isCheckingRecipient}
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
          )}

          {/* 3. CONFIRM */}
          {step === 'confirm' && selectedCoin && (
            <motion.div key="conf" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="bg-orange-50/50 dark:bg-orange-500/6 rounded-2xl p-5 mb-6 border border-orange-100 dark:border-orange-500/10 text-center">
                <div className="text-sm text-neutral-500 dark:text-white/45 mb-1">You are requesting</div>
                <div className="text-3xl font-bold text-neutral-900 dark:text-white mb-4">
                  {amountInput} <span className="text-orange-500">{selectedCoin.symbol}</span>
                </div>
                <div className="text-sm text-neutral-500 dark:text-white/45 mb-1">from</div>
                <div className="flex items-center justify-center gap-2 text-sm bg-neutral-200 dark:bg-white/4 p-2 rounded-lg mx-auto max-w-max">
                  {recipientMode === 'direct' ? (
                    <Hash className="w-4 h-4 text-neutral-500 dark:text-white/45" />
                  ) : (
                    <User className="w-4 h-4 text-neutral-500 dark:text-white/45" />
                  )}
                  <span className={`text-neutral-700 dark:text-white/65 ${recipientMode === 'direct' ? 'font-mono text-xs break-all' : ''}`}>
                    {recipientMode === 'direct' ? recipient : `@${recipient}`}
                  </span>
                </div>
                {messageInput && (
                  <div className="text-xs text-neutral-400 dark:text-white/45 mt-3 italic">
                    &ldquo;{messageInput}&rdquo;
                  </div>
                )}
              </div>

              <div className="mb-6">
                <div className="p-3 bg-orange-500/10 border border-orange-500/20 rounded-xl flex items-start gap-3">
                  <Receipt className="w-5 h-5 text-orange-500 dark:text-orange-400 mt-0.5" />
                  <div>
                    <div className="text-orange-600 dark:text-orange-400 text-sm font-medium">Payment Request</div>
                    <div className="text-xs text-neutral-500 dark:text-white/45 mt-1">
                      The recipient will receive a notification and can choose to pay or decline.
                    </div>
                  </div>
                </div>
              </div>

              {error && <p className="text-red-500 text-sm mb-4 text-center">{error}</p>}

              <div className="flex gap-3">
                <button
                  onClick={handleClose}
                  className="flex-1 py-4 bg-neutral-100 dark:bg-white/6 hover:bg-neutral-200 dark:hover:bg-white/10 text-neutral-700 dark:text-white/65 font-semibold font-mono rounded-full transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendRequest}
                  className="flex-1 py-4 bg-orange-500 hover:bg-orange-600 dark:bg-brand-orange dark:hover:bg-brand-orange-dark text-white font-bold font-mono rounded-full transition-colors"
                >
                  Send Request
                </button>
              </div>
            </motion.div>
          )}

          {/* 4. PROCESSING */}
          {step === 'processing' && (
            <motion.div key="proc" className="flex-1 flex flex-col items-center justify-center text-center py-10">
              <Loader2 className="w-12 h-12 text-orange-500 animate-spin mx-auto mb-4" />
              <h3 className="text-neutral-900 dark:text-white font-medium text-lg">Sending Payment Request...</h3>
              <p className="text-neutral-500 text-sm mt-2">Delivering request via Nostr</p>
            </motion.div>
          )}

          {/* 5. SUCCESS */}
          {step === 'success' && (
            <motion.div key="done" className="flex-1 flex flex-col items-center justify-center text-center py-10">
              <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-500/50">
                <CheckCircle className="w-8 h-8 text-emerald-500" />
              </div>
              <h3 className="text-neutral-900 dark:text-white font-bold text-2xl mb-2">Request Sent!</h3>
              <p className="text-neutral-500 dark:text-white/45">
                Payment request for <b>{amountInput} {selectedCoin?.symbol}</b> sent to <b>{recipientMode === 'direct' ? recipient : `@${recipient}`}</b>
              </p>
              <button onClick={handleSuccessClose} className="mt-8 px-8 py-2 bg-neutral-100 dark:bg-white/6 rounded-lg hover:bg-neutral-200 dark:hover:bg-white/10 text-neutral-900 dark:text-white transition-colors font-mono">
                Close
              </button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </WalletScreen>
  );
}
