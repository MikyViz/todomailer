import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getAuthenticatedEmail, sendTodoMail, type SendRequestBody } from "../src/core.js";

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");

  if (req.method === "OPTIONS") {
    res.status(204).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const to = await getAuthenticatedEmail(req.headers.authorization);
  if (!to) {
    res.status(401).json({ error: "A verified Supabase session is required." });
    return;
  }

  try {
    await sendTodoMail((req.body ?? {}) as SendRequestBody, to);
    res.status(200).json({ ok: true });
  } catch (error) {
    console.error("Mail send failed", error);
    res.status(500).json({ error: "Mail send failed" });
  }
}
