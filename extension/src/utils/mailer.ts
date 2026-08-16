import type { Todo } from "./types";
import { getAccessToken } from "./auth";

const SEND_ENDPOINT =
  import.meta.env.VITE_BACKEND_SEND_URL?.trim() || "http://localhost:3000/send";

interface SendPayload {
  subject: string;
  todoText?: string;
  todos?: Todo[];
}

async function sendMail(payload: SendPayload): Promise<void> {
  const accessToken = await getAccessToken();

  const response = await fetch(SEND_ENDPOINT, {
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

export async function sendTodoEmail(todo: Todo): Promise<void> {
  await sendMail({
    subject: "New todo",
    todoText: todo.text
  });
}

export async function sendTodoDigest(todos: Todo[]): Promise<void> {
  await sendMail({
    subject: "Todo digest",
    todos
  });
}
