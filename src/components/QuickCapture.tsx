import { useEffect, useRef, useState } from "react";
import { emitTo } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, CornerDownLeft } from "lucide-react";
import { Kbd } from "@/components/Kbd";
import { friendlyDate } from "@/lib/dates";
import { spring } from "@/lib/motion";
import { parseQuick } from "@/lib/parse";

const win = getCurrentWindow();

export function QuickCapture() {
  const [text, setText] = useState("");
  const [shown, setShown] = useState(0); // muda a cada abertura para reiniciar a animação de entrada
  const inputRef = useRef<HTMLInputElement>(null);
  const parsed = parseQuick(text);

  useEffect(() => {
    // Esconde ao perder o foco (clicar fora), mas só depois de ter recebido foco nesta abertura.
    let focused = false;
    const off = win.onFocusChanged(({ payload }) => {
      if (payload) {
        if (!focused) setShown((n) => n + 1);
        focused = true;
        inputRef.current?.focus();
      } else if (focused) {
        focused = false;
        setText("");
        void win.hide();
      }
    });
    return () => void off.then((f) => f());
  }, []);

  const close = () => {
    setText("");
    void win.hide();
  };

  const submit = async () => {
    if (!text.trim()) return;
    await emitTo("main", "quick-add", { title: parsed.title, remind_at: parsed.remindAt });
    close();
  };

  return (
    // A janela é transparente; o cartão com sombra é desenhado aqui dentro.
    <div className="flex h-full items-start justify-center p-4">
      <motion.form
        key={shown}
        initial={{ opacity: 0, scale: 0.96, y: -6 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={spring}
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
        className="w-full overflow-hidden rounded-2xl border border-border/70 bg-popover shadow-xl shadow-black/20"
      >
        <div className="flex items-center gap-3 px-4">
          <span className="grid size-6 shrink-0 place-items-center rounded-[30%] bg-primary text-xs font-bold text-primary-foreground">
            M
          </span>
          <input
            ref={inputRef}
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && close()}
            placeholder="Nova tarefa…  ex.: Gerar ATPV do carro X amanhã 10h"
            aria-label="Nova tarefa"
            maxLength={300}
            className="h-14 min-w-0 flex-1 bg-transparent text-lg outline-none placeholder:text-muted-foreground/70"
          />
          <Kbd className="flex items-center gap-1">
            <CornerDownLeft className="size-3" /> Enter
          </Kbd>
        </div>
        <div className="flex h-9 items-center gap-2 border-t bg-muted/50 px-4 text-xs text-muted-foreground">
          <AnimatePresence mode="popLayout" initial={false}>
            {parsed.remindAt ? (
              <motion.span
                key="reminder"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={spring}
                className="inline-flex items-center gap-1.5 font-medium text-brand"
              >
                <Bell className="size-3" aria-hidden />
                Lembrete {friendlyDate(parsed.remindAt)}
                <span className="font-normal text-muted-foreground">· “{parsed.title}”</span>
              </motion.span>
            ) : (
              <motion.span
                key="hint"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={spring}
              >
                Escreva quando lembrar: “amanhã 10h”, “sexta”, “dia 25”, “em 30 min”
              </motion.span>
            )}
          </AnimatePresence>
          <span className="ml-auto">
            <Kbd>Esc</Kbd> fecha
          </span>
        </div>
      </motion.form>
    </div>
  );
}
