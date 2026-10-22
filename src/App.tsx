import { useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { AnimatePresence, motion } from "framer-motion";
import { Search } from "lucide-react";
import { toast } from "sonner";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { CommandPalette } from "@/components/CommandPalette";
import { Kbd } from "@/components/Kbd";
import { SettingsDialog } from "@/components/SettingsDialog";
import { TaskDialog } from "@/components/TaskDialog";
import { TaskList } from "@/components/TaskList";
import { TitleBar } from "@/components/TitleBar";
import { autoBackup } from "@/lib/backup";
import { spring } from "@/lib/motion";
import { inView, isOverdue, VIEW_LABELS, type View } from "@/lib/tasks";
import { useTasks } from "@/store/tasks";

const VIEW_KEYS: View[] = ["today", "pending", "overdue", "done"];

// Último minuto em que o app estava rodando; lembretes que venceram depois disso não foram notificados.
const ALIVE_KEY = "memo.alive";
const markAlive = () => {
  try {
    localStorage.setItem(ALIVE_KEY, String(Date.now()));
  } catch {}
};
const lastAlive = () => {
  try {
    return Number(localStorage.getItem(ALIVE_KEY)) || 0;
  } catch {
    return 0;
  }
};

export default function App() {
  const { tasks, view, query, now, set } = useTasks();
  const searchRef = useRef<HTMLInputElement>(null);
  const count = tasks.filter((t) => inView(t, view, now)).length;

  useEffect(() => {
    useTasks
      .getState()
      .load()
      .then(() => {
        // Lembretes que venceram com o app fechado não dispararam: avisa uma vez ao abrir.
        const { tasks, now } = useTasks.getState();
        const since = lastAlive();
        markAlive();
        const missed = tasks.filter((t) => isOverdue(t, now) && t.remind_at! > since).length;
        if (missed > 0) {
          const body = missed === 1 ? "1 lembrete venceu com o Memo fechado." : `${missed} lembretes venceram com o Memo fechado.`;
          void invoke("notify", { title: "Memo", body }).catch(console.error);
        }
        return autoBackup(tasks);
      })
      .catch((e) => toast.error("Erro ao abrir o banco de dados.", { description: String(e) }))
      // Só agora a janela aparece (já desenhada), evitando a tela branca ao abrir.
      .finally(() => requestAnimationFrame(() => void invoke("app_ready")));
  }, []);

  useEffect(() => {
    const offs = [
      listen("new-task", () => set({ editing: null, paletteOpen: false })),
      listen("reminder-fired", () => set({ now: Date.now() })),
      // Tarefa vinda da barra flutuante (Ctrl+Alt+N): só esta janela grava no banco.
      listen<{ title: string; remind_at: number | null }>("quick-add", ({ payload }) =>
        useTasks
          .getState()
          .add({ title: payload.title.trim().slice(0, 300), note: "", tag: null, remind_at: payload.remind_at })
          .then(() => toast.success("Tarefa anotada", { description: payload.title }))
          .catch((e) => toast.error("Não foi possível salvar a tarefa.", { description: String(e) })),
      ),
    ];
    return () => offs.forEach((p) => void p.then((off) => off()));
  }, [set]);

  useEffect(() => {
    const refresh = () => {
      set({ now: Date.now() });
      void autoBackup(useTasks.getState().tasks).catch(console.error); // novo dia com o app aberto
    };
    const unfocus = getCurrentWindow().onFocusChanged(({ payload }) => payload && refresh());
    const timer = setInterval(() => {
      markAlive();
      if (document.visibilityState === "visible") set({ now: Date.now() });
    }, 60_000);
    return () => {
      clearInterval(timer);
      void unfocus.then((off) => off());
    };
  }, [set]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      const n = Number(e.key);
      if (k === "l" && e.shiftKey) {
        const { setTheme } = useTasks.getState();
        setTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark");
      } else if (k === "n") set({ editing: null });
      else if (k === "k") set({ paletteOpen: !useTasks.getState().paletteOpen });
      else if (k === ",") set({ settingsOpen: true });
      else if (k === "f") searchRef.current?.focus();
      else if (n >= 1 && n <= 4) set({ view: VIEW_KEYS[n - 1] });
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [set]);

  return (
    <SidebarProvider style={{ "--sidebar-width": "15rem" } as React.CSSProperties}>
      <AppSidebar />
      <SidebarInset className="h-svh min-w-0 overflow-hidden">
        <TitleBar>
          <label className="relative ml-auto flex w-full max-w-64 items-center">
            <Search className="pointer-events-none absolute left-3 size-3.5 text-muted-foreground" aria-hidden />
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(e) => set({ query: e.target.value })}
              onKeyDown={(e) => e.key === "Escape" && (set({ query: "" }), e.currentTarget.blur())}
              placeholder="Buscar"
              aria-label="Buscar tarefas (Ctrl+F)"
              className="h-8 w-full rounded-full bg-input pr-14 pl-8 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
            />
            <Kbd className="absolute right-2">Ctrl F</Kbd>
          </label>
        </TitleBar>

        <div className="flex-1 overflow-y-auto">
          <motion.div
            key={view}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={spring}
            className="mx-auto w-full max-w-3xl px-8 pt-4"
          >
            <header className="mb-6">
              <h1 className="text-[28px] leading-tight font-bold tracking-tight">{VIEW_LABELS[view]}</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.span
                    key={count}
                    className="inline-block"
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                    transition={spring}
                  >
                    {count === 0 ? "Nenhuma tarefa" : count === 1 ? "1 tarefa" : `${count} tarefas`}
                  </motion.span>
                </AnimatePresence>
              </p>
            </header>
            <TaskList />
          </motion.div>
        </div>
      </SidebarInset>

      <TaskDialog />
      <CommandPalette />
      <SettingsDialog />
    </SidebarProvider>
  );
}
