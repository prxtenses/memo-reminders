import { useState } from "react";
import { addDays, addHours, format, nextMonday, setHours, setMinutes, startOfDay, startOfHour } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Bell, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { friendlyDate } from "@/lib/dates";
import { cn } from "@/lib/utils";

const at = (day: Date | number, h: number, m = 0) => setMinutes(setHours(day, h), m).getTime();

function presets(now: Date): [string, number][] {
  const list: [string, number][] = [["Daqui a pouco", addHours(startOfHour(now), 2).getTime()]];
  if (now.getHours() < 17) list.push(["Hoje, 18:00", at(now, 18)]);
  list.push(["Amanhã, 09:00", at(addDays(now, 1), 9)]);
  list.push(["Segunda, 09:00", at(nextMonday(now), 9)]);
  return list;
}

export function ReminderPicker({ value, onChange }: { value: number | null; onChange: (v: number | null) => void }) {
  const [open, setOpen] = useState(false);
  const [day, setDay] = useState<Date | undefined>();
  const [time, setTime] = useState("09:00");
  const now = new Date();

  const [h, m] = time.split(":").map(Number);
  const custom = day && !Number.isNaN(h) ? at(day, h, m) : null;
  const customValid = custom !== null && custom > Date.now();

  const pick = (v: number) => {
    onChange(v);
    setOpen(false);
  };

  return (
    <div className="flex items-center gap-1">
      <Popover
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (o) {
            setDay(value ? new Date(value) : new Date());
            setTime(value ? format(value, "HH:mm") : "09:00");
          }
        }}
      >
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="secondary"
            className={cn("h-8 rounded-full px-3 text-[13px] font-medium", value && "text-brand")}
          >
            <Bell className="size-3.5" />
            {value ? friendlyDate(value) : "Lembrar-me"}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          collisionPadding={12}
          className="flex w-auto rounded-2xl p-0 shadow-xl shadow-black/10"
        >
          <div className="flex w-44 flex-col gap-0.5 border-r p-2">
            <span className="px-3 pt-1 pb-1.5 text-xs font-medium text-muted-foreground">Atalhos</span>
            {presets(now).map(([label, v]) => (
              <button
                key={label}
                type="button"
                onClick={() => pick(v)}
                className="flex flex-col rounded-lg px-3 py-2 text-left text-sm hover:bg-accent focus-visible:bg-accent"
              >
                <span className="font-medium">{label}</span>
                <span className="text-xs text-muted-foreground">{friendlyDate(v)}</span>
              </button>
            ))}
          </div>
          <div>
            <Calendar
              mode="single"
              locale={ptBR}
              selected={day}
              onSelect={setDay}
              disabled={{ before: startOfDay(now) }}
              className="bg-transparent"
            />
            <div className="flex items-center gap-2 border-t p-3">
              <label htmlFor="reminder-time" className="text-sm text-muted-foreground">
                Hora
              </label>
              <input
                id="reminder-time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="h-8 rounded-lg bg-input px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <Button
                type="button"
                size="sm"
                className="ml-auto rounded-full"
                disabled={!customValid}
                title={custom !== null && !customValid ? "Escolha um horário no futuro" : undefined}
                onClick={() => custom !== null && pick(custom)}
              >
                Definir
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
      {value && (
        <button
          type="button"
          aria-label="Remover lembrete"
          title="Remover lembrete"
          onClick={() => onChange(null)}
          className="grid size-7 place-items-center rounded-full text-muted-foreground hover:bg-foreground/8 hover:text-foreground"
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  );
}
