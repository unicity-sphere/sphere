/**
 * CreateWalletFlow - Main onboarding flow component
 * Uses extracted hooks for state management and screen components for UI
 */
import { useEffect, useRef } from "react";
import { AnimatePresence } from "framer-motion";
import { useSphereContext } from "../../../sdk/hooks/core/useSphere";
import { useOnboardingFlow, type OnboardingStep } from "./hooks/useOnboardingFlow";

// Import screen components
import {
  StartScreen,
  RestoreScreen,
  RestoreMethodScreen,
  ImportFileScreen,
  PasswordPromptScreen,
  AddressSelectionScreen,
  NametagScreen,
  ProcessingScreen,
  MnemonicBackupScreen,
  PlanCapabilitiesScreen,
} from "./components";

export type { OnboardingStep } from "./hooks/useOnboardingFlow";

export function CreateWalletFlow({ initialStep }: { initialStep?: OnboardingStep } = {}) {
  const { initProgress } = useSphereContext();
  const progressMessage = initProgress?.message ?? null;

  // Main onboarding flow hook
  const {
    // Step management
    step,
    setStep,
    goToStart,

    // State
    isBusy,
    error,

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
    handleMnemonicBackupComplete,
    handleDownloadBackup,

    // Subscription plan-capabilities state (post-finalize provisioning)
    planName,
    planCreated,
    handlePlanCapabilitiesContinue,

    // Generated mnemonic (for backup screen)
    generatedMnemonic,

    // Address selection state (multi-select)
    derivedAddresses,
    selectedKeys,

    // Multi-select actions
    handleToggleSelect,
    handleSelectAll,
    handleDeselectAll,

    // Actions
    handleCreateKeys,
    handleRestoreWallet,
    handleMintNametag,
    handleSkipNametag,
    handleDeriveNewAddress,
    handleContinueWithAddress,

    // File import actions
    handleFileSelect,
    handleClearFile,
    handleFileImport,
    handlePasswordSubmit,
    handleDragOver,
    handleDragLeave,
    handleDrop,

    // Wallet context
    identity,
    nametag,
  } = useOnboardingFlow(initialStep);

  // Block navigation clicks outside wallet panel during critical steps.
  // Sets pointer-events:none on body, re-enables on wallet panel and on
  // fixed/absolute modals (z-100) so Connect intents still work.
  const isLocked = step === "processing" || step === "mnemonicBackup";
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isLocked) return;

    document.body.style.pointerEvents = "none";

    // Re-enable on wallet panel
    const panel = panelRef.current?.closest("[data-wallet-panel]") as HTMLElement | null;
    if (panel) panel.style.pointerEvents = "auto";

    // Re-enable on all fixed-position overlays (BaseModal backdrops & containers)
    const style = document.createElement("style");
    style.setAttribute("data-wallet-lock", "");
    style.textContent = "[style*='position: fixed'], [class*='fixed'] { pointer-events: auto !important; }";
    document.head.appendChild(style);

    return () => {
      document.body.style.pointerEvents = "";
      if (panel) panel.style.pointerEvents = "";
      style.remove();
    };
  }, [isLocked]);

  return (
    <div ref={panelRef} className="flex flex-col items-center justify-center min-h-full p-6 text-center relative">
      <AnimatePresence mode="wait">
        {step === "start" && (
          <StartScreen
            identity={identity}
            nametag={nametag}
            isBusy={isBusy}
            ipnsFetchingNametag={false}
            error={error}
            progressMessage={progressMessage}
            onCreateWallet={handleCreateKeys}
            onContinueSetup={() => setStep("nametag")}
            onRestore={() => setStep("restoreMethod")}
          />
        )}

        {step === "restoreMethod" && (
          <RestoreMethodScreen
            isBusy={isBusy}
            error={error}
            onSelectMnemonic={() => setStep("restore")}
            onSelectFile={() => setStep("importFile")}
            onBack={goToStart}
          />
        )}

        {step === "restore" && (
          <RestoreScreen
            seedWords={seedWords}
            isBusy={isBusy}
            error={error}
            progressMessage={progressMessage}
            onSeedWordsChange={setSeedWords}
            onRestore={handleRestoreWallet}
            onBack={() => setStep("restoreMethod")}
          />
        )}

        {step === "importFile" && (
          <ImportFileScreen
            selectedFile={selectedFile}
            isDragging={isDragging}
            isBusy={isBusy}
            error={error}
            progressMessage={progressMessage}
            onFileSelect={handleFileSelect}
            onClearFile={handleClearFile}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onImport={handleFileImport}
            onBack={() => setStep("restoreMethod")}
          />
        )}

        {step === "passwordPrompt" && (
          <PasswordPromptScreen
            fileName={selectedFile?.name || ""}
            isBusy={isBusy}
            error={error}
            onSubmit={handlePasswordSubmit}
            onBack={() => setStep("importFile")}
          />
        )}

        {step === "addressSelection" && (
          <AddressSelectionScreen
            derivedAddresses={derivedAddresses}
            selectedKeys={selectedKeys}
            isBusy={isBusy}
            error={error}
            onToggleSelect={handleToggleSelect}
            onSelectAll={handleSelectAll}
            onDeselectAll={handleDeselectAll}
            onDeriveNewAddress={handleDeriveNewAddress}
            onContinue={handleContinueWithAddress}
            onBack={goToStart}
          />
        )}

        {step === "nametag" && (
          <NametagScreen
            nametagInput={nametagInput}
            isBusy={isBusy}
            error={error}
            availability={nametagAvailability}
            onNametagChange={setNametagInput}
            onSubmit={handleMintNametag}
            onSkip={handleSkipNametag}
            onBack={goToStart}
          />
        )}

        {step === "processing" && (
          <ProcessingScreen
            status={processingStatus}
            currentStep={processingStep}
            totalSteps={processingTotalSteps}
            title={processingTitle}
            completeTitle={processingCompleteTitle}
            isComplete={isProcessingComplete}
          />
        )}

        {step === "mnemonicBackup" && generatedMnemonic && (
          <MnemonicBackupScreen
            mnemonic={generatedMnemonic}
            onDownloadBackup={handleDownloadBackup}
            onConfirm={handleMnemonicBackupComplete}
          />
        )}

        {step === "planCapabilities" && (
          <PlanCapabilitiesScreen
            planName={planName}
            created={planCreated}
            onContinue={handlePlanCapabilitiesContinue}
            isBusy={isBusy}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
