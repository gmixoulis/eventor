import { useState } from 'react';

import { Field, TextField } from '@/components/account/fields';
import { FormPage } from '@/components/account/form-page';
import { requiredError } from '@/components/account/validators';
import { useProfile } from '@/store';

export default function PersonalScreen() {
  const { profile, updateProfile } = useProfile();
  const [firstName, setFirstName] = useState(profile.firstName);
  const [lastName, setLastName] = useState(profile.lastName);
  const [jobTitle, setJobTitle] = useState(profile.title);

  const save = () => updateProfile({ firstName, lastName, title: jobTitle });
  const firstNameErr = requiredError(firstName);
  const lastNameErr = requiredError(lastName);
  const jobTitleErr = requiredError(jobTitle);
  const saveDisabled = firstNameErr !== null || lastNameErr !== null || jobTitleErr !== null;

  return (
    <FormPage title="Personal information" onSave={save} saveDisabled={saveDisabled}>
      <Field label="First name" required error={firstNameErr}>
        <TextField
          value={firstName}
          onChangeText={setFirstName}
          placeholder="First name"
        />
      </Field>
      <Field label="Last name" required error={lastNameErr}>
        <TextField
          value={lastName}
          onChangeText={setLastName}
          placeholder="Last name"
        />
      </Field>
      <Field label="Job title" required error={jobTitleErr}>
        <TextField
          value={jobTitle}
          onChangeText={setJobTitle}
          placeholder="Job title"
        />
      </Field>
    </FormPage>
  );
}
