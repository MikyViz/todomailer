import cors from "cors";
import dotenv from "dotenv";
import express from "express";

dotenv.config();

import { getAuthenticatedEmail, sendTodoMail, type SendRequestBody } from "./src/core.js";

const port = Number(process.env.PORT ?? 3000);

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/send", async (req, res) => {
  const body = req.body as SendRequestBody;
  const to = await getAuthenticatedEmail(req.headers.authorization);

  if (!to) {
    res.status(401).json({ error: "A verified Supabase session is required." });
    return;
  }

  try {
    await sendTodoMail(body, to);
    res.json({ ok: true });
  } catch (error) {
    console.error("Mail send failed", error);
    res.status(500).json({ error: "Mail send failed" });
  }
});

app.listen(port, () => {
  console.log(`Todo Mailer API is running on http://localhost:${port}`);
});
