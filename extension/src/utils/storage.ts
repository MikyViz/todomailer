import { DEFAULT_SETTINGS, type Settings, type Todo } from "./types";

const TODOS_KEY = "todos";
const SETTINGS_KEY = "settings";

function getTodosKey(userId?: string): string {
  return `${TODOS_KEY}:${userId ?? "anonymous"}`;
}

function storageGet<T>(key: string): Promise<T | undefined> {
  return new Promise((resolve) => {
    chrome.storage.local.get([key], (result) => {
      resolve(result[key] as T | undefined);
    });
  });
}

function storageSet(key: string, value: unknown): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [key]: value }, () => resolve());
  });
}

export async function getTodos(userId?: string): Promise<Todo[]> {
  return (await storageGet<Todo[]>(getTodosKey(userId))) ?? [];
}

export async function setTodos(todos: Todo[], userId?: string): Promise<void> {
  await storageSet(getTodosKey(userId), todos);
}

export async function addTodo(todo: Todo, userId?: string): Promise<Todo[]> {
  const todos = await getTodos(userId);
  const next = [todo, ...todos];
  await setTodos(next, userId);
  return next;
}

export async function deleteTodo(todoId: string, userId?: string): Promise<Todo[]> {
  const todos = await getTodos(userId);
  const next = todos.filter((todo) => todo.id !== todoId);
  await setTodos(next, userId);
  return next;
}

export async function toggleTodo(todoId: string, userId?: string): Promise<Todo[]> {
  const todos = await getTodos(userId);
  const next = todos.map((todo) =>
    todo.id === todoId ? { ...todo, completed: !todo.completed } : todo
  );
  await setTodos(next, userId);
  return next;
}

export async function getSettings(): Promise<Settings> {
  const current = await storageGet<Partial<Settings>>(SETTINGS_KEY);
  return {
    ...DEFAULT_SETTINGS,
    ...current
  };
}

export async function saveSettings(settings: Settings): Promise<void> {
  await storageSet(SETTINGS_KEY, settings);
}

export async function patchSettings(patch: Partial<Settings>): Promise<Settings> {
  const current = await getSettings();
  const next = { ...current, ...patch };
  await saveSettings(next);
  return next;
}

const PENDING_RESET_KEY = "pendingPasswordReset";

// Popups close when the user switches tabs to check their email, so the in-progress
// "enter reset code" step is persisted here to survive that and be restored on reopen.
export async function getPendingReset(): Promise<{ email: string } | undefined> {
  return storageGet<{ email: string }>(PENDING_RESET_KEY);
}

export async function setPendingReset(email: string): Promise<void> {
  await storageSet(PENDING_RESET_KEY, { email });
}

export async function clearPendingReset(): Promise<void> {
  await storageSet(PENDING_RESET_KEY, undefined);
}
