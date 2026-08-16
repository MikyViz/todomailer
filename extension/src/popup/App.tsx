import { useEffect, useMemo, useState } from "react";
import { AuthPanel } from "../options/AuthPanel";
import { getAuthenticatedUser } from "../utils/auth";
import { cleanupExpiredTodos } from "../utils/cleanup";
import { sendTodoDigest, sendTodoEmail } from "../utils/mailer";
import {
  addTodo,
  deleteTodo,
  getSettings,
  patchSettings,
  setTodos,
  toggleTodo
} from "../utils/storage";
import { DEFAULT_SETTINGS, RETENTION_LABELS, type Settings, type Todo } from "../utils/types";

function createTodo(text: string): Todo {
  const id = typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  return {
    id,
    text,
    createdAt: Date.now(),
    completed: false
  };
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString();
}

export function App() {
  const [input, setInput] = useState("");
  const [todos, setLocalTodos] = useState<Todo[]>([]);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [status, setStatus] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [authenticatedEmail, setAuthenticatedEmail] = useState<string>();
  const [userId, setUserId] = useState<string>();

  async function loadTodos(accountId?: string): Promise<void> {
    const active = await cleanupExpiredTodos(accountId);
    setLocalTodos(active);
  }

  useEffect(() => {
    void (async () => {
      await chrome.runtime.sendMessage({ type: "RUN_CLEANUP" }).catch(() => undefined);
      const user = await getAuthenticatedUser();
      setAuthenticatedEmail(user?.email);
      setUserId(user?.id);
      await loadTodos(user?.id);
      const loadedSettings = await getSettings();
      setSettings(loadedSettings);
    })();
  }, []);

  async function handleSessionChange(accountId: string | undefined): Promise<void> {
    const user = await getAuthenticatedUser();
    setAuthenticatedEmail(user?.email);
    setUserId(accountId);
    await loadTodos(accountId);
  }

  const visibleTodos = useMemo(() => todos, [todos]);

  async function handleSubmit(): Promise<void> {
    const text = input.trim();
    if (!text) {
      return;
    }

    const todo = createTodo(text);
    const nextTodos = await addTodo(todo, userId);
    setLocalTodos(nextTodos);
    setInput("");

    if (!authenticatedEmail) {
      setStatus("Todo saved. Sign in in settings before sending.");
      return;
    }

    try {
      await sendTodoEmail(settings, todo);
      setStatus("Todo sent by email.");
    } catch (error) {
      setStatus(`Todo was saved, but sending failed: ${(error as Error).message}`);
    }
  }

  async function handleToggle(todoId: string): Promise<void> {
    const next = await toggleTodo(todoId, userId);
    setLocalTodos(next);
  }

  async function handleDelete(todoId: string): Promise<void> {
    const next = await deleteTodo(todoId, userId);
    setLocalTodos(next);
  }

  async function handleResendTodo(todo: Todo): Promise<void> {
    if (!authenticatedEmail) {
      setStatus("Sign in in settings before sending.");
      return;
    }

    try {
      await sendTodoEmail(settings, todo);
      setStatus("Todo sent again.");
    } catch (error) {
      setStatus(`Resending failed: ${(error as Error).message}`);
    }
  }

  async function handleResendAll(): Promise<void> {
    if (!authenticatedEmail) {
      setStatus("Sign in in settings before sending.");
      return;
    }

    try {
      await sendTodoDigest(settings, visibleTodos);
      setStatus("Todo list sent.");
    } catch (error) {
      setStatus(`Sending the list failed: ${(error as Error).message}`);
    }
  }

  async function updateSetting<K extends keyof Settings>(key: K, value: Settings[K]): Promise<void> {
    const next = await patchSettings({ [key]: value } as Pick<Settings, K>);
    setSettings(next);
    if (key === "retention") {
      const active = await cleanupExpiredTodos(userId);
      await setTodos(active, userId);
      setLocalTodos(active);
    }
  }

  return (
    <main className="popup">
      <header className="header">
        <h1>Todo Mailer</h1>
        <button className="ghost" onClick={() => setShowSettings((prev) => !prev)}>
          {showSettings ? "Back" : "Settings"}
        </button>
      </header>

      {showSettings ? (
        <>
          <AuthPanel onSessionChange={(accountId) => void handleSessionChange(accountId)} />
          <section className="panel">
          <label className="toggleRow">
            <span>Show todo list</span>
            <input
              type="checkbox"
              checked={settings.showTodoList}
              onChange={(event) => void updateSetting("showTodoList", event.target.checked)}
            />
          </label>

          <label className="fieldLabel" htmlFor="retention">
            How long to keep todos
          </label>
          <select
            id="retention"
            value={settings.retention}
            onChange={(event) =>
              void updateSetting("retention", event.target.value as Settings["retention"])
            }
          >
            {Object.entries(RETENTION_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>

          <label className="fieldLabel" htmlFor="backendUrl">
            Backend URL /send
          </label>
          <input
            id="backendUrl"
            type="url"
            value={settings.backendUrl}
            onChange={(event) => void updateSetting("backendUrl", event.target.value.trim())}
          />

          <button
            className="secondary"
            onClick={() => chrome.runtime.openOptionsPage()}
          >
            Open settings page
          </button>
          </section>
        </>
      ) : (
        <>
          <section className="panel">
            <textarea
              rows={4}
              placeholder="Enter a todo..."
              value={input}
              onChange={(event) => setInput(event.target.value)}
            />
            <button className="primary" onClick={() => void handleSubmit()}>
              Send
            </button>
            {status && <p className="status">{status}</p>}
          </section>

          {settings.showTodoList && (
            <section className="panel listPanel">
              <div className="listHeader">
                <h2>Todos</h2>
                <button className="secondary" onClick={() => void handleResendAll()}>
                  Send again (all)
                </button>
              </div>

              {visibleTodos.length === 0 ? (
                <p className="empty">No active todos.</p>
              ) : (
                <ul>
                  {visibleTodos.map((todo) => (
                    <li key={todo.id} className="todoItem">
                      <label>
                        <input
                          type="checkbox"
                          checked={todo.completed}
                          onChange={() => void handleToggle(todo.id)}
                        />
                        <span className={todo.completed ? "completed" : ""}>{todo.text}</span>
                      </label>
                      <small>{formatDate(todo.createdAt)}</small>
                      <div className="actions">
                        <button className="secondary" onClick={() => void handleResendTodo(todo)}>
                          Send again
                        </button>
                        <button className="danger" onClick={() => void handleDelete(todo.id)}>
                          Delete
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </>
      )}
    </main>
  );
}
