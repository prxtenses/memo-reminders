import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import * as db from "@/lib/db";
import type { Tag, Task, View } from "@/lib/tasks";
import { loadThemePref, saveThemePref, type ThemePref } from "@/lib/theme";

export interface TaskInput {
  title: string;
  note: string;
  tag: Tag | null;
  remind_at: number | null;
}

interface State {
  tasks: Task[];
  loaded: boolean;
  view: View;
  query: string;
  now: number;
  /** Diálogo de tarefa: undefined = fechado, null = nova tarefa, Task = editando. */
  editing: Task | null | undefined;
  paletteOpen: boolean;
  settingsOpen: boolean;
  theme: ThemePref;

  setTheme: (theme: ThemePref) => void;
  load: () => Promise<void>;
  add: (input: TaskInput) => Promise<void>;
  update: (task: Task) => Promise<void>;
  toggle: (task: Task) => Promise<void>;
  remove: (task: Task) => Promise<void>;
  restore: (task: Task) => Promise<void>;
  importMany: (tasks: Omit<Task, "id">[]) => Promise<number>;
  set: (patch: Partial<Pick<State, "view" | "query" | "now" | "editing" | "paletteOpen" | "settingsOpen">>) => void;
}

function syncReminders(tasks: Task[]) {
  const now = Date.now();
  const reminders = tasks
    .filter((t) => !t.completed_at && t.remind_at !== null && t.remind_at > now)
    .map((t) => ({ id: t.id, title: t.title, body: t.note.trim() || "Lembrete do Memo", at: t.remind_at }));
  invoke("set_reminders", { reminders }).catch(console.error);
}

export const useTasks = create<State>((set, get) => {
  const commit = (tasks: Task[]) => {
    set({ tasks, now: Date.now() });
    syncReminders(tasks);
  };

  return {
    tasks: [],
    loaded: false,
    view: "pending",
    query: "",
    now: Date.now(),
    editing: undefined,
    paletteOpen: false,
    settingsOpen: false,
    theme: loadThemePref(),

    setTheme: (theme) => {
      saveThemePref(theme);
      set({ theme });
    },

    load: async () => {
      const tasks = await db.listTasks();
      set({ loaded: true });
      commit(tasks);
    },

    add: async (input) => {
      const task: Omit<Task, "id"> = { ...input, created_at: Date.now(), completed_at: null };
      const id = await db.insertTask(task);
      commit([...get().tasks, { ...task, id }]);
    },

    update: async (task) => {
      await db.updateTask(task);
      commit(get().tasks.map((t) => (t.id === task.id ? task : t)));
    },

    toggle: (task) => get().update({ ...task, completed_at: task.completed_at ? null : Date.now() }),

    remove: async (task) => {
      await db.deleteTask(task.id);
      commit(get().tasks.filter((t) => t.id !== task.id));
    },

    restore: async (task) => {
      await db.insertTask(task);
      commit([...get().tasks, task]);
    },

    /** Junta as tarefas importadas, ignorando as que já existem (mesmo título e mesma data de criação). */
    importMany: async (incoming) => {
      const seen = new Set(get().tasks.map((t) => `${t.created_at}|${t.title}`));
      const added: Task[] = [];
      for (const t of incoming) {
        const key = `${t.created_at}|${t.title}`;
        if (seen.has(key)) continue;
        seen.add(key);
        added.push({ ...t, id: await db.insertTask(t) });
      }
      commit([...get().tasks, ...added]);
      return added.length;
    },

    set: (patch) => set(patch),
  };
});
