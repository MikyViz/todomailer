import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import nodemailer from "nodemailer";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const port = Number(process.env.PORT ?? 3000);
const smtpHost = process.env.SMTP_HOST;
const smtpPort = Number(process.env.SMTP_PORT ?? 587);
const smtpSecure = String(process.env.SMTP_SECURE ?? "false") === "true";
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;
const mailFrom = process.env.MAIL_FROM ?? smtpUser;
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!smtpHost || !smtpUser || !smtpPass || !mailFrom || !supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error("Server config is missing. Fill .env based on .env.example");
}

const transporter = nodemailer.createTransport({
  host: smtpHost,
  port: smtpPort,
  secure: smtpSecure,
  auth: {
    user: smtpUser,
    pass: smtpPass
  }
});

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

interface SendRequestBody {
  subject?: string;
  todoText?: string;
  todos?: Array<{
    text: string;
    completed?: boolean;
    createdAt?: number;
  }>;
}

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/send", async (req, res) => {
  const body = req.body as SendRequestBody;
  const to = await getAuthenticatedEmail(req);

  if (!to) {
    res.status(401).json({ error: "A verified Supabase session is required." });
    return;
  }

  const subject = body.subject?.trim() || "Todo update";
  const hasDigest = Array.isArray(body.todos) && body.todos.length > 0;

  const text = hasDigest
    ? [
        "Todo digest:",
        ...body.todos!.map((todo, index) => {
          const marker = todo.completed ? "[x]" : "[ ]";
          return `${index + 1}. ${marker} ${todo.text}`;
        })
      ].join("\n")
    : body.todoText?.trim() || "No todo text provided.";

  const html = hasDigest
    ? `<h3>Todo digest</h3><ul>${body.todos!
        .map((todo) => `<li>${todo.completed ? "<s>" : ""}${escapeHtml(todo.text)}${todo.completed ? "</s>" : ""}</li>`)
        .join("")}</ul>`
    : `<p>${escapeHtml(text)}</p>`;

  try {
    await transporter.sendMail({
      from: mailFrom,
      to,
      subject,
      text,
      html
    });

    res.json({ ok: true });
  } catch (error) {
    console.error("Mail send failed", error);
    res.status(500).json({ error: "Mail send failed" });
  }
});

app.listen(port, () => {
  console.log(`Todo Mailer API is running on http://localhost:${port}`);
});

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function getAuthenticatedEmail(req: express.Request): Promise<string | undefined> {
  const token = req.headers.authorization?.match(/^Bearer (.+)$/i)?.[1];
  if (!token) {
    return undefined;
  }

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user?.email || !data.user.email_confirmed_at) {
    return undefined;
  }

  return data.user.email;
}
