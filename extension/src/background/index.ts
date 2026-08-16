import { cleanupExpiredTodos } from "../utils/cleanup";
import { getAuthenticatedUser } from "../utils/auth";

const CLEANUP_ALARM = "todo-cleanup";

async function runCleanup(): Promise<void> {
  try {
    const user = await getAuthenticatedUser();
    await cleanupExpiredTodos(user?.id);
  } catch (error) {
    console.error("Cleanup failed", error);
  }
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create(CLEANUP_ALARM, {
    periodInMinutes: 15
  });
  void runCleanup();
});

chrome.runtime.onStartup.addListener(() => {
  chrome.alarms.create(CLEANUP_ALARM, {
    periodInMinutes: 15
  });
  void runCleanup();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === CLEANUP_ALARM) {
    void runCleanup();
  }
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "RUN_CLEANUP") {
    return;
  }

  void runCleanup().then(() => {
    sendResponse({ ok: true });
  });

  return true;
});
