// Downloads every application into ./applications/ (one JSON file each) and writes SUMMARY.md.
// The applications folder is git-ignored: it holds personal details and this repository is public.
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { APPLICATIONS, applicationsDir, connect } from './admin.mjs';

const db = connect();
const snapshot = await db.collection(APPLICATIONS).orderBy('createdAt').get();

const records = snapshot.docs.map((doc) => {
  const data = doc.data();
  let application = {};
  try {
    application = JSON.parse(data.payload);
  } catch {
    application = { unreadablePayload: data.payload };
  }
  return {
    applicationId: doc.id,
    status: data.status,
    receivedAt: data.createdAt?.toDate().toISOString() ?? null,
    replaces: data.replaces ?? null,
    ...application,
  };
});

// An edited application arrives as a new record pointing at the one it replaces.
const replacedBy = new Map(records.filter((r) => r.replaces).map((r) => [r.replaces, r.applicationId]));
records.forEach((record) => {
  record.replacedBy = replacedBy.get(record.applicationId) ?? null;
});

mkdirSync(applicationsDir, { recursive: true });
const added = [];
records.forEach((record) => {
  const file = join(applicationsDir, `${record.applicationId}.json`);
  if (!existsSync(file)) added.push(record.applicationId);
  writeFileSync(file, `${JSON.stringify(record, null, 2)}\n`, 'utf8');
});

const cell = (value) => String(value ?? '').replace(/\|/g, '/').replace(/\s+/g, ' ').trim();
const rows = records.map((record) => {
  const answers = record.answers ?? {};
  const status = record.replacedBy ? `replaced by ${record.replacedBy}` : record.status;
  return `| ${[
    record.applicationId,
    record.receivedAt?.slice(0, 10),
    status,
    record.path,
    answers.regionName,
    answers.homeBase,
    (answers.regionStates ?? []).join(' '),
    answers.travelReadyPlayers,
    (answers.members ?? []).length,
    answers.coordinatorName,
    answers.discord,
  ].map(cell).join(' | ')} |`;
});

writeFileSync(join(applicationsDir, 'SUMMARY.md'), [
  '# Regional Founder Applications',
  '',
  `Pulled ${new Date().toISOString()}. ${records.length} application${records.length === 1 ? '' : 's'}.`,
  '',
  '| ID | Received | Status | Path | Region | Home base | States | Travel-ready | Listed people | Coordinator | Discord |',
  '|---|---|---|---|---|---|---|---|---|---|---|',
  ...rows,
  '',
].join('\n'), 'utf8');

console.log(`${records.length} application${records.length === 1 ? '' : 's'} in ${applicationsDir}`);
console.log(added.length ? `New since last pull: ${added.join(', ')}` : 'Nothing new since last pull.');
