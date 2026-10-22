import assert from "node:assert/strict";
import { parseQuick } from "./parse.ts";

const now = new Date(2026, 9, 21, 12, 0).getTime(); // qua, 21 out 2026, 12:00
const at = (mo: number, d: number, h: number, m = 0, y = 2026) => new Date(y, mo, d, h, m).getTime();
const check = (text: string, title: string, remindAt: number | null) =>
  assert.deepEqual(parseQuick(text, now), { title, remindAt }, text);

check("Gerar ATPV do carro X amanhã 10h", "Gerar ATPV do carro X", at(9, 22, 10));
check("Gerar ATPV do carro X amanha 10h", "Gerar ATPV do carro X", at(9, 22, 10));
check("Emitir recibo do cliente Y", "Emitir recibo do cliente Y", null);
check("Comprar 2 pneus", "Comprar 2 pneus", null);
check("Ligar pro João na segunda às 14h30", "Ligar pro João", at(9, 26, 14, 30));
check("Vistoria na sexta-feira", "Vistoria", at(9, 23, 9));
check("Vistoria quarta", "Vistoria", at(9, 28, 9)); // hoje é quarta: vai para a próxima
check("Pagar boleto dia 25", "Pagar boleto", at(9, 25, 9));
check("Pagar boleto até dia 5", "Pagar boleto", at(10, 5, 9));
check("Renovar CNH 10/01", "Renovar CNH", at(0, 10, 9, 0, 2027));
check("Renovar CNH 30/02", "Renovar CNH 30/02", null);
check("Reunião 15:00", "Reunião", at(9, 21, 15));
check("Reunião 9h", "Reunião", at(9, 22, 9)); // já passou hoje: amanhã
check("Reunião às 16", "Reunião", at(9, 21, 16));
check("Almoço com cliente meio-dia amanhã", "Almoço com cliente", at(9, 22, 12));
check("Enviar nota em 30 min", "Enviar nota", at(9, 21, 12, 30));
check("Enviar nota daqui a 2 horas", "Enviar nota", at(9, 21, 14));
check("Ligar hoje", "Ligar", at(9, 21, 14)); // hoje sem hora, depois das 9h: daqui a pouco
check("Despachante depois de amanhã 8h", "Despachante", at(9, 23, 8));
check("amanhã 10h", "amanhã 10h", null); // só data: mantém o texto

console.log("✓ parse: todos os testes passaram");
