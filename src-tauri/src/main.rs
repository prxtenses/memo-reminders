// Evita abrir uma janela de console junto com o app na versão final. NÃO REMOVER.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    memo_lib::run();
}
