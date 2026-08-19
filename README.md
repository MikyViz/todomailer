# TodoMailer

Chrome/Edge/Firefox extension (MV3) + Node.js backend for saving todos and sending them by email.

## Project structure

- `extension` - browser extension (TypeScript + React + Vite)
- `server` - Express API (`POST /send`) for email delivery

## 1) Run backend

```bash
cd server
npm install
cp .env.example .env
npm run dev
```

Fill `.env` with valid SMTP credentials. If using Gmail as the sender, enable 2-Step Verification
on that Google account and create an **App Password** (Google Account → Security → 2-Step
Verification → App Passwords) — use it as `SMTP_PASS`, not the account's normal password. This is
plain SMTP auth and does not require a Google Cloud project, OAuth consent screen, or domain
verification.
Also configure the Supabase project URL and service-role key. The service-role key must stay on the server.

### Deploy to Vercel (free, no SMTP port blocking)

`server/api/send.ts` and `server/api/health.ts` are ready to run as Vercel serverless functions.

1. Push the repo to GitHub and import it in Vercel.
2. Set the project's **Root Directory** to `server`.
3. Add the same variables from `server/.env.example` as Environment Variables in the Vercel project
   settings (`SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`,
   `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`). `PORT` is not needed on Vercel.
4. Deploy. The endpoint will be available at `https://<your-project>.vercel.app/api/send`.
5. Set `VITE_BACKEND_SEND_URL` in `extension/.env` to that URL, and add the same host to
   `host_permissions` in `extension/manifest.json` / `extension/manifest.firefox.json`.

`npm run dev` / `npm run build` locally still use the Express server in `server/index.ts` on
`http://localhost:3000`, sharing the same mail-sending logic from `server/src/core.ts`.

## 2) Build extension

```bash
cd extension
npm install
cp .env.example .env
npm run build
```

Fill `extension/.env` with the Supabase project URL and anon key. Enable Email authentication in
Supabase, and configure the project's site URL and redirect URLs for the extension before publishing.
Set `VITE_BACKEND_SEND_URL` if backend is not running at `http://localhost:3000/send`.

Load unpacked extension in Chrome/Edge from `extension/dist`.

## 3) Build for Firefox

```bash
cd extension
npm run build:firefox
```

Open `about:debugging` -> **This Firefox** -> **Load Temporary Add-on...** and select `extension/dist/manifest.json`.

For Chrome/Edge builds use:

```bash
cd extension
npm run build:chrome
```

## Privacy

Todo Mailer stores only the local app data needed for task management and settings in the browser. It sends emails through a configured SMTP server and does not use third-party analytics or tracking services. The email provider may keep sent messages and metadata according to its own privacy policy.

## Behavior implemented

- Popup with textarea + **Send** button
- Todo gets saved to `chrome.storage.local` with timestamp
- Email is sent via backend endpoint (default `http://localhost:3000/send`)
- Settings in popup and separate options page:
  - Show todo list toggle (default OFF)
  - Retention period (Day / 3 days / Week / Month / Until delete), default Week
  - Supabase sign-in
- Todo list supports:
  - complete/incomplete checkbox with strikethrough
  - manual delete
  - resend individual todo
  - resend full list
- Auto-cleanup:
  - On popup/options open
  - Via `chrome.alarms` in background service worker

## API contract (`POST /send`)

```json
{
  "subject": "Todo update",
  "todoText": "One todo text",
  "todos": [{ "text": "Task", "completed": false, "createdAt": 0 }]
}
```

`todoText` is used for single todo messages, `todos` for digest messages. The request requires a
Supabase access token in the `Authorization: Bearer <token>` header. The server always sends to the
authenticated user's confirmed email address.
