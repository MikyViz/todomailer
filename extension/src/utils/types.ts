export interface Todo {
  id: string;
  text: string;
  createdAt: number;
  completed: boolean;
}

export type RetentionOption = "day" | "threeDays" | "week" | "month" | "forever";

export interface Settings {
  showTodoList: boolean;
  retention: RetentionOption;
  userEmail: string;
  backendUrl: string;
}

export const DEFAULT_SETTINGS: Settings = {
  showTodoList: false,
  retention: "week",
  userEmail: "",
  backendUrl: "http://localhost:3000/send"
};

export const RETENTION_LABELS: Record<RetentionOption, string> = {
  day: "День",
  threeDays: "3 дня",
  week: "Неделю",
  month: "Месяц",
  forever: "Пока не удалю"
};
