import { useState } from 'react';

import { Field, TextField } from '@/components/account/fields';
import { FormPage } from '@/components/account/form-page';
import { httpsError } from '@/components/account/validators';
import { useProfile } from '@/store';

export default function SocialScreen() {
  const { profile, updateProfile } = useProfile();
  const [website, setWebsite] = useState(profile.social.website ?? '');
  const [linkedin, setLinkedin] = useState(profile.social.linkedin ?? '');
  const [instagram, setInstagram] = useState(profile.social.instagram ?? '');
  const [twitter, setTwitter] = useState(profile.social.twitter ?? '');

  const save = () =>
    updateProfile({
      social: {
        website: website.trim() || undefined,
        linkedin: linkedin.trim() || undefined,
        instagram: instagram.trim() || undefined,
        twitter: twitter.trim() || undefined,
      },
    });

  const websiteErr = httpsError(website);
  const linkedinErr = httpsError(linkedin);
  const instagramErr = httpsError(instagram);
  const twitterErr = httpsError(twitter);
  const saveDisabled =
    websiteErr !== null || linkedinErr !== null || instagramErr !== null || twitterErr !== null;

  return (
    <FormPage title="Social media" onSave={save} saveDisabled={saveDisabled}>
      <Field label="Website" error={websiteErr}>
        <TextField
          value={website}
          onChangeText={setWebsite}
          placeholder="https://example.com"
          keyboardType="url"
          autoCapitalize="none"
        />
      </Field>
      <Field label="LinkedIn" error={linkedinErr}>
        <TextField
          value={linkedin}
          onChangeText={setLinkedin}
          placeholder="https://linkedin.com/in/you"
          keyboardType="url"
          autoCapitalize="none"
        />
      </Field>
      <Field label="Instagram" error={instagramErr}>
        <TextField
          value={instagram}
          onChangeText={setInstagram}
          placeholder="https://instagram.com/you"
          keyboardType="url"
          autoCapitalize="none"
        />
      </Field>
      <Field label="Twitter" error={twitterErr}>
        <TextField
          value={twitter}
          onChangeText={setTwitter}
          placeholder="https://twitter.com/you"
          keyboardType="url"
          autoCapitalize="none"
        />
      </Field>
    </FormPage>
  );
}
