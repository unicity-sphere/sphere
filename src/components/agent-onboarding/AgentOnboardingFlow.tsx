import { AnimatePresence } from 'framer-motion';
import { useAgentOnboarding } from './hooks/useAgentOnboarding';
import {
  AgentIntroScreen,
  AgentNameScreen,
  AgentPersonalityScreen,
  AgentNametagScreen,
  AgentIntegrationsScreen,
  AgentDoneScreen,
} from './components';

interface AgentOnboardingFlowProps {
  onComplete: () => void;
  onSkip: () => void;
}

export function AgentOnboardingFlow({ onComplete, onSkip }: AgentOnboardingFlowProps) {
  const {
    step,
    goNext,
    goBack,
    error,
    name,
    setName,
    avatar,
    setAvatar,
    personality,
    setPersonality,
    nametagInput,
    setNametagInput,
    availability,
    integrations,
    updateIntegration,
    handleFinish,
  } = useAgentOnboarding(onComplete);

  return (
    <div className="flex flex-col items-center justify-center min-h-full p-6 text-center relative">
      <AnimatePresence mode="wait">
        {step === 'intro' && <AgentIntroScreen onStart={goNext} onSkip={onSkip} />}

        {step === 'name' && (
          <AgentNameScreen
            name={name}
            onNameChange={setName}
            avatar={avatar}
            onAvatarChange={setAvatar}
            onSubmit={goNext}
            onBack={goBack}
          />
        )}

        {step === 'personality' && (
          <AgentPersonalityScreen
            personality={personality}
            onChange={setPersonality}
            onSubmit={goNext}
            onBack={goBack}
          />
        )}

        {step === 'nametag' && (
          <AgentNametagScreen
            nametagInput={nametagInput}
            availability={availability}
            onChange={setNametagInput}
            onSubmit={goNext}
            onBack={goBack}
            error={error}
          />
        )}

        {step === 'integrations' && (
          <AgentIntegrationsScreen
            integrations={integrations}
            onChange={updateIntegration}
            onSubmit={goNext}
            onBack={goBack}
          />
        )}

        {step === 'done' && (
          <AgentDoneScreen
            name={name}
            nametag={nametagInput}
            avatar={avatar}
            personality={personality}
            integrations={integrations}
            onFinish={handleFinish}
            onBack={goBack}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
