// Records a decision on an application and controls what appears on the public map.
//
//   node review-application.mjs approve <application id>    mark approved and publish its region
//   node review-application.mjs decline <application id>    mark declined and remove its region
//   node review-application.mjs unpublish <application id>  remove its region, keep the status
//   node review-application.mjs delete <application id>     erase the application and its region
//
// Only the region shape, name, path, home base, and states are published.
import { FieldValue } from 'firebase-admin/firestore';
import { APPLICATIONS, REGIONS, connect } from './admin.mjs';

const [action, applicationId] = process.argv.slice(2);
if (!['approve', 'decline', 'unpublish', 'delete'].includes(action) || !applicationId) {
  console.error('Usage: node review-application.mjs <approve|decline|unpublish|delete> <application id>');
  process.exit(1);
}

const db = connect();
const applicationRef = db.collection(APPLICATIONS).doc(applicationId);
const regionRef = db.collection(REGIONS).doc(applicationId);
const snapshot = await applicationRef.get();

if (!snapshot.exists) {
  console.error(`No application with id ${applicationId}`);
  process.exit(1);
}

if (action === 'approve') {
  const application = JSON.parse(snapshot.data().payload);
  const { geometry, properties } = application.region;
  if (!geometry) {
    console.error('This application has no region shape, so there is nothing to publish.');
    process.exit(1);
  }
  await regionRef.set({
    applicationId,
    name: String(properties.name ?? '').trim(),
    path: properties.path,
    homeBase: String(properties.homeBase ?? '').trim(),
    states: properties.states ?? [],
    // Stored as JSON text: map shapes are nested arrays, which Firestore cannot hold natively.
    geometry: JSON.stringify(geometry),
    approvedAt: FieldValue.serverTimestamp(),
  });
  await applicationRef.update({ status: 'approved', reviewedAt: FieldValue.serverTimestamp() });
  console.log(`Approved ${applicationId}. "${String(properties.name ?? '').trim()}" is now on the public map.`);
} else if (action === 'decline') {
  await regionRef.delete();
  await applicationRef.update({ status: 'declined', reviewedAt: FieldValue.serverTimestamp() });
  console.log(`Declined ${applicationId}. It is not on the public map.`);
} else if (action === 'unpublish') {
  await regionRef.delete();
  console.log(`Removed ${applicationId} from the public map. Its status is unchanged.`);
} else {
  await regionRef.delete();
  await applicationRef.delete();
  console.log(`Deleted ${applicationId} from the database. Delete applications/${applicationId}.json too if you pulled it.`);
}
