import { useState, useEffect } from 'react';
import { Menu, X, Github, Linkedin } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useLocation, useNavigate } from 'react-router-dom';
// import { ThemeToggle } from '../theme';
import { STORAGE_KEYS } from '../../config/storageKeys';
import { IpfsSyncIndicator } from './IpfsSyncIndicator';
import { WalletApiSessionIndicator } from './WalletApiSessionIndicator';
import { useDesktopState } from '../../hooks/useDesktopState';
import { DiscordIcon, XIcon } from '../icons/SocialIcons';

function devReset(): void {
  localStorage.removeItem(STORAGE_KEYS.DEV_AGGREGATOR_URL);
  localStorage.removeItem(STORAGE_KEYS.DEV_SKIP_TRUST_BASE);
  window.dispatchEvent(new Event("dev-config-changed"));
}
import logoUrl from '/Union.svg';

const navItems: { label: string; path: string; external?: boolean }[] = [
  { label: 'Home', path: '/home' },
  { label: 'Explore', path: '/explore' },
  { label: 'Markets', path: '/markets' },
  { label: 'Devs', path: '/developers' },
  { label: 'Agents', path: '/explore-agents' },
  { label: 'About', path: '/about' },
];

export function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const { showDesktop } = useDesktopState();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const getDevConfig = () => ({
    aggregatorUrl: localStorage.getItem(STORAGE_KEYS.DEV_AGGREGATOR_URL),
    skipTrustBase: localStorage.getItem(STORAGE_KEYS.DEV_SKIP_TRUST_BASE) === 'true',
  });
  const [devConfig, setDevConfig] = useState(getDevConfig);

  useEffect(() => {
    const handler = () => setDevConfig(getDevConfig());
    window.addEventListener('dev-config-changed', handler);
    return () => window.removeEventListener('dev-config-changed', handler);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const getHostname = (url: string): string => {
    try {
      const hostname = new URL(url).hostname;
      return hostname.length > 20 ? hostname.slice(0, 20) + '...' : hostname;
    } catch {
      return url.slice(0, 20);
    }
  };

  const handleMobileNavigation = (path: string) => {
    navigate(path);
  };

  const isActive = (path: string) => {
    if (!path) return false;
    if (path === '/home') {
      return location.pathname === '/home' || location.pathname.startsWith('/agents/');
    }
    if (path === '/explore') {
      return location.pathname === '/explore' || location.pathname.startsWith('/apps/');
    }
    if (path === '/developers') {
      return location.pathname.startsWith('/developers');
    }
    return location.pathname === path;
  };

  return (
    <>
    <header data-tutorial="header" className={`sticky top-0 z-50 w-full shrink-0 transition-colors duration-300 backdrop-blur-md ${
      mobileMenuOpen
        ? 'bg-white dark:bg-modal-bg'
        : 'bg-white/70 dark:bg-transparent'
    }`}>
      <div className="px-4 sm:px-12 lg:px-28 pt-2 sm:pt-3 pb-1 sm:pb-3 lg:pb-7">
        <div className="flex items-center sm:items-end">
          {/* Logo — translate down so its center aligns with the line (like splash screen) */}
          <button
            onClick={() => { showDesktop(); navigate('/home'); }}
            className="shrink-0 pr-2 sm:pr-3 group cursor-pointer sm:translate-y-1/2 relative z-10"
          >
            <img
              src={logoUrl}
              alt="Logo"
              className="w-7 h-7 sm:w-12 sm:h-12 lg:w-14 lg:h-14 transition-transform duration-200 group-hover:scale-110 dark:brightness-0 dark:invert"
            />
          </button>

          {/* Mobile: simple spacer between logo and hamburger */}
          <div className="flex-1 sm:hidden" />

          {/* Desktop/tablet: nav above the line, line at the bottom */}
          <div className="hidden sm:flex flex-1 flex-col min-w-0">
            <div className="flex items-end pb-1.5">
              <nav className="hidden lg:flex items-center gap-12 xl:gap-14 ml-8 xl:ml-12" style={{ fontFamily: "'Geist Mono', 'SF Mono', 'Fira Code', monospace" }}>
                {navItems.map((item) => (
                  item.external ? (
                    <a
                      key={item.label}
                      href={item.path}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[15px] font-medium transition-colors duration-200 text-neutral-400 dark:text-[rgba(255,255,255,0.35)] hover:text-neutral-700 dark:hover:text-white"
                    >
                      {item.label}
                    </a>
                  ) : (
                    <Link
                      key={item.label}
                      to={item.path}
                      className={`text-[15px] font-medium transition-colors duration-200 ${
                        isActive(item.path)
                          ? 'text-neutral-900 dark:text-white'
                          : 'text-neutral-400 dark:text-[rgba(255,255,255,0.35)] hover:text-neutral-700 dark:hover:text-white'
                      }`}
                    >
                      {item.label}
                    </Link>
                  )
                ))}
              </nav>

              <div className="flex-1" />

              {(devConfig.aggregatorUrl || devConfig.skipTrustBase) && (
                <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-orange-500/10 border border-orange-500/30 text-[10px] sm:text-xs font-mono mr-3">
                  <span className="text-orange-500 font-semibold">DEV</span>
                  <span className="text-orange-400/80 hidden sm:inline">
                    {devConfig.aggregatorUrl && (
                      <span title={devConfig.aggregatorUrl}>
                        {getHostname(devConfig.aggregatorUrl)}
                      </span>
                    )}
                    {devConfig.aggregatorUrl && devConfig.skipTrustBase && " | "}
                    {devConfig.skipTrustBase && "TB:OFF"}
                  </span>
                  <button
                    onClick={devReset}
                    className="ml-1 px-1.5 py-0.5 rounded bg-orange-500/20 hover:bg-orange-500/30 text-orange-500 font-semibold transition-colors"
                    title="Reset dev settings to production defaults"
                  >
                    RESET
                  </button>
                </div>
              )}

              {/* Desktop: custody status — IPFS sync (legacy) / wallet-api
                  session (S4); each renders only in its own composition. */}
              <div className="hidden lg:flex items-center gap-3">
                <IpfsSyncIndicator />
                <WalletApiSessionIndicator />
                {/* <ThemeToggle /> */}
              </div>
            </div>

            {/* Line */}
            <div className="h-0.5 bg-neutral-300 dark:bg-[#fefefe] rounded-[10px]" />
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden shrink-0 p-2 hover:bg-neutral-100 dark:hover:bg-brand-orange-dim rounded-lg transition-all sm:ml-2 sm:translate-y-1/2 relative z-10"
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6 text-neutral-500 dark:text-neutral-400" />
            ) : (
              <Menu className="w-6 h-6 text-neutral-500 dark:text-neutral-400" />
            )}
          </button>
        </div>
      </div>
    </header>

    {/* Mobile Menu */}
    <AnimatePresence>
      {mobileMenuOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            onClick={() => setMobileMenuOpen(false)}
            className="lg:hidden fixed inset-0 top-[50px] bg-black/40 z-60"
          />
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
            className="lg:hidden fixed left-0 right-0 top-[50px] z-60 overflow-hidden bg-white dark:bg-modal-bg border-b border-neutral-200 dark:border-brand-orange-border shadow-2xl dark:shadow-[0_8px_40px_rgba(0,0,0,0.5)]"
          >
          <nav className="px-4 py-2 space-y-0.5" style={{ fontFamily: "'Geist Mono', 'SF Mono', 'Fira Code', monospace" }}>
            {navItems.map((item) => (
              item.external ? (
                <a
                  key={item.label}
                  href={item.path}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full flex items-center px-4 py-3 rounded-xl text-base font-medium transition-all text-neutral-500 dark:text-white/55 hover:bg-neutral-100 dark:hover:bg-brand-orange-dim"
                >
                  {item.label}
                </a>
              ) : (
                <button
                  key={item.label}
                  onClick={() => handleMobileNavigation(item.path)}
                  className={`relative w-full flex items-center px-4 py-3 rounded-xl text-base font-medium transition-all text-left ${
                    isActive(item.path)
                      ? 'text-neutral-900 dark:text-white'
                      : 'text-neutral-500 dark:text-white/55 hover:bg-neutral-100 dark:hover:bg-brand-orange-dim'
                  }`}
                >
                  {isActive(item.path) && (
                    <motion.span
                      initial={{ scaleY: 0, opacity: 0 }}
                      animate={{ scaleY: 1, opacity: 1 }}
                      transition={{ duration: 0.2, ease: 'easeOut' }}
                      className="absolute left-0 top-2 bottom-2 w-0.5 bg-orange-500 dark:bg-brand-orange origin-center rounded-full"
                    />
                  )}
                  {item.label}
                </button>
              )
            ))}

            {/* Custody status + Social links — mobile only */}
            <div className="px-4 py-3 border-t border-neutral-200 dark:border-brand-orange-border mt-1 flex items-center">
              <IpfsSyncIndicator />
              <WalletApiSessionIndicator />
              <div className="flex-1" />
              <div className="flex items-center gap-5">
                {[
                  { href: 'https://x.com/unicity_labs', icon: <XIcon className="w-5 h-5" />, label: 'X' },
                  { href: 'https://discord.com/invite/PGzNZT5uVp', icon: <DiscordIcon className="w-5 h-5" />, label: 'Discord' },
                  { href: 'https://github.com/unicity-sphere/sphere', icon: <Github className="w-5 h-5" />, label: 'GitHub' },
                  { href: 'https://www.linkedin.com/company/unicity-labs/', icon: <Linkedin className="w-5 h-5" />, label: 'LinkedIn' },
                ].map(({ href, icon, label }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className="text-neutral-400 dark:text-white/35 hover:text-orange-500 dark:hover:text-brand-orange transition-colors"
                  >
                    {icon}
                  </a>
                ))}
              </div>
            </div>
          </nav>
        </motion.div>
        </>
      )}
    </AnimatePresence>

    </>
  );
}
