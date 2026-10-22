import { motion } from "framer-motion";
import { CheckCircle2, CircleAlert, Inbox, Plus, Search, Settings, Sun } from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarHeader,
  SidebarMenu, SidebarMenuBadge, SidebarMenuButton, SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/Kbd";
import { glide, spring } from "@/lib/motion";
import { inView, VIEW_LABELS, type View } from "@/lib/tasks";
import { useTasks } from "@/store/tasks";

export const VIEW_ICONS: Record<View, typeof Sun> = {
  today: Sun,
  pending: Inbox,
  overdue: CircleAlert,
  done: CheckCircle2,
};

const VIEWS: View[] = ["today", "pending", "overdue", "done"];

export function AppSidebar() {
  const { tasks, view, now, set } = useTasks();

  return (
    <Sidebar>
      <SidebarHeader data-tauri-drag-region className="gap-4 px-4 pt-4">
        <div data-tauri-drag-region className="flex items-center gap-2.5">
          <div className="grid size-7 place-items-center rounded-[30%] bg-primary text-sm font-bold text-primary-foreground">
            M
          </div>
          <span className="text-[15px] font-semibold">Memo</span>
        </div>
        <Button className="h-9 justify-start rounded-full" onClick={() => set({ editing: null })}>
          <Plus /> Nova tarefa
          <Kbd className="ml-auto bg-primary-foreground/15 text-primary-foreground/80">Ctrl N</Kbd>
        </Button>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu aria-label="Listas">
              {VIEWS.map((v, i) => {
                const Icon = VIEW_ICONS[v];
                const count = tasks.filter((t) => inView(t, v, now)).length;
                return (
                  <SidebarMenuItem key={v}>
                    <SidebarMenuButton
                      isActive={view === v}
                      onClick={() => set({ view: v })}
                      title={`${VIEW_LABELS[v]} (Ctrl+${i + 1})`}
                      className="relative isolate h-9 rounded-lg data-[active=true]:bg-transparent"
                    >
                      {view === v && (
                        <motion.span
                          layoutId="sidebar-active"
                          transition={glide}
                          className="absolute inset-0 -z-10 rounded-lg bg-sidebar-accent"
                        />
                      )}
                      <Icon className={v === "overdue" && count > 0 ? "text-overdue" : undefined} />
                      <span>{VIEW_LABELS[v]}</span>
                    </SidebarMenuButton>
                    {count > 0 && v !== "done" && (
                      <SidebarMenuBadge>
                        <motion.span
                          key={count}
                          initial={{ scale: 0.6, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={spring}
                        >
                          {count}
                        </motion.span>
                      </SidebarMenuBadge>
                    )}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton className="h-9 rounded-lg" onClick={() => set({ paletteOpen: true })}>
              <Search /> <span>Buscar</span>
              <Kbd className="ml-auto">Ctrl K</Kbd>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton className="h-9 rounded-lg" onClick={() => set({ settingsOpen: true })}>
              <Settings /> <span>Configurações</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
