import { isSameDay } from "date-fns";

export const TAGS = ["ATPV", "Recibo", "Outros"] as const;
export type Tag = (typeof TAGS)[number];

/** Uma tarefa como está salva no SQLite (datas em milissegundos desde 1970). */
export interface Task {
  id: number;
  title: string;
  note: string;
  tag: Tag | null;
  created_at: number;
  remind_at: number | null;
  completed_at: number | null;
}

export type View = "today" | "pending" | "overdue" | "done";

export const VIEW_LABELS: Record<View, string> = {
  today: "Hoje",
  pending: "Pendentes",
  overdue: "Atrasadas",
  done: "Concluídas",
};

export const isOverdue = (t: Task, now: number) =>
  !t.completed_at && t.remind_at !== null && t.remind_at <= now;

export function inView(t: Task, view: View, now: number): boolean {
  switch (view) {
    case "today":
      return (
        !t.completed_at &&
        (isSameDay(t.created_at, now) ||
          (t.remind_at !== null && (t.remind_at <= now || isSameDay(t.remind_at, now))))
      );
    case "pending":
      return !t.completed_at;
    case "overdue":
      return isOverdue(t, now);
    case "done":
      return !!t.completed_at;
  }
}

const normalize = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

export const matches = (t: Task, query: string) =>
  !query.trim() || normalize(`${t.title} ${t.note} ${t.tag ?? ""}`).includes(normalize(query.trim()));

export function sortTasks(tasks: Task[], view: View): Task[] {
  if (view === "done") return [...tasks].sort((a, b) => b.completed_at! - a.completed_at!);
  const due = (t: Task) => t.remind_at ?? Infinity;
  return [...tasks].sort((a, b) => due(a) - due(b) || b.created_at - a.created_at);
}


export const toBackupJson = (tasks: Task[]) =>
  JSON.stringify({ app: "memo", version: 1, exported_at: Date.now(), tasks }, null, 2);

const numOrNull = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);

export function parseBackup(text: string): Omit<Task, "id">[] {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("O arquivo não é um JSON válido.");
  }
  const tasks = (data as { tasks?: unknown })?.tasks;
  if ((data as { app?: unknown })?.app !== "memo" || !Array.isArray(tasks)) {
    throw new Error("Este arquivo não é um backup do Memo.");
  }
  return tasks.flatMap((raw) => {
    const t = raw as Record<string, unknown>;
    const title = typeof t.title === "string" ? t.title.trim() : "";
    const created = numOrNull(t.created_at);
    if (!title || created === null) return [];
    return [
      {
        title,
        note: typeof t.note === "string" ? t.note : "",
        tag: TAGS.includes(t.tag as Tag) ? (t.tag as Tag) : null,
        created_at: created,
        remind_at: numOrNull(t.remind_at),
        completed_at: numOrNull(t.completed_at),
      },
    ];
  });
}
