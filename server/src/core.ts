import nodemailer from "nodemailer";
import { createClient } from "@supabase/supabase-js";

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

export const transporter = nodemailer.createTransport({
  host: smtpHost,
  port: smtpPort,
  secure: smtpSecure,
  auth: {
    user: smtpUser,
    pass: smtpPass
  }
});

export const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

export interface SendRequestBody {
  subject?: string;
  todoText?: string;
  todos?: Array<{
    text: string;
    completed?: boolean;
    createdAt?: number;
  }>;
}

export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function getAuthenticatedEmail(authorizationHeader?: string): Promise<string | undefined> {
  const token = authorizationHeader?.match(/^Bearer (.+)$/i)?.[1];
  if (!token) {
    return undefined;
  }

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user?.email || !data.user.email_confirmed_at) {
    return undefined;
  }

  return data.user.email;
}

export async function sendTodoMail(body: SendRequestBody, to: string): Promise<void> {
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

  await transporter.sendMail({
    from: mailFrom,
    to,
    subject,
    text,
    html
  });
}
