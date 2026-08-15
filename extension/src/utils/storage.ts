import { DEFAULT_SETTINGS, type Settings, type Todo } from "./types";

const TODOS_KEY = "todos";
const SETTINGS_KEY = "settings";

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

export async function getTodos(): Promise<Todo[]> {
  return (await storageGet<Todo[]>(TODOS_KEY)) ?? [];
}

export async function setTodos(todos: Todo[]): Promise<void> {
  await storageSet(TODOS_KEY, todos);
}

export async function addTodo(todo: Todo): Promise<Todo[]> {
  const todos = await getTodos();
  const next = [todo, ...todos];
  await setTodos(next);
  return next;
}

export async function deleteTodo(todoId: string): Promise<Todo[]> {
  const todos = await getTodos();
  const next = todos.filter((todo) => todo.id !== todoId);
  await setTodos(next);
  return next;
}

export async function toggleTodo(todoId: string): Promise<Todo[]> {
  const todos = await getTodos();
  const next = todos.map((todo) =>
    todo.id === todoId ? { ...todo, completed: !todo.completed } : todo
  );
  await setTodos(next);
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
