import { useEffect, useState } from "react";
import { AuthPanel } from "./AuthPanel";
import { getAuthenticatedUser } from "../utils/auth";
import { cleanupExpiredTodos } from "../utils/cleanup";
import { getSettings, patchSettings } from "../utils/storage";
import { DEFAULT_SETTINGS, RETENTION_LABELS, type Settings } from "../utils/types";

export function OptionsApp() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [status, setStatus] = useState("");

  useEffect(() => {
    void (async () => {
      const user = await getAuthenticatedUser();
      await cleanupExpiredTodos(user?.id);
      const current = await getSettings();
      setSettings(current);
    })();
  }, []);

  async function updateSetting<K extends keyof Settings>(key: K, value: Settings[K]): Promise<void> {
    const next = await patchSettings({ [key]: value } as Pick<Settings, K>);
    setSettings(next);
    setStatus("Saved");
    window.setTimeout(() => setStatus(""), 1200);
  }

  return (
    <main className="popup" style={{ maxWidth: 620, margin: "20px auto" }}>
      <header className="header">
        <h1>Todo Mailer Settings</h1>
      </header>

      <AuthPanel />

      <section className="panel">
        <label className="toggleRow">
          <span>Show todo list in popup</span>
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

        {status && <p className="status">{status}</p>}
      </section>

      <footer style={{ textAlign: "center", marginTop: 20 }}>
        <a href="privacy-policy.html" target="_blank" rel="noreferrer">
          Privacy Policy
        </a>
      </footer>
    </main>
  );
}
