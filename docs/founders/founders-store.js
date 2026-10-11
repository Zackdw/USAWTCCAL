// Talks to the founders Firestore database: sends applications and reads approved regions.
// The Firebase SDK is loaded only when one of these is first called.
(function () {
  const SDK = 'https://www.gstatic.com/firebasejs/10.14.1';
  const settings = window.foundersConfig?.submission ?? {};
  let connection = null;

  function isConfigured() {
    return Boolean(settings.firebase?.projectId && settings.firebase?.apiKey);
  }

  function connect() {
    if (!connection) {
      connection = Promise.all([
        import(`${SDK}/firebase-app.js`),
        import(`${SDK}/firebase-firestore-lite.js`),
      ]).then(([appModule, firestore]) => ({
        firestore,
        db: firestore.getFirestore(appModule.initializeApp(settings.firebase)),
      })).catch((error) => {
        connection = null;
        throw error;
      });
    }
    return connection;
  }

  // Stores one application. Summary fields sit beside the full application so organizers can
  // list applications without opening each one. Security rules allow creating only.
  async function submitApplication(submission, { replaces } = {}) {
    const { firestore, db } = await connect();
    const { properties } = submission.region;
    const record = {
      applicationId: submission.id,
      schemaVersion: submission.schemaVersion,
      status: 'pending',
      path: submission.path,
      regionName: properties.name,
      homeBase: properties.homeBase ?? '',
      states: properties.states ?? [],
      createdAt: firestore.serverTimestamp(),
      payload: JSON.stringify(submission),
    };
    if (typeof properties.areaSqMi === 'number') record.areaSqMi = properties.areaSqMi;
    if (replaces) record.replaces = replaces;
    await firestore.setDoc(firestore.doc(db, settings.applicationsCollection, submission.id), record);
  }

  // Approved regions as GeoJSON features for the public map.
  async function loadRegions() {
    const { firestore, db } = await connect();
    const snapshot = await firestore.getDocs(firestore.collection(db, settings.regionsCollection));
    return snapshot.docs.flatMap((entry) => {
      const data = entry.data();
      try {
        return [{
          type: 'Feature',
          geometry: JSON.parse(data.geometry),
          properties: { name: data.name, path: data.path, homeBase: data.homeBase, states: data.states ?? [] },
        }];
      } catch {
        return [];
      }
    });
  }

  window.FoundersStore = { isConfigured, submitApplication, loadRegions };
})();
