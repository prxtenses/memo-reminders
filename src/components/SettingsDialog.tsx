import { useEffect, useState } from "react";
import { getVersion } from "@tauri-apps/api/app";
import { appLocalDataDir, join } from "@tauri-apps/api/path";
import { disable, enable, isEnabled } from "@tauri-apps/plugin-autostart";
import { motion } from "framer-motion";
import { Download, Monitor, Moon, Sun, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Kbd } from "@/components/Kbd";
import { exportToFile, importFromFile } from "@/lib/backup";
import { glide } from "@/lib/motion";
import {
  DENSITY_LABELS, SIZE_LABELS, THEME_LABELS, loadDensity, loadSize, saveDisplay, type ThemePref,
} from "@/lib/theme";
import { cn } from "@/lib/utils";
import { useTasks } from "@/store/tasks";

export const THEME_ICONS: Record<ThemePref, React.ReactNode> = {
  system: <Monitor className="size-3.5" aria-hidden />,
  light: <Sun className="size-3.5" aria-hidden />,
  dark: <Moon className="size-3.5" aria-hidden />,
};

const message = (e: unknown) => (e instanceof Error ? e.message : String(e));

export async function runExport() {
  try {
    if (await exportToFile(useTasks.getState().tasks)) toast.success("Tarefas exportadas.");
  } catch (e) {
    toast.error("Não foi possível exportar.", { description: message(e) });
  }
}

export async function runImport() {
  try {
    const incoming = await importFromFile();
    if (!incoming) return;
    const added = await useTasks.getState().importMany(incoming);
    toast.success(added ? `${added} tarefa(s) importada(s).` : "Nenhuma tarefa nova no arquivo.");
  } catch (e) {
    toast.error("Não foi possível importar.", { description: message(e) });
  }
}

function Segmented<T extends string>({
  label, labels, icons, value, onChange,
}: {
  label: string;
  labels: Record<T, string>;
  icons?: Record<T, React.ReactNode>;
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-sm font-medium">{label}</span>
      <div role="radiogroup" aria-label={label} className="flex rounded-full bg-foreground/6 p-1">
        {(Object.keys(labels) as T[]).map((t) => (
          <button
            key={t}
            type="button"
            role="radio"
            aria-checked={value === t}
            onClick={() => onChange(t)}
            className={cn(
              "relative isolate flex h-7 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium whitespace-nowrap transition-colors",
              value === t ? "text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {value === t && (
              <motion.span
                layoutId={`pill-${label}`}
                transition={glide}
                className="absolute inset-0 -z-10 rounded-full bg-background shadow-sm shadow-black/10"
              />
            )}
            {icons?.[t]}
            {labels[t]}
          </button>
        ))}
      </div>
    </div>
  );
}

const SHORTCUTS: [string, string][] = [
  ["Ctrl Alt N", "Captura rápida de qualquer lugar do Windows"],
  ["Ctrl Alt B", "Bloco de rascunho (abre e fecha)"],
  ["Ctrl N", "Nova tarefa"],
  ["Ctrl K", "Buscar e comandos"],
  ["Ctrl F", "Buscar na lista"],
  ["Ctrl 1–4", "Hoje, Pendentes, Atrasadas, Concluídas"],
  ["Ctrl Shift L", "Alternar claro/escuro"],
  ["Ctrl Enter", "Salvar tarefa"],
  ["Delete", "Excluir a tarefa selecionada"],
];

export function SettingsDialog() {
  const { settingsOpen, theme, setTheme, set } = useTasks();
  const [autostart, setAutostart] = useState<boolean | null>(null);
  const [backupDir, setBackupDir] = useState("");
  const [size, setSize] = useState(loadSize);
  const [density, setDensity] = useState(loadDensity);
  const [version, setVersion] = useState("");

  useEffect(() => {
    if (!settingsOpen) return;
    isEnabled().then(setAutostart).catch(() => setAutostart(false));
    appLocalDataDir().then((d) => join(d, "backups")).then(setBackupDir);
    getVersion().then(setVersion);
  }, [settingsOpen]);

  const toggleAutostart = async (on: boolean) => {
    try {
      await (on ? enable() : disable());
      setAutostart(on);
    } catch (e) {
      toast.error("Não foi possível alterar a inicialização.", { description: message(e) });
    }
  };

  return (
    <Dialog open={settingsOpen} onOpenChange={(o) => set({ settingsOpen: o })}>
      <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto rounded-3xl p-6 shadow-2xl shadow-black/15 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">Configurações</DialogTitle>
          <DialogDescription>O Memo funciona 100% offline. Seus dados ficam só neste computador.</DialogDescription>
        </DialogHeader>

        <section className="flex flex-col gap-3 rounded-2xl bg-muted/60 p-4">
          <Segmented label="Aparência" labels={THEME_LABELS} icons={THEME_ICONS} value={theme} onChange={setTheme} />
          <Segmented
            label="Tamanho do texto"
            labels={SIZE_LABELS}
            value={size}
            onChange={(v) => {
              setSize(v);
              saveDisplay("memo-size", v);
            }}
          />
          <Segmented
            label="Lista"
            labels={DENSITY_LABELS}
            value={density}
            onChange={(v) => {
              setDensity(v);
              saveDisplay("memo-density", v);
            }}
          />
        </section>

        <section className="flex items-center justify-between gap-4 rounded-2xl bg-muted/60 p-4">
          <label htmlFor="autostart" className="text-sm">
            <span className="block font-medium">Iniciar com o Windows</span>
            <span className="text-muted-foreground">Abre minimizado na bandeja para não perder lembretes.</span>
          </label>
          <Switch
            id="autostart"
            checked={!!autostart}
            disabled={autostart === null}
            onCheckedChange={(on) => void toggleAutostart(on)}
          />
        </section>

        <section className="flex flex-col gap-3 rounded-2xl bg-muted/60 p-4 text-sm">
          <div>
            <span className="block font-medium">Backup</span>
            <span className="text-muted-foreground">
              Uma cópia automática é salva todo dia (últimos 7 dias) em:
            </span>
            <code className="mt-1 block break-all rounded-lg bg-background px-2 py-1 text-xs select-text">
              {backupDir}
            </code>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1 rounded-full" onClick={() => void runExport()}>
              <Download /> Exportar JSON
            </Button>
            <Button variant="outline" className="flex-1 rounded-full" onClick={() => void runImport()}>
              <Upload /> Importar JSON
            </Button>
          </div>
        </section>

        <section className="text-sm">
          <span className="mb-2 block font-medium">Atalhos de teclado</span>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
            {SHORTCUTS.map(([keys, label]) => (
              <div key={keys} className="contents">
                <dt>
                  <Kbd>{keys}</Kbd>
                </dt>
                <dd className="text-muted-foreground">{label}</dd>
              </div>
            ))}
          </dl>
        </section>

        <p className="text-center text-xs text-muted-foreground">Memo v{version}</p>
      </DialogContent>
    </Dialog>
  );
}
