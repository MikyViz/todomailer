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

Fill `.env` with the Supabase project URL, anon key, and a Google OAuth client ID.
The Google client ID is public extension configuration; never put a Google client secret in the extension.

Create a Google OAuth client for the extension, add the extension redirect URL shown by
`chrome.identity.getRedirectURL("gmail")` to the OAuth client, and set:

```env
VITE_GOOGLE_CLIENT_ID=your-google-oauth-client-id
```

The extension requests only the `gmail.send` scope. Users authorize their own Gmail account,
and messages are sent through the Gmail API from that account. The deployed server and Resend
are not used for email delivery.

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
