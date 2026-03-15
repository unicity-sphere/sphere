import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SplashScreen } from '../components/splash/SplashScreen';
import { useWalletStatus } from '../sdk';

const isExtension = import.meta.env.VITE_PLATFORM === 'extension';

export function IntroPage() {
  const navigate = useNavigate();
  const { walletExists } = useWalletStatus();

  // In extension mode, skip splash when wallet exists — go straight to home
  useEffect(() => {
    if (isExtension && walletExists) {
      navigate('/home', { replace: true });
    }
  }, [walletExists, navigate]);

  if (isExtension && walletExists) return null;

  return <SplashScreen onEnter={() => navigate('/home')} />;
}
