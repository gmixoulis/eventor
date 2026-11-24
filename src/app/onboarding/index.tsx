import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { Field, SelectField, TextField } from '@/components/account/fields';
import { INTRO_MAX } from '@/components/account/validators';
import { introStepErrors, introStepValid } from '@/components/matching/goals';
import { OnboardingFrame } from '@/components/matching/onboarding-frame';
import { makeStyles } from '@/components/theme';
import { typeScale } from '@/constants/theme';
import { listInterestGroups } from '@/data';
import { useProfile } from '@/store';

// Same options as src/app/account/event-info.tsx (route files should not export helpers).
const ROLES = ['Startup', 'Investor', 'Corporate', 'Media'];
const INDUSTRIES =
  listInterestGroups()
    .find((group) => group.id === 'group-industry')
    ?.interests.map((interest) => interest.name) ?? [];

/**
 * Step 1: role and industry save on pick; the introduction saves on each change while it is valid,
 * so leaving midway keeps the last valid text and an over-long draft never reaches the profile.
 */
export default function OnboardingIntroScreen() {
  const styles = useStyles();
  const { profile, updateProfile } = useProfile();
  const [intro, setIntro] = useState(profile.intro);
  const fields = { intro, role: profile.role, industry: profile.industry };
  const errors = introStepErrors(fields);

  const changeIntro = (value: string) => {
    setIntro(value);
    if (introStepErrors({ ...fields, intro: value }).intro === null) updateProfile({ intro: value });
  };

  return (
    <OnboardingFrame
      step={1}
      title="Introduce yourself"
      valid={introStepValid(fields)}
      onContinue={() => router.push('/onboarding/interests')}>
      <Field
        label="Your introduction"
        required
        error={errors.intro}
        right={
          <Text style={[styles.counter, intro.length > INTRO_MAX && styles.counterOver]}>
            {intro.length}/{INTRO_MAX}
          </Text>
        }>
        <TextField
          value={intro}
          onChangeText={changeIntro}
          placeholder="Tell others about yourself"
          multiline
        />
      </Field>

      <Field label="What best describes you at this event?" required error={errors.role}>
        <SelectField
          value={profile.role}
          options={ROLES}
          onSelect={(role) => updateProfile({ role })}
          placeholder="Select a role"
        />
      </Field>

      <Field label="What industry is your company in?" required error={errors.industry}>
        <SelectField
          value={profile.industry}
          options={INDUSTRIES}
          onSelect={(industry) => updateProfile({ industry })}
          placeholder="Select an industry"
        />
      </Field>
    </OnboardingFrame>
  );
}

const useStyles = makeStyles(({ colors }) => StyleSheet.create({
  counter: { ...typeScale.caption, color: colors.textMuted },
  counterOver: { color: colors.danger },
}));
