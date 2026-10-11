// Shared setup for the organizer tools: an admin connection to the founders database.
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { cert, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

export const APPLICATIONS = 'founderApplications';
export const REGIONS = 'founderRegions';
export const applicationsDir = fileURLToPath(new URL('./applications/', import.meta.url));

const keyPath = fileURLToPath(new URL('./service-account.json', import.meta.url));

export function connect() {
  if (!existsSync(keyPath)) {
    console.error(`Missing ${keyPath}\nSee README.md, "One-time setup", for how to create it.`);
    process.exit(1);
  }
  initializeApp({ credential: cert(JSON.parse(readFileSync(keyPath, 'utf8'))) });
  return getFirestore();
}
