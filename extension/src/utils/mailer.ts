import type { Settings, Todo } from "./types";

interface SendPayload {
  to: string;
  subject: string;
  todoText?: string;
  todos?: Todo[];
}

async function sendMail(settings: Settings, payload: SendPayload): Promise<void> {
  if (!settings.userEmail) {
    throw new Error("Email is not configured in settings.");
  }

  const response = await fetch(settings.backendUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(body || "Failed to send email.");
  }
}

export async function sendTodoEmail(settings: Settings, todo: Todo): Promise<void> {
  await sendMail(settings, {
    to: settings.userEmail,
    subject: "New todo",
    todoText: todo.text
  });
}

export async function sendTodoDigest(settings: Settings, todos: Todo[]): Promise<void> {
  await sendMail(settings, {
    to: settings.userEmail,
    subject: "Todo digest",
    todos
  });
}
