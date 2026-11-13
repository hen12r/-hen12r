export const BRAND_NAME = 'PhotoSentry';
/** Shown in the footer and privacy notice. Temporary: replace with a dedicated product inbox. */
export const CONTACT_EMAIL = 'olivierishimwehenry@gmail.com';

/**
 * Legal notice (mentions légales). Fill in publisher, address and registration number
 * once known; until then the /legal page shows "being completed" for those fields.
 */
export const LEGAL = {
  publisher: null as string | null,
  address: null as string | null,
  registration: null as string | null, // e.g. "SIRET 123 456 789 00012"
  director: null as string | null, // directeur de la publication
  hosts: [
    { name: 'Vercel Inc.', role: 'site', address: '440 N Barranca Ave #4133, Covina, CA 91723, USA', url: 'https://vercel.com' },
    { name: 'Supabase Inc.', role: 'data', address: 'AWS eu-west-3 (Paris, EU)', url: 'https://supabase.com' },
  ],
};
