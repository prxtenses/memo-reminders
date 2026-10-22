import { addDays, format, isSameDay, isSameYear } from "date-fns";
import { ptBR } from "date-fns/locale";

/**
 * Data amigável em pt-BR:
 * "hoje, 18:42" · "ontem, 18:42" · "amanhã, 09:00" · "qua, 21 out, 18:42" · "21 out 2025, 18:42"
 */
export function friendlyDate(ms: number, now: number = Date.now()): string {
  const d = new Date(ms);
  const isDay = (offset: number) => isSameDay(d, addDays(now, offset));
  let day: string;
  if (isDay(0)) day = "hoje";
  else if (isDay(-1)) day = "ontem";
  else if (isDay(1)) day = "amanhã";
  // "EEEEEE" = dia abreviado (seg, ter...); o date-fns escreve "sab" sem acento.
  else if (isSameYear(d, now)) day = format(d, "EEEEEE, d MMM", { locale: ptBR }).replace("sab", "sáb");
  else day = format(d, "d MMM yyyy", { locale: ptBR });
  return `${day}, ${format(d, "HH:mm")}`;
}
