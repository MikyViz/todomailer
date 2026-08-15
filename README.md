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

Fill `.env` with valid SMTP credentials.

## 2) Build extension

```bash
cd extension
npm install
npm run build
```

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

## Behavior implemented

- Popup with textarea + **Send** button
- Todo gets saved to `chrome.storage.local` with timestamp
- Email is sent via backend endpoint (default `http://localhost:3000/send`)
- Settings in popup and separate options page:
  - Show todo list toggle (default OFF)
  - Retention period (Day / 3 days / Week / Month / Until delete), default Week
  - User email + backend URL
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
  "to": "user@example.com",
  "subject": "Todo update",
  "todoText": "One todo text",
  "todos": [{ "text": "Task", "completed": false, "createdAt": 0 }]
}
```

`todoText` is used for single todo messages, `todos` for digest messages.
