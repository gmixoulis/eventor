import { useState } from 'react';

import { Field, SelectField, TextField } from '@/components/account/fields';
import { FormPage } from '@/components/account/form-page';
import { requiredError } from '@/components/account/validators';
import { listInterestGroups } from '@/data';
import { useProfile } from '@/store';

const INDUSTRIES =
  listInterestGroups()
    .find((group) => group.id === 'group-industry')
    ?.interests.map((interest) => interest.name) ?? [];

export default function CompanyScreen() {
  const { profile, updateProfile } = useProfile();
  const [company, setCompany] = useState(profile.company);
  const [industry, setIndustry] = useState(profile.industry);
  const [countries, setCountries] = useState(profile.countries.join(', '));

  const save = () =>
    updateProfile({
      company,
      industry,
      countries: countries.split(',').map((c) => c.trim()).filter(Boolean),
    });

  const companyErr = requiredError(company);
  const saveDisabled = companyErr !== null;

  return (
    <FormPage title="Company information" onSave={save} saveDisabled={saveDisabled}>
      <Field label="Company" required error={companyErr}>
        <TextField
          value={company}
          onChangeText={setCompany}
          placeholder="Company"
        />
      </Field>
      <Field label="Industry">
        <SelectField
          value={industry}
          options={INDUSTRIES}
          onSelect={setIndustry}
          placeholder="Select an industry"
        />
      </Field>
      <Field label="Countries">
        <TextField
          value={countries}
          onChangeText={setCountries}
          placeholder="Greece, Germany"
          autoCapitalize="words"
        />
      </Field>
    </FormPage>
  );
}
