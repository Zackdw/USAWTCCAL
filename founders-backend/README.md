# Founders backend

Organizer tools for Regional Founder applications. The public site in `docs/founders/` sends applications to the `usa-killteam-founders` Firebase project. These tools bring them onto this machine for review and control what appears on the public map.

**This repository is public.** Applications contain names, emails, and Discord handles. The `applications/` folder and `service-account.json` are git-ignored. Never commit either.

## One-time setup

The tools need a private key to read applications. Create it once:

1. Open https://console.firebase.google.com/project/usa-killteam-founders/settings/serviceaccounts/adminsdk
2. Click **Generate new private key**, then **Generate key**. A `.json` file downloads.
3. Move that file into this folder and rename it `service-account.json`.

Then install the one dependency:

```
cd founders-backend
npm install
```

Treat `service-account.json` like a password. Anyone who has it can read every application.

## Everyday use

Run these from the `founders-backend` folder.

| Command | What it does |
|---|---|
| `npm run pull` | Downloads every application into `applications/`, one file each, and rewrites `applications/SUMMARY.md` |
| `npm run approve <id>` | Marks the application approved and puts its region on the public map |
| `npm run decline <id>` | Marks it declined and takes its region off the map |
| `npm run unpublish <id>` | Takes its region off the map without changing its status |
| `npm run delete <id>` | Erases the application and its region from the database |

An `<id>` looks like `WTCF-20261011-9EEJY5`. Applicants see theirs on the confirmation screen.

Approving publishes only the region shape, name, path, home base, and states touched. Nothing else leaves the private collection.

If an applicant edits and resubmits, the new version arrives as a separate application. `SUMMARY.md` marks the older one as replaced.

## How the data is laid out

| Collection | Contents | Public can | Tools can |
|---|---|---|---|
| `founderApplications` | Full applications | Add one, never read | Everything |
| `founderRegions` | Approved regions for the map | Read | Everything |

The rules that enforce this are in `firestore.rules`. After editing them, run `npm run deploy-rules`.

## Switching submission off

Remove the `firebase` block from `docs/founders/founders-config.js` and push. The application then offers a download instead of sending.
