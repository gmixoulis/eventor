import * as Haptics from 'expo-haptics';
import { useRef } from 'react';

import { AvailabilityGrid } from '@/components/matching/availability-grid';
import { OnboardingFrame } from '@/components/matching/onboarding-frame';
import { leaveOnboarding } from '@/components/matching/onboarding-nav';

export default function OnboardingAvailabilityScreen() {
  // A double tap must not navigate twice; the screen unmounts once it leaves, so this never resets.
  const finished = useRef(false);

  // Every chip already saved to the profile; Finish only leaves the flow.
  const finish = () => {
    if (finished.current) return;
    finished.current = true;
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    leaveOnboarding();
  };

  return (
    <OnboardingFrame step={3} title="When are you available" valid onContinue={finish}>
      <AvailabilityGrid />
    </OnboardingFrame>
  );
}
