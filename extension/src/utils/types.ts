export interface Todo {
  id: string;
  text: string;
  createdAt: number;
  completed: boolean;
}

export type RetentionOption = "none" | "day" | "threeDays" | "week" | "month" | "forever";

export interface Settings {
  showTodoList: boolean;
  retention: RetentionOption;
}

export const DEFAULT_SETTINGS: Settings = {
  showTodoList: false,
  retention: "week"
};

export const RETENTION_LABELS: Record<RetentionOption, string> = {
  none: "Delete immediately",
  day: "Day",
  threeDays: "3 days",
  week: "Week",
  month: "Month",
  forever: "Until deleted"
};
