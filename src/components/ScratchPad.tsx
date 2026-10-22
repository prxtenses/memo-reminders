import { useEffect, useRef, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Copy, Eraser, Undo2, X } from "lucide-react";
import { spring } from "@/lib/motion";
import { cn } from "@/lib/utils";

const win = getCurrentWindow();
const KEY = "memo-scratch";

const load = () => {
  try {
    return localStorage.getItem(KEY) ?? "";
  } catch {
    return "";
  }
};

export function ScratchPad() {
  const [text, setText] = useState(load);
  const [copied, setCopied] = useState(false);
  const [undo, setUndo] = useState<string | null>(null); // texto apagado, para o "Desfazer"
  const ref = useRef<HTMLTextAreaElement>(null);

  const change = (v: string) => {
    setText(v);
    try {
      localStorage.setItem(KEY, v);
    } catch {
      // Sem armazenamento: o texto vale só enquanto a janela existir.
    }
  };

  useEffect(() => {
    ref.current?.focus();
    const off = win.onFocusChanged(({ payload }) => payload && ref.current?.focus());
    return () => void off.then((f) => f());
  }, []);

  useEffect(() => {
    if (copied) {
      const t = setTimeout(() => setCopied(false), 1500);
      return () => clearTimeout(t);
    }
  }, [copied]);

  useEffect(() => {
    if (undo !== null) {
      const t = setTimeout(() => setUndo(null), 6000);
      return () => clearTimeout(t);
    }
  }, [undo]);

  const copy = async () => {
    const el = ref.current;
    const part = el && el.selectionStart !== el.selectionEnd ? text.slice(el.selectionStart, el.selectionEnd) : text;
    await navigator.clipboard.writeText(part);
    setCopied(true);
  };

  const clear = () => {
    if (!text) return;
    setUndo(text);
    change("");
    ref.current?.focus();
  };

  return (
    <div className="flex h-full flex-col">
      <header data-tauri-drag-region className="flex h-10 shrink-0 items-center gap-1 pr-1 pl-3">
        <span data-tauri-drag-region className="flex-1 text-[13px] font-semibold">
          Rascunho
        </span>
        <AnimatePresence initial={false}>
          {undo !== null && (
            <motion.div initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={spring}>
              <IconButton
                label="Desfazer limpeza"
                onClick={() => {
                  change(undo);
                  setUndo(null);
                }}
              >
                <Undo2 className="size-4" />
              </IconButton>
            </motion.div>
          )}
        </AnimatePresence>
        <IconButton label={copied ? "Copiado" : "Copiar (o trecho selecionado ou tudo)"} onClick={() => void copy()} disabled={!text}>
          {copied ? <Check className="size-4 text-brand" /> : <Copy className="size-4" />}
        </IconButton>
        <IconButton label="Limpar" onClick={clear} disabled={!text}>
          <Eraser className="size-4" />
        </IconButton>
        <IconButton label="Fechar (Esc) — o texto fica salvo" onClick={() => void win.hide()}>
          <X className="size-4" />
        </IconButton>
      </header>
      <textarea
        ref={ref}
        value={text}
        onChange={(e) => change(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") void win.hide();
        }}
        spellCheck={false}
        aria-label="Rascunho"
        placeholder="Cole ou anote algo temporário aqui…"
        className="min-h-0 flex-1 resize-none bg-transparent px-3 pb-3 text-sm leading-relaxed outline-none placeholder:text-muted-foreground/70"
      />
    </div>
  );
}

function IconButton({
  label, onClick, disabled, children,
}: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors",
        "hover:bg-foreground/8 hover:text-foreground disabled:pointer-events-none disabled:opacity-40",
      )}
    >
      {children}
    </button>
  );
}
