import React from "react";
import ReactDOM from "react-dom/client";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { MotionConfig } from "framer-motion";
import "@fontsource-variable/inter"; // fonte embutida no app: funciona offline
import "./index.css";
import "./lib/theme"; // aplica o tema antes do primeiro desenho
import App from "./App";
import { QuickCapture } from "@/components/QuickCapture";
import { ScratchPad } from "@/components/ScratchPad";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";

if (import.meta.env.PROD) document.addEventListener("contextmenu", (e) => e.preventDefault());

const label = getCurrentWindow().label;
const quick = label === "quick";
if (quick) document.documentElement.classList.add("quick");

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {/* reducedMotion="user": respeita "Mostrar animações" desligado nas configurações do Windows. */}
    <MotionConfig reducedMotion="user">
      {quick ? (
        <QuickCapture />
      ) : label === "notes" ? (
        <ScratchPad />
      ) : (
        <TooltipProvider>
          <App />
          <Toaster position="bottom-center" />
        </TooltipProvider>
      )}
    </MotionConfig>
  </React.StrictMode>,
);
