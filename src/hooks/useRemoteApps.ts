import { useQuery } from '@tanstack/react-query';

export interface RemoteApp {
  category: string;
  name: string;
  description?: string;
  url: string;
  icon?: string;
  hidden?: boolean;
}

interface RemoteAppsResponse {
  apps: RemoteApp[];
}

const REMOTE_APPS_URL =
  'https://raw.githubusercontent.com/unicity-sphere/sphere-apps/refs/heads/main/apps.json';

async function fetchRemoteApps(): Promise<RemoteApp[]> {
  const res = await fetch(REMOTE_APPS_URL);
  if (!res.ok) throw new Error(`Failed to fetch apps: ${res.status}`);
  const data: RemoteAppsResponse = await res.json();
  return (data.apps ?? []).filter((app) => !app.hidden);
}

export function useRemoteApps() {
  return useQuery({
    queryKey: ['sphere', 'remoteApps'],
    queryFn: fetchRemoteApps,
    staleTime: 60 * 60 * 1000, // 1 hour
    gcTime: 24 * 60 * 60 * 1000, // 24 hours
    retry: 2,
  });
}
