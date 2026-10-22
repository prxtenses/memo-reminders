import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { Kbd } from "@/components/Kbd";
import { ReminderPicker } from "@/components/ReminderPicker";
import { removeWithUndo, saveFailed } from "@/components/TaskList";
import { friendlyDate } from "@/lib/dates";
import { spring } from "@/lib/motion";
import { parseQuick } from "@/lib/parse";
import { TAGS, type Tag } from "@/lib/tasks";
import { cn } from "@/lib/utils";
import { useTasks } from "@/store/tasks";

export function TaskDialog() {
  const { editing, add, update, set } = useTasks();
  const open = editing !== undefined;
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [tag, setTag] = useState<Tag | null>(null);
  const [remindAt, setRemindAt] = useState<number | null>(null);

  useEffect(() => {
    if (!open) return;
    setTitle(editing?.title ?? "");
    setNote(editing?.note ?? "");
    setTag(editing?.tag ?? null);
    setRemindAt(editing?.remind_at ?? null);
  }, [open, editing]);

  const close = () => set({ editing: undefined });

  // Data escrita no título ("amanhã 10h"), só ao criar e se o lembrete não foi escolhido à mão.
  const detected = !editing && remindAt === null ? parseQuick(title) : null;

  const submit = async () => {
    const clean = detected?.remindAt
      ? { title: detected.title, note: note.trim(), tag, remind_at: detected.remindAt }
      : { title: title.trim(), note: note.trim(), tag, remind_at: remindAt };
    if (!clean.title) return;
    try {
      if (editing) await update({ ...editing, ...clean });
      else await add(clean);
      close();
    } catch (e) {
      saveFailed(e); // o diálogo fica aberto para não perder o que foi digitado
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && close()}>
      <DialogContent
        className="gap-0 rounded-3xl p-0 shadow-2xl shadow-black/15 sm:max-w-lg"
        showCloseButton={false}
        onKeyDown={(e) => {
          if (e.key === "Enter" && e.ctrlKey) {
            e.preventDefault();
            void submit();
          }
        }}
      >
        <form
          className="flex flex-col"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <div className="px-6 pt-6">
            <DialogTitle className="text-xs font-medium text-muted-foreground">
              {editing ? "Editar tarefa" : "Nova tarefa"}
            </DialogTitle>
            <DialogDescription className="sr-only">
              Digite o título, uma observação opcional, uma etiqueta e um lembrete.
            </DialogDescription>
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="O que você precisa fazer? (ex.: …amanhã 10h)"
              aria-label="Título"
              maxLength={300}
              className="mt-2 w-full bg-transparent text-xl font-semibold outline-none placeholder:text-muted-foreground/70"
            />
            <AnimatePresence initial={false}>
              {detected?.remindAt && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={spring}
                  className="flex items-center gap-1.5 overflow-hidden text-xs font-medium text-brand"
                  aria-live="polite"
                >
                  <Bell className="size-3" aria-hidden />
                  Lembrete {friendlyDate(detected.remindAt)}
                  <span className="font-normal text-muted-foreground">· salva como “{detected.title}”</span>
                </motion.p>
              )}
            </AnimatePresence>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Observação (opcional)"
              aria-label="Observação"
              rows={3}
              className="mt-2 w-full resize-none bg-transparent text-sm leading-relaxed outline-none placeholder:text-muted-foreground/70"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 px-6 pt-2 pb-5">
            <div role="group" aria-label="Etiqueta" className="flex gap-1.5">
              {TAGS.map((t) => (
                <button
                  key={t}
                  type="button"
                  aria-pressed={tag === t}
                  onClick={() => setTag(tag === t ? null : t)}
                  className={cn(
                    "h-8 rounded-full px-3 text-[13px] font-medium transition-colors",
                    tag === t
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-secondary-foreground hover:bg-accent",
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
            <ReminderPicker value={remindAt} onChange={setRemindAt} />
          </div>

          <DialogFooter className="items-center rounded-b-3xl border-t bg-muted/50 px-6 py-3 sm:justify-between">
            <div className="text-xs text-muted-foreground">
              {editing ? (
                <span className="flex items-center gap-3">
                  Anotado {friendlyDate(editing.created_at)}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 rounded-full text-destructive hover:text-destructive"
                    onClick={() => {
                      close();
                      void removeWithUndo(editing);
                    }}
                  >
                    <Trash2 /> Excluir
                  </Button>
                </span>
              ) : (
                <span>
                  <Kbd>Enter</Kbd> salva · <Kbd>Esc</Kbd> cancela
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="ghost" className="rounded-full" onClick={close}>
                Cancelar
              </Button>
              <Button type="submit" className="rounded-full px-5" disabled={!title.trim()}>
                {editing ? "Salvar" : "Adicionar"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
