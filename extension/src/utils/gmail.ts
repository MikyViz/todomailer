const GMAIL_TOKEN_KEY = "gmail-token";
const GMAIL_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim();
const GMAIL_SCOPE = "https://www.googleapis.com/auth/gmail.send";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";

interface StoredToken {
  accessToken: string;
  expiresAt: number;
  email?: string;
}

function storageGet<T>(key: string): Promise<T | undefined> {
  return new Promise((resolve) => {
    chrome.storage.local.get([key], (result) => resolve(result[key] as T | undefined));
  });
}

function storageSet(key: string, value: unknown): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [key]: value }, () => resolve());
  });
}

function randomString(length: number): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function base64Url(bytes: ArrayBuffer): string {
  const binary = String.fromCharCode(...new Uint8Array(bytes));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

async function getCodeChallenge(verifier: string): Promise<string> {
  const data = new TextEncoder().encode(verifier);
  return base64Url(await crypto.subtle.digest("SHA-256", data));
}

function launchAuth(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    chrome.identity.launchWebAuthFlow({ interactive: true, url }, (redirectUrl) => {
      const error = chrome.runtime.lastError;
      if (error || !redirectUrl) {
        reject(new Error(error?.message || "Google authorization was cancelled."));
        return;
      }
      resolve(redirectUrl);
    });
  });
}

async function exchangeCode(
  code: string,
  redirectUri: string,
  codeVerifier: string
): Promise<StoredToken> {
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: GMAIL_CLIENT_ID!,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
      code_verifier: codeVerifier
    })
  });

  const body = (await response.json()) as {
    access_token?: string;
    expires_in?: number;
    error_description?: string;
  };
  if (!response.ok || !body.access_token) {
    throw new Error(body.error_description || "Google token exchange failed.");
  }

  return {
    accessToken: body.access_token,
    expiresAt: Date.now() + (body.expires_in ?? 3600) * 1000
  };
}

async function fetchGmailEmail(accessToken: string): Promise<string> {
  const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/profile", {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  const body = (await response.json()) as { emailAddress?: string };
  if (!response.ok || !body.emailAddress) {
    throw new Error("Could not read the authorized Gmail address.");
  }
  return body.emailAddress;
}

export async function getGmailConnection(): Promise<{ email?: string }> {
  const token = await storageGet<StoredToken>(GMAIL_TOKEN_KEY);
  if (!token || token.expiresAt <= Date.now()) {
    return {};
  }
  return { email: token.email };
}

export async function connectGmail(): Promise<string> {
  if (!GMAIL_CLIENT_ID) {
    throw new Error("Google OAuth is not configured for this extension build.");
  }

  const redirectUri = chrome.identity.getRedirectURL("gmail");
  const state = randomString(24);
  const codeVerifier = randomString(32);
  const codeChallenge = await getCodeChallenge(codeVerifier);
  const params = new URLSearchParams({
    client_id: GMAIL_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: GMAIL_SCOPE,
    access_type: "offline",
    prompt: "consent",
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256"
  });

  const redirectUrl = await launchAuth(`${AUTH_URL}?${params.toString()}`);
  const callback = new URL(redirectUrl);
  if (callback.searchParams.get("state") !== state) {
    throw new Error("Google authorization state did not match.");
  }
  const error = callback.searchParams.get("error");
  if (error) {
    throw new Error(`Google authorization failed: ${error}`);
  }

  const code = callback.searchParams.get("code");
  if (!code) {
    throw new Error("Google did not return an authorization code.");
  }

  const token = await exchangeCode(code, redirectUri, codeVerifier);
  token.email = await fetchGmailEmail(token.accessToken);
  await storageSet(GMAIL_TOKEN_KEY, token);
  return token.email;
}

export async function disconnectGmail(): Promise<void> {
  const token = await storageGet<StoredToken>(GMAIL_TOKEN_KEY);
  if (token?.accessToken) {
    await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token.accessToken)}`, {
      method: "POST"
    }).catch(() => undefined);
  }
  await storageSet(GMAIL_TOKEN_KEY, undefined);
}

export async function getGmailAccessToken(): Promise<string> {
  let token = await storageGet<StoredToken>(GMAIL_TOKEN_KEY);
  if (!token || token.expiresAt <= Date.now() + 60_000) {
    await connectGmail();
    token = await storageGet<StoredToken>(GMAIL_TOKEN_KEY);
  }
  if (!token) {
    throw new Error("Connect Gmail before sending email.");
  }
  return token.accessToken;
}

function encodeMessage(message: string): string {
  const bytes = new TextEncoder().encode(message);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export async function sendGmailMessage(input: {
  to: string;
  subject: string;
  text: string;
  html: string;
}): Promise<void> {
  const accessToken = await getGmailAccessToken();
  const message = [
    `To: ${input.to}`,
    `Subject: ${input.subject}`,
    "MIME-Version: 1.0",
    'Content-Type: text/html; charset="UTF-8"',
    "",
    input.html,
    "",
    input.text
  ].join("\r\n");
  const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ raw: encodeMessage(message) })
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || "Gmail could not send the message.");
  }
}
