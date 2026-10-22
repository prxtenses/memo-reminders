import { format } from "date-fns";
import { open, save } from "@tauri-apps/plugin-dialog";
import {
  BaseDirectory, exists, mkdir, readDir, readTextFile, remove, writeTextFile,
} from "@tauri-apps/plugin-fs";
import { parseBackup, toBackupJson, type Task } from "./tasks";

const JSON_FILTER = [{ name: "Backup do Memo (JSON)", extensions: ["json"] }];
const today = () => format(new Date(), "yyyy-MM-dd");

export async function exportToFile(tasks: Task[]): Promise<boolean> {
  const path = await save({ defaultPath: `memo-${today()}.json`, filters: JSON_FILTER });
  if (!path) return false;
  await writeTextFile(path, toBackupJson(tasks));
  return true;
}

export async function importFromFile(): Promise<Omit<Task, "id">[] | null> {
  const path = await open({ multiple: false, directory: false, filters: JSON_FILTER });
  if (!path) return null;
  return parseBackup(await readTextFile(path));
}

// 1 arquivo por dia, guarda os 7 últimos
const BACKUP_DIR = "backups";
const KEEP = 7;

export async function autoBackup(tasks: Task[]): Promise<void> {
  // não deixar backups vazios empurrarem os bons pra fora
  if (tasks.length === 0) return;
  const opts = { baseDir: BaseDirectory.AppLocalData };
  const file = `${BACKUP_DIR}/memo-${today()}.json`;
  await mkdir(BACKUP_DIR, { ...opts, recursive: true });
  if (await exists(file, opts)) return;
  await writeTextFile(file, toBackupJson(tasks), opts);
  const names = (await readDir(BACKUP_DIR, opts))
    .map((e) => e.name)
    .filter((n) => /^memo-\d{4}-\d{2}-\d{2}\.json$/.test(n))
    .sort(); // o nome tem a data em ISO, então ordem alfabética = ordem cronológica
  for (const old of names.slice(0, -KEEP)) await remove(`${BACKUP_DIR}/${old}`, opts);
}
