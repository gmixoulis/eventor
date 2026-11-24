import { router } from 'expo-router';

import { interestsStepValid } from '@/components/matching/goals';
import { InterestPicker } from '@/components/matching/interest-picker';
import { OnboardingFrame } from '@/components/matching/onboarding-frame';
import { useProfile } from '@/store';

export default function OnboardingInterestsScreen() {
  const { profile, updateProfile } = useProfile();

  return (
    <OnboardingFrame
      step={2}
      title="Your interests"
      valid={interestsStepValid(profile.selections)}
      error="Select at least one interest to continue."
      onContinue={() => router.push('/onboarding/availability')}>
      <InterestPicker
        selections={profile.selections}
        onChange={(selections) => updateProfile({ selections })}
      />
    </OnboardingFrame>
  );
}
