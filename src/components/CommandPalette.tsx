import { CheckCircle2, Circle, Download, Plus, Settings, Upload } from "lucide-react";
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandShortcut,
} from "@/components/ui/command";
import { VIEW_ICONS } from "@/components/AppSidebar";
import { runExport, runImport, THEME_ICONS } from "@/components/SettingsDialog";
import { sortTasks, VIEW_LABELS, type View } from "@/lib/tasks";
import { THEME_LABELS, type ThemePref } from "@/lib/theme";
import { useTasks } from "@/store/tasks";

export function CommandPalette() {
  const { paletteOpen, tasks, theme, setTheme, set } = useTasks();
  // Fecha a paleta antes de executar, para o próximo diálogo receber o foco.
  const run = (fn: () => void) => () => {
    set({ paletteOpen: false });
    fn();
  };

  return (
    <CommandDialog
      open={paletteOpen}
      onOpenChange={(o) => set({ paletteOpen: o })}
      title="Buscar e comandos"
      description="Busque tarefas ou execute uma ação"
      className="rounded-2xl shadow-2xl shadow-black/15 sm:max-w-xl"
      showCloseButton={false}
    >
      <CommandInput placeholder="Buscar tarefas ou ações…" />
      <CommandList className="max-h-96">
        <CommandEmpty>Nada encontrado.</CommandEmpty>
        <CommandGroup heading="Ações">
          <CommandItem onSelect={run(() => set({ editing: null }))}>
            <Plus /> Nova tarefa <CommandShortcut>Ctrl N</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={run(runExport)}>
            <Download /> Exportar tarefas (JSON)
          </CommandItem>
          <CommandItem onSelect={run(runImport)}>
            <Upload /> Importar tarefas (JSON)
          </CommandItem>
          <CommandItem onSelect={run(() => set({ settingsOpen: true }))}>
            <Settings /> Configurações <CommandShortcut>Ctrl ,</CommandShortcut>
          </CommandItem>
        </CommandGroup>
        <CommandGroup heading="Ir para">
          {(Object.keys(VIEW_LABELS) as View[]).map((v, i) => {
            const Icon = VIEW_ICONS[v];
            return (
              <CommandItem key={v} onSelect={run(() => set({ view: v, query: "" }))}>
                <Icon /> {VIEW_LABELS[v]} <CommandShortcut>Ctrl {i + 1}</CommandShortcut>
              </CommandItem>
            );
          })}
        </CommandGroup>
        <CommandGroup heading="Aparência">
          {(Object.keys(THEME_LABELS) as ThemePref[]).map((t) => (
            <CommandItem key={t} value={`tema ${THEME_LABELS[t]}`} onSelect={run(() => setTheme(t))}>
              {THEME_ICONS[t]} Tema: {THEME_LABELS[t]}
              {theme === t && <CommandShortcut>Atual</CommandShortcut>}
            </CommandItem>
          ))}
        </CommandGroup>
        {tasks.length > 0 && (
          <CommandGroup heading="Tarefas">
            {sortTasks(tasks, "pending").map((t) => (
              // O value inclui observação e etiqueta para a busca encontrar por qualquer um deles.
              <CommandItem
                key={t.id}
                value={`${t.id} ${t.title} ${t.note} ${t.tag ?? ""}`}
                onSelect={run(() => set({ editing: t }))}
              >
                {t.completed_at ? <CheckCircle2 className="text-muted-foreground" /> : <Circle />}
                <span className={t.completed_at ? "truncate text-muted-foreground line-through" : "truncate"}>
                  {t.title}
                </span>
                {t.tag && <CommandShortcut>{t.tag}</CommandShortcut>}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}
