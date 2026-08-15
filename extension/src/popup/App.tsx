import { useEffect, useMemo, useState } from "react";
import { cleanupExpiredTodos } from "../utils/cleanup";
import { sendTodoDigest, sendTodoEmail } from "../utils/mailer";
import {
  addTodo,
  deleteTodo,
  getSettings,
  getTodos,
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

  useEffect(() => {
    void (async () => {
      await chrome.runtime.sendMessage({ type: "RUN_CLEANUP" }).catch(() => undefined);
      const active = await cleanupExpiredTodos();
      const loadedSettings = await getSettings();
      setLocalTodos(active);
      setSettings(loadedSettings);
    })();
  }, []);

  const visibleTodos = useMemo(() => todos, [todos]);

  async function handleSubmit(): Promise<void> {
    const text = input.trim();
    if (!text) {
      return;
    }

    const todo = createTodo(text);
    const nextTodos = await addTodo(todo);
    setLocalTodos(nextTodos);
    setInput("");

    if (!settings.userEmail) {
      setStatus("Тудушка сохранена. Укажите email в настройках для отправки.");
      return;
    }

    try {
      await sendTodoEmail(settings, todo);
      setStatus("Тудушка отправлена на email.");
    } catch (error) {
      setStatus(`Тудушка сохранена, но отправка не удалась: ${(error as Error).message}`);
    }
  }

  async function handleToggle(todoId: string): Promise<void> {
    const next = await toggleTodo(todoId);
    setLocalTodos(next);
  }

  async function handleDelete(todoId: string): Promise<void> {
    const next = await deleteTodo(todoId);
    setLocalTodos(next);
  }

  async function handleResendTodo(todo: Todo): Promise<void> {
    if (!settings.userEmail) {
      setStatus("Сначала укажите email в настройках.");
      return;
    }

    try {
      await sendTodoEmail(settings, todo);
      setStatus("Тудушка отправлена повторно.");
    } catch (error) {
      setStatus(`Повторная отправка не удалась: ${(error as Error).message}`);
    }
  }

  async function handleResendAll(): Promise<void> {
    if (!settings.userEmail) {
      setStatus("Сначала укажите email в настройках.");
      return;
    }

    try {
      await sendTodoDigest(settings, visibleTodos);
      setStatus("Список тудушек отправлен.");
    } catch (error) {
      setStatus(`Отправка списка не удалась: ${(error as Error).message}`);
    }
  }

  async function updateSetting<K extends keyof Settings>(key: K, value: Settings[K]): Promise<void> {
    const next = await patchSettings({ [key]: value } as Pick<Settings, K>);
    setSettings(next);
    if (key === "retention") {
      const active = await cleanupExpiredTodos();
      await setTodos(active);
      setLocalTodos(active);
    }
  }

  return (
    <main className="popup">
      <header className="header">
        <h1>Todo Mailer</h1>
        <button className="ghost" onClick={() => setShowSettings((prev) => !prev)}>
          {showSettings ? "Назад" : "Настройки"}
        </button>
      </header>

      {showSettings ? (
        <section className="panel">
          <label className="toggleRow">
            <span>Отображать список тудушек</span>
            <input
              type="checkbox"
              checked={settings.showTodoList}
              onChange={(event) => void updateSetting("showTodoList", event.target.checked)}
            />
          </label>

          <label className="fieldLabel" htmlFor="retention">
            Сколько хранить тудушки
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

          <label className="fieldLabel" htmlFor="email">
            Email пользователя
          </label>
          <input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={settings.userEmail}
            onChange={(event) => void updateSetting("userEmail", event.target.value.trim())}
          />

          <label className="fieldLabel" htmlFor="backendUrl">
            URL backend /send
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
            Открыть страницу настроек
          </button>
        </section>
      ) : (
        <>
          <section className="panel">
            <textarea
              rows={4}
              placeholder="Введите тудушку..."
              value={input}
              onChange={(event) => setInput(event.target.value)}
            />
            <button className="primary" onClick={() => void handleSubmit()}>
              Отправить
            </button>
            {status && <p className="status">{status}</p>}
          </section>

          {settings.showTodoList && (
            <section className="panel listPanel">
              <div className="listHeader">
                <h2>Тудушки</h2>
                <button className="secondary" onClick={() => void handleResendAll()}>
                  Послать ещё раз (все)
                </button>
              </div>

              {visibleTodos.length === 0 ? (
                <p className="empty">Активных тудушек нет.</p>
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
                          Послать ещё раз
                        </button>
                        <button className="danger" onClick={() => void handleDelete(todo.id)}>
                          Удалить
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
