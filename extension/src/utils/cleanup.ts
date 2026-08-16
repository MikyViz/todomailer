import { getSettings, getTodos, setTodos } from "./storage";
import type { RetentionOption, Todo } from "./types";

const retentionMsMap: Record<Exclude<RetentionOption, "forever" | "none">, number> = {
  day: 24 * 60 * 60 * 1000,
  threeDays: 3 * 24 * 60 * 60 * 1000,
  week: 7 * 24 * 60 * 60 * 1000,
  month: 30 * 24 * 60 * 60 * 1000
};

function isExpired(todo: Todo, retention: RetentionOption, now: number): boolean {
  if (retention === "none") {
    return true;
  }

  if (retention === "forever") {
    return false;
  }

  const ttlMs = retentionMsMap[retention];
  return now - todo.createdAt > ttlMs;
}

export async function cleanupExpiredTodos(userId?: string): Promise<Todo[]> {
  const [settings, todos] = await Promise.all([getSettings(), getTodos(userId)]);
  const now = Date.now();
  const active = todos.filter((todo) => !isExpired(todo, settings.retention, now));

  if (active.length !== todos.length) {
    await setTodos(active, userId);
  }

  return active;
}
