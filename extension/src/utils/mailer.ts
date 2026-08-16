import type { Settings, Todo } from "./types";
import { getAccessToken } from "./auth";

interface SendPayload {
  subject: string;
  todoText?: string;
  todos?: Todo[];
}

async function sendMail(settings: Settings, payload: SendPayload): Promise<void> {
  const accessToken = await getAccessToken();

  const response = await fetch(settings.backendUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`
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
    subject: "New todo",
    todoText: todo.text
  });
}

export async function sendTodoDigest(settings: Settings, todos: Todo[]): Promise<void> {
  await sendMail(settings, {
    subject: "Todo digest",
    todos
  });
}
