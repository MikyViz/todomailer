import type { Todo } from "./types";
import { getGmailConnection, sendGmailMessage } from "./gmail";

interface SendPayload {
  subject: string;
  todoText?: string;
  todos?: Todo[];
}

async function sendMail(payload: SendPayload): Promise<void> {
  const connection = await getGmailConnection();
  if (!connection.email) {
    throw new Error("Connect Gmail in settings before sending email.");
  }

  const text = payload.todoText?.trim() || "No todo text provided.";
  await sendGmailMessage({
    to: connection.email,
    subject: payload.subject,
    text,
    html: `<p>${escapeHtml(text)}</p>`
  });
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function sendTodoEmail(todo: Todo): Promise<void> {
  await sendMail({
    subject: "New todo",
    todoText: todo.text
  });
}

export async function sendTodoDigest(todos: Todo[]): Promise<void> {
  const connection = await getGmailConnection();
  if (!connection.email) {
    throw new Error("Connect Gmail in settings before sending email.");
  }

  const text = [
    "Todo digest:",
    ...todos.map((todo, index) => `${index + 1}. ${todo.completed ? "[x]" : "[ ]"} ${todo.text}`)
  ].join("\n");
  const html = `<h3>Todo digest</h3><ul>${todos
    .map((todo) => `<li>${todo.completed ? "<s>" : ""}${escapeHtml(todo.text)}${todo.completed ? "</s>" : ""}</li>`)
    .join("")}</ul>`;

  await sendGmailMessage({
    to: connection.email,
    subject: "Todo digest",
    text,
    html
  });
}
