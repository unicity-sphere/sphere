/**
 * Re-entrant-init guard for the single live Sphere instance.
 *
 * `initialize()` can run concurrently (React StrictMode double-mount, an
 * IPFS/network toggle). Each run builds its own Sphere. Only the LATEST run may
 * adopt its instance; any run that has been superseded while its `Sphere.init`
 * was in flight must DESTROY the instance it built — otherwise it leaks as a
 * zombie holding open relay + IndexedDB connections.
 *
 * `isStale()` returns true when a newer init (or an unmount) has superseded this
 * one. Because only the latest run adopts and superseded runs destroy their own
 * instance, there is always exactly one live instance.
 */
export async function adoptOrDiscardInstance<T extends { destroy: () => Promise<void> }>(
  instance: T,
  isStale: () => boolean,
  adopt: (instance: T) => void,
): Promise<'adopted' | 'discarded'> {
  if (isStale()) {
    await instance.destroy();
    return 'discarded';
  }
  adopt(instance);
  return 'adopted';
}
