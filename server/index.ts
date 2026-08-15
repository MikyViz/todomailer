import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import nodemailer from "nodemailer";

dotenv.config();

const port = Number(process.env.PORT ?? 3000);
const smtpHost = process.env.SMTP_HOST;
const smtpPort = Number(process.env.SMTP_PORT ?? 587);
const smtpSecure = String(process.env.SMTP_SECURE ?? "false") === "true";
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;
const mailFrom = process.env.MAIL_FROM ?? smtpUser;

if (!smtpHost || !smtpUser || !smtpPass || !mailFrom) {
  throw new Error("SMTP config is missing. Fill .env based on .env.example");
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

interface SendRequestBody {
  to?: string;
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
  const to = body.to?.trim();

  if (!to) {
    res.status(400).json({ error: "Field 'to' is required." });
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
