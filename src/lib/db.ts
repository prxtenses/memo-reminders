import Database from "@tauri-apps/plugin-sql";
import type { Task } from "./tasks";

let db: Promise<Database> | null = null;
const conn = () => (db ??= Database.load("sqlite:memo.db"));

type NewTask = Omit<Task, "id"> & { id?: number };

export async function listTasks(): Promise<Task[]> {
  return (await conn()).select<Task[]>("SELECT * FROM tasks");
}

/** Insere e devolve o id. Passar `id` serve para "Desfazer" uma exclusão mantendo o mesmo id. */
export async function insertTask(t: NewTask): Promise<number> {
  const r = await (await conn()).execute(
    "INSERT INTO tasks (id, title, note, tag, created_at, remind_at, completed_at) VALUES ($1, $2, $3, $4, $5, $6, $7)",
    [t.id ?? null, t.title, t.note, t.tag, t.created_at, t.remind_at, t.completed_at],
  );
  return r.lastInsertId as number;
}

export async function updateTask(t: Task): Promise<void> {
  await (await conn()).execute(
    "UPDATE tasks SET title = $1, note = $2, tag = $3, remind_at = $4, completed_at = $5 WHERE id = $6",
    [t.title, t.note, t.tag, t.remind_at, t.completed_at, t.id],
  );
}

export async function deleteTask(id: number): Promise<void> {
  await (await conn()).execute("DELETE FROM tasks WHERE id = $1", [id]);
}
