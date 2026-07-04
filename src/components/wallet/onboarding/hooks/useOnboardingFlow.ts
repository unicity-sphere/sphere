/**
 * useOnboardingFlow - Manages onboarding flow state and navigation
 * Simplified version using sphere-sdk
 */
import { useState, useCallback, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Sphere } from "@unicitylabs/sphere-sdk";
import type { LegacyFileType } from "@unicitylabs/sphere-sdk";
import { useSphereContext } from "../../../../sdk/hooks/core/useSphere";
import { SPHERE_KEYS } from "../../../../sdk/queryKeys";
import { addrKey } from "../components/addrKey";
import type { DerivedAddressInfo } from "../components/AddressSelectionScreen";
import type { NametagAvailability } from "../components/NametagScreen";
import { provisionOrRecoverKey } from "../../../../services/subscriptionApi";
import { SUBSCRIPTION_ENABLED } from "../../../../config/subscription";
import { setStoredSubscriptionKey } from "../../../../config/storageKeys";
import { saveScopedKey } from "../../../../sdk/subscription/keyVault";

export type OnboardingStep =
  | "start"
  | "restoreMethod"
  | "restore"
  | "importFile"
  | "passwordPrompt"
  | "addressSelection"
  | "nametag"
  | "processing"
  | "mnemonicBackup"
  | "planCapabilities";

export interface UseOnboardingFlowReturn {
  // Step management
  step: OnboardingStep;
  setStep: (step: OnboardingStep) => void;
  goToStart: () => void;

  // State
  isBusy: boolean;
  error: string | null;
  setError: (error: string | null) => void;
  setIsBusy: (busy: boolean) => void;

  // Mnemonic restore state
  seedWords: string[];
  setSeedWords: (words: string[]) => void;

  // File import state
  selectedFile: File | null;
  isDragging: boolean;

  // Nametag state
  nametagInput: string;
  setNametagInput: (value: string) => void;
  nametagAvailability: NametagAvailability;
  processingStatus: string;
  processingStep: number;
  processingTotalSteps: number;
  processingTitle: string;
  processingCompleteTitle: string;
  isProcessingComplete: boolean;
  handleCompleteOnboarding: () => Promise<void>;
  handleMnemonicBackupComplete: () => void;
  handleDownloadBackup: () => Promise<void>;

  // Subscription plan-capabilities state (post-finalize provisioning)
  planName: string | null;
  planCreated: boolean;
  handlePlanCapabilitiesContinue: () => void;

  // Address selection state (multi-select)
  derivedAddresses: DerivedAddressInfo[];
  selectedKeys: Set<string>;

  // Actions
  handleCreateKeys: () => Promise<void>;
  handleRestoreWallet: () => Promise<void>;
  handleMintNametag: () => Promise<void>;
  handleSkipNametag: () => Promise<void>;
  handleDeriveNewAddress: () => Promise<void>;
  handleContinueWithAddress: () => Promise<void>;
  goToAddressSelection: (skipIpnsCheck?: boolean) => Promise<void>;

  // Multi-select actions
  handleToggleSelect: (key: string) => void;
  handleSelectAll: () => void;
  handleDeselectAll: () => void;

  // File import actions
  handleFileSelect: (file: File) => Promise<void>;
  handleClearFile: () => void;
  handleFileImport: () => Promise<void>;
  handlePasswordSubmit: (password: string) => Promise<void>;
  handleDragOver: (e: React.DragEvent) => void;
  handleDragLeave: (e: React.DragEvent) => void;
  handleDrop: (e: React.DragEvent) => void;

  // Wallet context (kept for component compatibility)
  identity: { address: string; privateKey: string } | null | undefined;
  nametag: string | null | undefined;
  generatedMnemonic: string | null;
}

export function useOnboardingFlow(): UseOnboardingFlowReturn {
  const queryClient = useQueryClient();
  const { sphere, network, createWallet, resolveNametag, importWallet, importFromFile, finalizeWallet, walletExists, initProgress } = useSphereContext();

  // Step management — start at "nametag" only if wallet is fully finalized but missing nametag
  // (e.g. page refresh after wallet creation without nametag).
  // During import flow, walletExists is false (deferred to finalizeWallet) so we always start at "start".
  const [step, setStep] = useState<OnboardingStep>(
    sphere && walletExists && !sphere.identity?.nametag ? "nametag" : "start"
  );

  // Common state
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Block page reload / tab close during wallet creation
  const isProcessingActive = step === "processing" || step === "mnemonicBackup";
  useEffect(() => {
    if (!isProcessingActive) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isProcessingActive]);

  // Mnemonic restore state
  const [seedWords, setSeedWords] = useState<string[]>(Array(12).fill(""));

  // File import state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [fileContent, setFileContent] = useState<string | Uint8Array | null>(null);
  const [, setDetectedFileType] = useState<LegacyFileType>('unknown');
  const [isEncrypted, setIsEncrypted] = useState(false);
  // Holds the imported Sphere instance during the import flow.
  // NOT set in SphereProvider context until finalizeWallet() to avoid premature re-renders.
  const importedSphereRef = useRef<Sphere | null>(null);
  // True when the current flow created a brand-new wallet (vs import/restore).
  const isCreateFlowRef = useRef(false);

  // Nametag state
  const [nametagInput, setNametagInput] = useState("");
  const [nametagAvailability, setNametagAvailability] = useState<NametagAvailability>('idle');
  const [processingStatus, setProcessingStatus] = useState("");
  const [processingStep, setProcessingStep] = useState(0);
  const [processingTotalSteps, setProcessingTotalSteps] = useState(3);
  const [processingTitle, setProcessingTitle] = useState("Setting up Profile...");
  const [processingCompleteTitle, setProcessingCompleteTitle] = useState("Profile Ready!");
  const [isProcessingComplete, setIsProcessingComplete] = useState(false);

  // Subscription plan-capabilities state (post-finalize provisioning)
  const [planName, setPlanName] = useState<string | null>(null);
  const [planCreated, setPlanCreated] = useState(false);

  // Debounced nametag availability check with retry on transport failure
  useEffect(() => {
    const cleanTag = nametagInput.trim().replace(/^@/, '');
    if (!cleanTag || cleanTag.length < 2) {
      setNametagAvailability('idle');
      return;
    }

    let cancelled = false;
    setNametagAvailability('checking');

    const timer = setTimeout(async () => {
      const maxAttempts = 2;
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        if (cancelled) return;
        try {
          const existing = await resolveNametag(cleanTag);
          if (!cancelled) {
            setNametagAvailability(existing ? 'taken' : 'available');
          }
          return;
        } catch {
          if (attempt < maxAttempts) {
            // Wait before retry — transport may still be connecting
            await new Promise(r => setTimeout(r, 1500));
          }
        }
      }
      // All attempts failed
      if (!cancelled) {
        setNametagAvailability('idle');
      }
    }, 500);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [nametagInput, resolveNametag]);

  // Sync SDK progress to processing screen status text
  useEffect(() => {
    if (!initProgress || step !== 'processing') return;
    setProcessingStatus(initProgress.message);
    // Advance step indicator based on SDK progress
    switch (initProgress.step) {
      case 'recovering_nametag':
      case 'syncing_identity':
      case 'registering_nametag':
        setProcessingStep(prev => Math.max(prev, 1));
        break;
      case 'syncing_tokens':
      case 'discovering_addresses':
      case 'finalizing':
      case 'complete':
        setProcessingStep(prev => Math.max(prev, 2));
        break;
    }
  }, [initProgress, step]);

  // Address selection state (multi-select, using composite keys to distinguish receive vs change)
  const [derivedAddresses, setDerivedAddresses] = useState<DerivedAddressInfo[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());

  // Generated mnemonic (from create flow)
  const [generatedMnemonic, setGeneratedMnemonic] = useState<string | null>(null);

  // Go back to start screen
  const goToStart = useCallback(() => {
    setStep("start");
    setSeedWords(Array(12).fill(""));
    setSelectedFile(null);
    setFileContent(null);
    setDetectedFileType('unknown');
    setIsEncrypted(false);
    setIsDragging(false);
    importedSphereRef.current = null;
    isCreateFlowRef.current = false;
    setError(null);
  }, []);

  // ---- File import handlers ----

  const handleFileSelect = useCallback(async (file: File) => {
    setSelectedFile(file);
    setError(null);

    // Read file content
    let content: string | Uint8Array;
    if (file.name.endsWith('.dat')) {
      const buffer = await file.arrayBuffer();
      content = new Uint8Array(buffer);
    } else {
      content = await file.text();
    }
    setFileContent(content);

    // Detect file type and encryption
    const fileType = Sphere.detectLegacyFileType(file.name, content);
    setDetectedFileType(fileType);
    const encrypted = Sphere.isLegacyFileEncrypted(file.name, content);
    setIsEncrypted(encrypted);
  }, []);

  const handleClearFile = useCallback(() => {
    setSelectedFile(null);
    setFileContent(null);
    setDetectedFileType('unknown');
    setIsEncrypted(false);
    setError(null);
  }, []);

  // Route after successful import: show address selection (if multiple addresses discovered)
  // or go to nametag. SDK's discoverAddresses() already ran during import, so all addresses
  // are already tracked. We just read them and present the selection UI.
  const routeAfterImport = useCallback((importedSphere: Sphere) => {
    importedSphereRef.current = importedSphere;

    // Get all tracked addresses discovered by the SDK during import
    const allAddresses = importedSphere.getAllTrackedAddresses();

    if (allAddresses.length >= 1) {
      // Show address selection so user can review discovered addresses
      const addresses: DerivedAddressInfo[] = allAddresses.map(a => ({
        index: a.index,
        l3Address: a.directAddress,
        path: `m/44'/60'/0'/0/${a.index}`,
        hasNametag: !!a.nametag,
        existingNametag: a.nametag,
        isChange: false,
        balanceLoading: false,
        ipnsLoading: false,
      }));
      setDerivedAddresses(addresses);
      setSelectedKeys(new Set(addresses.map(a => addrKey(a.index, false))));
      setStep("addressSelection");
    } else if (importedSphere.identity?.nametag) {
      setStep("processing");
      setProcessingTitle("Importing Wallet...");
      setProcessingCompleteTitle("Import Complete!");
      setProcessingTotalSteps(3);
      setProcessingStep(2);
      setProcessingStatus("Setup complete!");
      setIsProcessingComplete(true);
    } else {
      setStep("nametag");
    }
  }, []);

  const handleFileImport = useCallback(async () => {
    if (!fileContent || !selectedFile) return;

    // Encrypted file → password prompt
    if (isEncrypted) {
      setStep("passwordPrompt");
      return;
    }

    setIsBusy(true);
    setError(null);

    // Show processing screen during import
    setStep("processing");
    setProcessingTitle("Importing Wallet...");
    setProcessingCompleteTitle("Import Complete!");
    setProcessingStep(0);
    setProcessingTotalSteps(3);
    setProcessingStatus("Importing wallet...");
    setIsProcessingComplete(false);

    try {
      const result = await importFromFile({
        fileContent,
        fileName: selectedFile.name,
      });

      if (!result.success) {
        if (result.needsPassword) {
          setIsEncrypted(true);
          setStep("passwordPrompt");
          return;
        }
        setError(result.error || "Import failed");
        setStep("importFile");
        return;
      }

      if (result.mnemonic) {
        setGeneratedMnemonic(result.mnemonic);
      }


      if (result.sphere) {
        routeAfterImport(result.sphere);
      } else {
        setStep("nametag");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed");
      setStep("importFile");
    } finally {
      setIsBusy(false);
    }
  }, [fileContent, selectedFile, isEncrypted, importFromFile, routeAfterImport]);

  const handlePasswordSubmit = useCallback(async (password: string) => {
    if (!fileContent || !selectedFile) return;

    setIsBusy(true);
    setError(null);

    // Show processing screen during import
    setStep("processing");
    setProcessingTitle("Importing Wallet...");
    setProcessingCompleteTitle("Import Complete!");
    setProcessingStep(0);
    setProcessingTotalSteps(3);
    setProcessingStatus("Decrypting and importing wallet...");
    setIsProcessingComplete(false);

    try {
      const result = await importFromFile({
        fileContent,
        fileName: selectedFile.name,
        password,
      });

      if (!result.success) {
        if (result.needsPassword) {
          setError("Incorrect password. Please try again.");
          setStep("passwordPrompt");
          return;
        }
        setError(result.error || "Decryption failed");
        setStep("passwordPrompt");
        return;
      }

      if (result.mnemonic) {
        setGeneratedMnemonic(result.mnemonic);
      }


      if (result.sphere) {
        routeAfterImport(result.sphere);
      } else {
        setStep("nametag");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Decryption failed");
      setStep("passwordPrompt");
    } finally {
      setIsBusy(false);
    }
  }, [fileContent, selectedFile, importFromFile, routeAfterImport]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      await handleFileSelect(file);
    }
  }, [handleFileSelect]);

  // Action: Go to nametag step (wallet is NOT created yet)
  const handleCreateKeys = useCallback(async () => {
    setError(null);
    setStep("nametag");
  }, []);

  // Action: Restore wallet from mnemonic
  const handleRestoreWallet = useCallback(async () => {
    const words = seedWords.map((w) => w.trim().toLowerCase());
    const missingIndex = words.findIndex((w) => w === "");

    if (missingIndex !== -1) {
      setError(`Please fill in word ${missingIndex + 1}`);
      return;
    }

    setIsBusy(true);
    setError(null);

    // Show processing screen during import
    setStep("processing");
    setProcessingTitle("Importing Wallet...");
    setProcessingCompleteTitle("Import Complete!");
    setProcessingStep(0);
    setProcessingTotalSteps(3);
    setProcessingStatus("Importing wallet...");
    setIsProcessingComplete(false);

    try {
      const mnemonic = words.join(" ");
      const instance = await importWallet(mnemonic);

      // Store in ref so handleMintNametag / handleSkipNametag can access it
      importedSphereRef.current = instance;

      // Route to next screen after import completes
      const allAddresses = instance.getAllTrackedAddresses();
      if (allAddresses.length >= 1) {
        const addresses: DerivedAddressInfo[] = allAddresses.map(a => ({
          index: a.index,
          l3Address: a.directAddress,
          path: `m/44'/60'/0'/0/${a.index}`,
          hasNametag: !!a.nametag,
          existingNametag: a.nametag,
          isChange: false,
          balanceLoading: false,
          ipnsLoading: false,
        }));
        setDerivedAddresses(addresses);
        setSelectedKeys(new Set(addresses.map(a => addrKey(a.index, false))));
        setStep("addressSelection");
      } else if (instance.identity?.nametag) {
        setProcessingStep(2);
        setProcessingStatus("Setup complete!");
        setIsProcessingComplete(true);
      } else {
        setStep("nametag");
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Invalid recovery phrase";
      setError(message);
      setStep("restore");
    } finally {
      setIsBusy(false);
    }
  }, [seedWords, importWallet]);

  // Action: Create wallet WITH nametag (or register nametag on imported wallet)
  const handleMintNametag = useCallback(async () => {
    if (!nametagInput.trim()) return;

    setIsBusy(true);
    setError(null);

    const cleanTag = nametagInput.trim().replace("@", "");

    setStep("processing");
    setProcessingTitle("Setting up Profile...");
    setProcessingCompleteTitle("Profile Ready!");
    setProcessingStep(0);
    setProcessingTotalSteps(3);
    setProcessingStatus("Checking Unicity ID availability...");
    setIsProcessingComplete(false);

    try {
      // Step 1: Check nametag availability via Nostr (no wallet needed)
      const existing = await resolveNametag(cleanTag);
      if (existing) {
        setError(`@${cleanTag} is already taken`);
        setStep("nametag");
        setIsBusy(false);
        return;
      }

      setProcessingStep(1);

      const activeSphere = importedSphereRef.current ?? sphere;
      if (activeSphere) {
        // Import flow — wallet already exists (in ref), just register nametag
        setProcessingStatus("Registering Unicity ID...");
        await activeSphere.registerNametag(cleanTag);
          setProcessingStep(2);
        setProcessingStatus("Setup complete!");
        setIsProcessingComplete(true);
      } else {
        // Create flow — create wallet with nametag
        setProcessingStatus("Creating wallet and registering Unicity ID...");
        const result = await createWallet({ nametag: cleanTag });
        setGeneratedMnemonic(result.mnemonic);
        importedSphereRef.current = result.sphere;
        isCreateFlowRef.current = true;
          setProcessingStep(2);
        setProcessingStatus("Setup complete!");
        setIsProcessingComplete(true);
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to register Unicity ID";
      console.error("Wallet creation with nametag failed:", e);
      setError(message);
      setStep("nametag");
    } finally {
      setIsBusy(false);
    }
  }, [nametagInput, resolveNametag, createWallet, sphere]);

  // Action: Skip nametag — create wallet without nametag (or finalize imported wallet)
  const handleSkipNametag = useCallback(async () => {
    setIsBusy(true);
    setError(null);

    try {
      setStep("processing");
      setProcessingTitle("Setting up Profile...");
      setProcessingCompleteTitle("Profile Ready!");
      setProcessingStep(0);
      setIsProcessingComplete(false);

      if (importedSphereRef.current ?? sphere) {
        // Import flow — wallet already exists (in ref), just finalize
        setProcessingTotalSteps(1);
        setProcessingStatus("Setup complete!");
        setIsProcessingComplete(true);
        } else {
        // Create flow — create wallet without nametag
        setProcessingTotalSteps(2);
        setProcessingStatus("Creating wallet...");
        const result = await createWallet();
        setGeneratedMnemonic(result.mnemonic);
        importedSphereRef.current = result.sphere;
        isCreateFlowRef.current = true;
          setProcessingStep(1);
        setProcessingStatus("Setup complete!");
        setIsProcessingComplete(true);
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to create wallet";
      console.error("Wallet creation failed:", e);
      setError(message);
      setStep("nametag");
    } finally {
      setIsBusy(false);
    }
  }, [createWallet, sphere]);

  // Finalize wallet and switch to wallet UI
  const finishFinalize = useCallback(() => {
    finalizeWallet(importedSphereRef.current ?? undefined);
    importedSphereRef.current = null;
    isCreateFlowRef.current = false;
    queryClient.removeQueries({ queryKey: SPHERE_KEYS.all });
    window.dispatchEvent(new Event("wallet-loaded"));
    window.dispatchEvent(new Event("wallet-updated"));
    setStep("start");
  }, [queryClient, finalizeWallet]);

  // Provision/recover the subscription key, then show capabilities. On any
  // failure (or flag off) fall through to finalize with the env-key fallback.
  const doFinalizeWallet = useCallback(async () => {
    const active = importedSphereRef.current ?? sphere;
    if (SUBSCRIPTION_ENABLED && active) {
      try {
        const result = await provisionOrRecoverKey(active);
        // Persist ONLY — do NOT re-init here. Re-initializing now (like
        // applySubscriptionKey does) would flip walletExists to true and
        // unmount CreateWalletFlow before the capabilities screen renders.
        // The stored key becomes the ACTIVE oracle key on the SDK's next
        // initialize() (page reload / re-init); until then the env
        // VITE_AGGREGATOR_API_KEY remains the Phase-1 fallback. (Phase 5
        // will move provisioning ahead of the nametag mint so the key is
        // used from the first init.)
        setStoredSubscriptionKey(result.apiKey);
        // Durable per-identity copy; non-fatal if it fails (cache still set).
        await saveScopedKey(active, network, result.apiKey).catch(() => {});
        setPlanName(result.plan);
        setPlanCreated(result.created);
        setStep("planCapabilities");
        return;
      } catch (err) {
        // Non-fatal: keep onboarding working on the env-key fallback.
        console.warn('subscription provisioning failed; using fallback key', err);
      }
    }
    finishFinalize();
  }, [sphere, network, finishFinalize]);

  // Auto-transition when processing completes
  useEffect(() => {
    if (isProcessingComplete && step === "processing") {
      const timer = setTimeout(() => {
        if (isCreateFlowRef.current && generatedMnemonic) {
          setStep("mnemonicBackup");
        } else {
          void doFinalizeWallet();
        }
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [isProcessingComplete, generatedMnemonic, step, doFinalizeWallet]);

  // Legacy handler kept for interface compatibility (no longer shows "Let's Go")
  const handleCompleteOnboarding = useCallback(async () => {
    void doFinalizeWallet();
  }, [doFinalizeWallet]);

  // Action: Confirm mnemonic backup (called after user saves recovery phrase)
  const handleMnemonicBackupComplete = useCallback(() => {
    void doFinalizeWallet();
  }, [doFinalizeWallet]);

  // Action: Continue from the plan-capabilities screen into the wallet
  const handlePlanCapabilitiesContinue = useCallback(() => {
    finishFinalize();
  }, [finishFinalize]);

  // Action: Download wallet backup file
  const handleDownloadBackup = useCallback(async () => {
    const activeSphere = importedSphereRef.current ?? sphere;
    if (!activeSphere) return;
    const jsonData = activeSphere.exportToJSON({ includeMnemonic: true });
    const nametag = activeSphere.identity?.nametag?.replace(/^@/, "");
    const fileName = nametag
      ? `${nametag}.json`
      : "sphere_wallet_backup.json";
    const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  }, [sphere]);

  // Action: Derive new address (for address selection screen)
  const handleDeriveNewAddress = useCallback(async () => {
    const activeSphere = importedSphereRef.current ?? sphere;
    if (!activeSphere) return;
    setIsBusy(true);
    try {
      const nextIndex = derivedAddresses.length;
      const addr = activeSphere.deriveAddress(nextIndex);
      setDerivedAddresses((prev) => [
        ...prev,
        {
          index: nextIndex,
          l3Address: '', // Will be populated after switching
          path: addr.path,
          hasNametag: false,
          ipnsLoading: false,
          balanceLoading: false,
        },
      ]);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to derive new address";
      setError(message);
    } finally {
      setIsBusy(false);
    }
  }, [derivedAddresses, sphere]);

  // Action: Go to address selection
  const goToAddressSelection = useCallback(
    async () => {
      const activeSphere = importedSphereRef.current ?? sphere;
      if (!activeSphere) return;
      setIsBusy(true);
      setError(null);
      try {
        const addresses = activeSphere.deriveAddresses(3);
        const results: DerivedAddressInfo[] = addresses.map((addr, i) => ({
          index: i,
          l3Address: '',
          path: addr.path,
          hasNametag: false,
          ipnsLoading: false,
          balanceLoading: false,
        }));

        setDerivedAddresses(results);
        setSelectedKeys(new Set(
          results.filter(a => !a.isChange).map(a => addrKey(a.index, false))
        ));
        setStep("addressSelection");
      } catch (e) {
        const message = e instanceof Error ? e.message : "Failed to derive addresses";
        setError(message);
      } finally {
        setIsBusy(false);
      }
    },
    [sphere]
  );

  // Action: Continue with selected addresses (multi-select)
  const handleContinueWithAddress = useCallback(async () => {
    const activeSphere = importedSphereRef.current ?? sphere;
    if (!activeSphere || selectedKeys.size === 0) return;
    setIsBusy(true);
    setError(null);

    try {
      // Bulk track non-change addresses with visibility (SDK only tracks receive addresses)
      const entries = derivedAddresses
        .filter(a => !a.isChange)
        .map(a => ({
          index: a.index,
          hidden: !selectedKeys.has(addrKey(a.index, false)),
          nametag: a.existingNametag,
        }));
      await activeSphere.trackScannedAddresses(entries);

      // Auto-select active address: first selected with nametag, or first selected
      const selectedAddrs = derivedAddresses.filter(
        a => !a.isChange && selectedKeys.has(addrKey(a.index, false))
      );
      const activeAddr = selectedAddrs.find(a => a.hasNametag) ?? selectedAddrs[0];
      if (activeAddr) {
        await activeSphere.switchToAddress(activeAddr.index);
      }

      // Route based on nametag
      if (activeSphere.identity?.nametag) {
        setStep("processing");
        setProcessingTitle("Importing Wallet...");
        setProcessingCompleteTitle("Import Complete!");
        setProcessingTotalSteps(3);
        setProcessingStep(2);
        setProcessingStatus("Setup complete!");
        setIsProcessingComplete(true);
      } else {
        setStep("nametag");
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to select address";
      setError(message);
    } finally {
      setIsBusy(false);
    }
  }, [derivedAddresses, selectedKeys, sphere]);

  // ---- Multi-select handlers ----

  const handleToggleSelect = useCallback((key: string) => {
    setSelectedKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedKeys(new Set(
      derivedAddresses.filter(a => !a.isChange).map(a => addrKey(a.index, false))
    ));
  }, [derivedAddresses]);

  const handleDeselectAll = useCallback(() => {
    setSelectedKeys(new Set());
  }, []);

  return {
    // Step management
    step,
    setStep,
    goToStart,

    // State
    isBusy,
    error,
    setError,
    setIsBusy,

    // Mnemonic restore state
    seedWords,
    setSeedWords,

    // File import state
    selectedFile,
    isDragging,

    // Nametag state
    nametagInput,
    setNametagInput,
    nametagAvailability,
    processingStatus,
    processingStep,
    processingTotalSteps,
    processingTitle,
    processingCompleteTitle,
    isProcessingComplete,
    handleCompleteOnboarding,
    handleMnemonicBackupComplete,
    handleDownloadBackup,

    // Subscription plan-capabilities state (post-finalize provisioning)
    planName,
    planCreated,
    handlePlanCapabilitiesContinue,

    // Address selection state (multi-select)
    derivedAddresses,
    selectedKeys,

    // Actions
    handleCreateKeys,
    handleRestoreWallet,
    handleMintNametag,
    handleSkipNametag,
    handleDeriveNewAddress,
    handleContinueWithAddress,
    goToAddressSelection,

    // Multi-select actions
    handleToggleSelect,
    handleSelectAll,
    handleDeselectAll,

    // File import actions
    handleFileSelect,
    handleClearFile,
    handleFileImport,
    handlePasswordSubmit,
    handleDragOver,
    handleDragLeave,
    handleDrop,

    // Wallet context
    identity: sphere?.identity ? {
      address: sphere.identity.directAddress ?? '',
      privateKey: '', // Not exposed by SDK public API
    } : null,
    nametag: sphere?.identity?.nametag ?? null,
    generatedMnemonic,
  };
}
