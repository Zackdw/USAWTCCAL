// Settings for the Regional Founders landing page and application.
// Edit this file to change dates, submission handling, or the regions shown on the public map.
window.foundersConfig = {
  // First month of the 12-month season calendar (matches the Sep start in ../site-config.js).
  seasonStart: '2026-09-01',

  // Months 1–6 of the season (see the Region founding bar in ../site-config.js).
  foundingWindow: {
    opens: '2026-10-01',
    closes: '2027-03-01',
  },

  submission: {
    // POST endpoint that receives the application JSON (Google Apps Script, Formspree, a small API, etc.).
    // Leave blank until one exists: applicants will be offered a download of their application instead.
    endpoint: '',
    // Shown on the confirmation screen when no endpoint is configured.
    contactNote: 'Send the downloaded file to the WTC USA Kill Team organizers in the project Discord.',
  },

  // Approved regions shown on the landing page map. Paste the `region` GeoJSON from an approved
  // application into `features`, and set `properties.path` to regional, provisional, or affiliate.
  publishedRegions: {
    type: 'FeatureCollection',
    features: [],
  },
};
