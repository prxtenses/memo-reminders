import { forwardRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { VIEW_ICONS } from "@/components/AppSidebar";
import { friendlyDate } from "@/lib/dates";
import { spring } from "@/lib/motion";
import { inView, isOverdue, matches, sortTasks, type Task } from "@/lib/tasks";
import { cn } from "@/lib/utils";
import { useTasks } from "@/store/tasks";

const COMPLETE_DELAY = 450;

export const saveFailed = (e: unknown) => toast.error("Não foi possível salvar.", { description: String(e) });

export async function removeWithUndo(task: Task) {
  const { remove, restore } = useTasks.getState();
  try {
    await remove(task);
  } catch (e) {
    return saveFailed(e);
  }
  toast("Tarefa excluída", {
    description: task.title,
    action: { label: "Desfazer", onClick: () => void restore(task).catch(saveFailed) },
  });
}

export function TaskList() {
  const { tasks, view, query, now, loaded } = useTasks();
  const visible = sortTasks(tasks.filter((t) => inView(t, view, now) && matches(t, query)), view);

  if (loaded && visible.length === 0) return <EmptyState searching={!!query.trim()} />;

  return (
    <ul className="flex flex-col gap-2 pb-8 compact:gap-1" aria-label="Tarefas">
      <AnimatePresence initial={false} mode="popLayout">
        {visible.map((t) => (
          <TaskItem key={t.id} task={t} now={now} />
        ))}
      </AnimatePresence>
    </ul>
  );
}

const TaskItem = forwardRef<HTMLLIElement, { task: Task; now: number }>(function TaskItem({ task, now }, ref) {
  const { toggle, set } = useTasks();
  // Ao concluir, marca só aqui primeiro: a tarefa que sai da lista fica "congelada" na animação de saída,
  // então o check precisa aparecer antes de o estado global mudar.
  const [completing, setCompleting] = useState(false);
  const done = !!task.completed_at || completing;
  const overdue = isOverdue(task, now) && !completing;

  const onCheck = () => {
    if (done) return void toggle(task).catch(saveFailed); // reabrir é imediato
    setCompleting(true);
    setTimeout(
      () =>
        void toggle(task).catch((e) => {
          setCompleting(false); // volta o check, já que nada foi gravado
          saveFailed(e);
        }),
      COMPLETE_DELAY,
    );
  };

  return (
    <motion.li
      ref={ref}
      layout
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 24, transition: { duration: 0.2, ease: [0.4, 0, 1, 1] } }}
      transition={spring}
      className={cn(
        "group relative flex items-start gap-3 rounded-2xl border border-border/70 bg-card px-4 py-3.5 compact:rounded-xl compact:py-2",
        "transition-[background-color,box-shadow] duration-200 hover:bg-muted/60 hover:shadow-sm hover:shadow-black/5",
        overdue && "bg-overdue/[0.04]",
      )}
    >
      <motion.div whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.85 }} transition={spring} className="pt-0.5">
        <Checkbox
          checked={done}
          onCheckedChange={onCheck}
          aria-label={done ? `Reabrir "${task.title}"` : `Concluir "${task.title}"`}
          className={cn(
            "size-5 rounded-full border-[1.5px] border-foreground/30 shadow-none transition-colors duration-200 hover:border-foreground/60",
            overdue && "border-overdue/60",
          )}
        >
          <svg viewBox="0 0 24 24" className="size-3" fill="none" stroke="currentColor" strokeWidth={3.5} aria-hidden>
            <motion.path
              d="M5 12.5l4.5 4.5L19 7.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: completing ? 0 : 1 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
            />
          </svg>
        </Checkbox>
      </motion.div>

      <button
        type="button"
        onClick={() => set({ editing: task })}
        onKeyDown={(e) => e.key === "Delete" && void removeWithUndo(task)}
        className="min-w-0 flex-1 rounded-md text-left focus-visible:outline-offset-4"
        aria-label={`Editar "${task.title}"`}
      >
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "truncate bg-[linear-gradient(currentColor,currentColor)] bg-[length:0%_1px] bg-[position:0_55%] bg-no-repeat text-[15px] font-medium",
              "transition-[background-size,color] duration-300 ease-out",
              done && "bg-[length:100%_1px] text-muted-foreground",
            )}
          >
            {task.title}
          </span>
          {task.tag && (
            <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[11px] font-semibold text-secondary-foreground">
              {task.tag}
            </span>
          )}
        </div>
        {task.note && <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{task.note}</p>}
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span>Anotado {friendlyDate(task.created_at, now)}</span>
          {task.remind_at && !done && (
            <span className={cn("inline-flex items-center gap-1", overdue ? "font-medium text-overdue" : "text-brand")}>
              <motion.span
                key={String(overdue)}
                className="inline-flex origin-top"
                animate={overdue ? { rotate: [0, -16, 13, -9, 5, 0] } : undefined}
                transition={{ duration: 0.6, ease: "easeInOut" }}
              >
                <Bell className="size-3" aria-hidden />
              </motion.span>
              {overdue ? "Atrasada · " : ""}
              {friendlyDate(task.remind_at, now)}
            </span>
          )}
          {done && <span>Concluída {friendlyDate(task.completed_at!, now)}</span>}
        </div>
      </button>

      <div className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
        <IconButton label="Editar" onClick={() => set({ editing: task })}>
          <Pencil className="size-4" />
        </IconButton>
        <IconButton label="Excluir" onClick={() => void removeWithUndo(task)}>
          <Trash2 className="size-4" />
        </IconButton>
      </div>
    </motion.li>
  );
});

function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="grid size-8 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-foreground/8 hover:text-foreground"
    >
      {children}
    </button>
  );
}

const EMPTY: Record<string, [string, string]> = {
  today: ["Nada para hoje", "Anote algo com Ctrl+N — ou de qualquer lugar com Ctrl+Alt+N."],
  pending: ["Tudo em dia", "Nenhuma tarefa pendente. Aproveite."],
  overdue: ["Nenhuma atrasada", "Os lembretes que passarem do horário aparecem aqui."],
  done: ["Nada concluído ainda", "Clique no círculo de uma tarefa para concluí-la."],
};

function EmptyState({ searching }: { searching: boolean }) {
  const view = useTasks((s) => s.view);
  const Icon = VIEW_ICONS[view];
  const [title, text] = searching ? ["Nada encontrado", "Tente outra palavra."] : EMPTY[view];
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={spring}
      className="mt-8 flex flex-col items-center rounded-3xl bg-muted/60 px-6 py-14 text-center"
    >
      <Icon className="mb-4 size-8 text-muted-foreground" strokeWidth={1.5} aria-hidden />
      <p className="text-base font-semibold">{title}</p>
      <p className="mt-1 max-w-xs text-sm text-muted-foreground">{text}</p>
    </motion.div>
  );
}
