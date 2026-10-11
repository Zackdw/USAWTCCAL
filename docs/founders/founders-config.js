// Settings for the Regional Founders landing page and application.
// Edit this file to change dates, submission handling, or the regions shown on the public map.
window.foundersConfig = {
  // First month of the 12-month season calendar (matches the Sep start in the review hub timeline).
  seasonStart: '2026-09-01',

  // Months 1–6 of the season (see the Region founding bar in the review hub timeline).
  foundingWindow: {
    opens: '2026-10-01',
    closes: '2027-03-01',
  },

  submission: {
    // Web config for the usa-killteam-founders Firebase project. These values identify the
    // project and are safe to publish; access is controlled by founders-backend/firestore.rules.
    // Remove `firebase` to switch submission off: applicants are then offered a download instead.
    firebase: {
      projectId: 'usa-killteam-founders',
      appId: '1:899159101719:web:6cbdfe5bcf50e5c5a42752',
      apiKey: 'AIzaSyD_H_R2M-I8cEE-0IFhyLJ9vK6ILwjar5k',
      authDomain: 'usa-killteam-founders.firebaseapp.com',
    },
    applicationsCollection: 'founderApplications',
    regionsCollection: 'founderRegions',
    // Shown on the confirmation screen when submission is switched off.
    contactNote: 'Send the downloaded file to the USA Killteam organizers in the project Discord.',
  },

  // Regions always shown on the landing page map, in addition to approved regions loaded from
  // the database. Each feature needs `properties.path`: regional, provisional, or affiliate.
  publishedRegions: {
    type: 'FeatureCollection',
    features: [],
  },
};
