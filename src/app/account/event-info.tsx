import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { Field, SelectField, TextField } from '@/components/account/fields';
import { FormPage } from '@/components/account/form-page';
import { INTRO_MAX, introError, requiredError } from '@/components/account/validators';
import { makeStyles } from '@/components/theme';
import { typeScale } from '@/constants/theme';
import { listInterestGroups } from '@/data';
import { useProfile } from '@/store';

const ROLES = ['Startup', 'Investor', 'Corporate', 'Media'] as const;

const INDUSTRIES =
  listInterestGroups()
    .find((group) => group.id === 'group-industry')
    ?.interests.map((interest) => interest.name) ?? [];

export default function EventInfoScreen() {
  const styles = useStyles();
  const { profile, updateProfile } = useProfile();
  const [intro, setIntro] = useState(profile.intro);
  const [role, setRole] = useState(profile.role);
  const [industry, setIndustry] = useState(profile.industry);

  const introErr = introError(intro);
  const roleErr = requiredError(role);
  const industryErr = requiredError(industry);
  const over = intro.length > INTRO_MAX;

  const save = () => updateProfile({ intro, role, industry });
  const saveDisabled = introErr !== null || roleErr !== null || !industry;

  return (
    <FormPage title="Event information" onSave={save} saveDisabled={saveDisabled}>
      <Field
        label="Your introduction"
        required
        error={introErr}
        right={
          <Text style={[styles.counter, over && styles.counterOver]}>
            {intro.length}/{INTRO_MAX}
          </Text>
        }>
        <TextField
          value={intro}
          onChangeText={setIntro}
          placeholder="Tell others about yourself"
          multiline
        />
      </Field>

      <Field label="What best describes you at this event?" required error={roleErr}>
        <SelectField
          value={role}
          options={[...ROLES]}
          onSelect={setRole}
          placeholder="Select a role"
        />
      </Field>

      <Field label="What industry is your company in?" required error={industryErr}>
        <SelectField
          value={industry}
          options={INDUSTRIES}
          onSelect={setIndustry}
          placeholder="Select an industry"
        />
      </Field>
    </FormPage>
  );
}

const useStyles = makeStyles(({ colors }) => StyleSheet.create({
  counter: { ...typeScale.caption, color: colors.textMuted },
  counterOver: { color: colors.danger },
}));
