import { useEffect, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Copy, Minus, Square, X } from "lucide-react";
import { cn } from "@/lib/utils";

const win = getCurrentWindow();

export function TitleBar({ children }: { children?: React.ReactNode }) {
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    const refresh = () => void win.isMaximized().then(setMaximized);
    refresh();
    const unlisten = win.onResized(refresh);
    return () => void unlisten.then((off) => off());
  }, []);

  return (
    <header data-tauri-drag-region className="flex h-11 shrink-0 items-center gap-2 pl-4">
      <div data-tauri-drag-region className="flex min-w-0 flex-1 items-center gap-2">
        {children}
      </div>
      <div className="flex h-full self-start">
        <WindowButton label="Minimizar" onClick={() => win.minimize()}>
          <Minus className="size-4" strokeWidth={1.5} />
        </WindowButton>
        <WindowButton label={maximized ? "Restaurar" : "Maximizar"} onClick={() => win.toggleMaximize()}>
          {maximized ? (
            <Copy className="size-3.5 -scale-x-100" strokeWidth={1.5} />
          ) : (
            <Square className="size-3.5" strokeWidth={1.5} />
          )}
        </WindowButton>
        <WindowButton label="Fechar (continua na bandeja)" onClick={() => win.hide()} danger>
          <X className="size-4" strokeWidth={1.5} />
        </WindowButton>
      </div>
    </header>
  );
}

function WindowButton({
  label, onClick, danger, children,
}: { label: string; onClick: () => void; danger?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn(
        "grid h-9 w-12 place-items-center text-foreground/70 transition-colors focus-visible:-outline-offset-2",
        danger ? "hover:bg-[#c42b1c] hover:text-white" : "hover:bg-foreground/8",
      )}
    >
      {children}
    </button>
  );
}
