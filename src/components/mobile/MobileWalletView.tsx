import { WalletPanel } from '../wallet/WalletPanel';

export function MobileWalletView() {
  return (
    <div className="absolute inset-0 z-[100] flex flex-col bg-white dark:bg-[#060606] lg:hidden">
      <WalletPanel />
    </div>
  );
}
