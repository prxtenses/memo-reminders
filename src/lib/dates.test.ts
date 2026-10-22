import assert from "node:assert/strict";
import { friendlyDate } from "./dates.ts";
import { inView, matches, parseBackup, sortTasks, toBackupJson, type Task } from "./tasks.ts";

const now = new Date(2026, 9, 21, 12, 0).getTime(); // qua, 21 out 2026, 12:00
const at = (d: number, h: number, m = 0, y = 2026, mo = 9) => new Date(y, mo, d, h, m).getTime();

assert.equal(friendlyDate(at(21, 18, 42), now), "hoje, 18:42");
assert.equal(friendlyDate(at(20, 18, 42), now), "ontem, 18:42");
assert.equal(friendlyDate(at(22, 9), now), "amanhã, 09:00");
assert.equal(friendlyDate(at(28, 9), now), "qua, 28 out, 09:00");
assert.equal(friendlyDate(at(24, 9), now), "sáb, 24 out, 09:00");
assert.equal(friendlyDate(at(3, 7, 5, 2025, 0), now), "3 jan 2025, 07:05");

const task = (p: Partial<Task>): Task => ({
  id: 1, title: "Gerar ATPV do carro X", note: "", tag: null,
  created_at: at(20, 10), remind_at: null, completed_at: null, ...p,
});
const old = task({});
const overdue = task({ remind_at: at(21, 9) });
const later = task({ remind_at: at(25, 9) });
const done = task({ completed_at: at(21, 11) });

assert.equal(inView(old, "today", now), false);
assert.equal(inView(task({ created_at: at(21, 8) }), "today", now), true);
assert.equal(inView(overdue, "today", now), true);
assert.equal(inView(later, "today", now), false);
assert.equal(inView(overdue, "overdue", now), true);
assert.equal(inView(later, "overdue", now), false);
assert.equal(inView(done, "pending", now), false);
assert.equal(inView(done, "done", now), true);
assert.deepEqual(sortTasks([old, later, overdue], "pending"), [overdue, later, old]);

assert.equal(matches(task({ title: "Emitir recibo do cliente Y" }), "RECIBO"), true);
assert.equal(matches(task({ note: "Ligar para João" }), "joao"), true);
assert.equal(matches(task({ tag: "ATPV" }), "atpv"), true);
assert.equal(matches(task({}), "boleto"), false);

const back = parseBackup(toBackupJson([overdue, task({ title: "  " })]));
assert.equal(back.length, 1); // título vazio é descartado
assert.equal(back[0].remind_at, overdue.remind_at);
assert.throws(() => parseBackup("{}"), /não é um backup/);
assert.throws(() => parseBackup("x"), /JSON válido/);

console.log("✓ todos os testes passaram");
