use std::sync::Mutex;
use std::time::{Duration, SystemTime, UNIX_EPOCH};

use serde::Deserialize;
use tauri::{
    async_runtime::JoinHandle,
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Manager, State, WindowEvent,
};
use tauri_plugin_autostart::MacosLauncher;
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};
use tauri_plugin_notification::NotificationExt;
use tauri_plugin_sql::{Migration, MigrationKind};

const MINIMIZED_ARG: &str = "--minimized";

#[derive(Deserialize)]
struct Reminder {
    id: i64,
    title: String,
    body: String,
    at: i64,
}

#[derive(Default)]
struct Scheduler(Mutex<Option<JoinHandle<()>>>);

fn now_ms() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0)
}

#[tauri::command]
fn set_reminders(app: AppHandle, scheduler: State<'_, Scheduler>, mut reminders: Vec<Reminder>) {
    reminders.sort_by_key(|r| r.at);
    let task = tauri::async_runtime::spawn(async move {
        for r in reminders {
            // Dorme no máximo 60 s por vez conferindo o relógio do sistema:
            // se o PC hibernar, o lembrete dispara assim que ele acordar, sem atrasar.
            loop {
                let left = r.at - now_ms();
                if left <= 0 {
                    break;
                }
                tokio::time::sleep(Duration::from_millis(left.min(60_000) as u64)).await;
            }
            if let Err(e) = app.notification().builder().title(&r.title).body(&r.body).show() {
                eprintln!("falha ao mostrar notificação: {e}");
            }
            let _ = app.emit("reminder-fired", r.id);
        }
    });
    if let Some(old) = scheduler.0.lock().unwrap().replace(task) {
        old.abort();
    }
}

#[tauri::command]
fn notify(app: AppHandle, title: String, body: String) {
    if let Err(e) = app.notification().builder().title(&title).body(&body).show() {
        eprintln!("falha ao mostrar notificação: {e}");
    }
}

fn started_minimized() -> bool {
    std::env::args().any(|a| a == MINIMIZED_ARG)
}

/// Chamado pelo frontend quando a tela já está desenhada: assim a janela nunca aparece branca.
#[tauri::command]
fn app_ready(app: AppHandle) {
    if !started_minimized() {
        show_main(&app);
    }
}

fn show_main(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
    }
}

fn toggle_window(app: &AppHandle, label: &str) {
    if let Some(window) = app.get_webview_window(label) {
        if window.is_visible().unwrap_or(false) {
            let _ = window.hide();
        } else {
            if label == "quick" {
                let _ = window.center();
            }
            let _ = window.show();
            let _ = window.set_focus();
        }
    }
}

fn new_task(app: &AppHandle) {
    show_main(app);
    let _ = app.emit("new-task", ());
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Estrutura do banco. Para mudar no futuro, adicione uma Migration com version: 2 (nunca edite a 1).
    let migrations = vec![Migration {
        version: 1,
        description: "criar tabela de tarefas",
        sql: "CREATE TABLE tasks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                note TEXT NOT NULL DEFAULT '',
                tag TEXT,
                created_at INTEGER NOT NULL,
                remind_at INTEGER,
                completed_at INTEGER
              );",
        kind: MigrationKind::Up,
    }];

    tauri::Builder::default()
        // Deve ser o primeiro plugin: abrir o Memo de novo só traz a janela que já está aberta.
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| show_main(app)))
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:memo.db", migrations)
                .build(),
        )
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_autostart::init(
            MacosLauncher::LaunchAgent,
            Some(vec![MINIMIZED_ARG]),
        ))
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .manage(Scheduler::default())
        .invoke_handler(tauri::generate_handler![set_reminders, app_ready, notify])
        .setup(|app| {
            // Se outro programa já usa a combinação, o Memo continua funcionando sem ela.
            for (keys, label) in [("ctrl+alt+n", "quick"), ("ctrl+alt+b", "notes")] {
                if let Err(e) = app
                    .global_shortcut()
                    .on_shortcut(keys, move |app, _shortcut, event| {
                        if event.state == ShortcutState::Pressed {
                            toggle_window(app, label);
                        }
                    })
                {
                    eprintln!("atalho {keys} indisponível: {e}");
                }
            }

            let open = MenuItem::with_id(app, "open", "Abrir Memo", true, None::<&str>)?;
            let new = MenuItem::with_id(app, "new", "Nova tarefa", true, None::<&str>)?;
            let notes = MenuItem::with_id(app, "notes", "Rascunho (Ctrl+Alt+B)", true, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "Sair do Memo", true, None::<&str>)?;
            TrayIconBuilder::with_id("tray")
                .icon(app.default_window_icon().unwrap().clone())
                .tooltip("Memo")
                .menu(&Menu::with_items(app, &[&open, &new, &notes, &quit])?)
                .show_menu_on_left_click(false)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "open" => show_main(app),
                    "new" => new_task(app),
                    "notes" => toggle_window(app, "notes"),
                    "quit" => app.exit(0),
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        show_main(tray.app_handle());
                    }
                })
                .build(app)?;

            // A janela nasce oculta (tauri.conf.json) e quem a mostra é `app_ready`.
            // Rede de segurança: se o frontend não carregar em 5 s, mostra assim mesmo.
            if !started_minimized() {
                let handle = app.handle().clone();
                tauri::async_runtime::spawn(async move {
                    tokio::time::sleep(Duration::from_secs(5)).await;
                    if let Some(window) = handle.get_webview_window("main") {
                        if !window.is_visible().unwrap_or(true) {
                            show_main(&handle);
                        }
                    }
                });
            }
            Ok(())
        })
        // Fechar a janela (X ou Alt+F4) só a esconde: o app continua na bandeja disparando lembretes.
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                let _ = window.hide();
            }
        })
        .run(tauri::generate_context!())
        .expect("erro ao iniciar o Memo");
}
