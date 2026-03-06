mod commands;

use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager,
};

use commands::{check_docker, get_axon_status, start_axon, stop_axon};

/// Build and attach the system tray icon with its context menu.
fn setup_tray(app: &tauri::AppHandle) -> tauri::Result<()> {
    let open = MenuItem::with_id(app, "open", "Open Axon", true, None::<&str>)?;
    let start = MenuItem::with_id(app, "start", "Start Axon", true, None::<&str>)?;
    let stop = MenuItem::with_id(app, "stop", "Stop Axon", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?;

    let menu = Menu::with_items(app, &[&open, &start, &stop, &quit])?;

    TrayIconBuilder::new()
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_tray_icon_event(|tray, event| {
            // Left-click on tray icon → show the main window
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                show_main_window(tray.app_handle());
            }
        })
        .on_menu_event(|app, event| match event.id.as_ref() {
            "open" => show_main_window(app),
            "start" => {
                let _ = start_axon();
            }
            "stop" => {
                let _ = stop_axon();
            }
            "quit" => app.exit(0),
            _ => {}
        })
        .build(app)?;

    Ok(())
}

fn show_main_window(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.set_focus();
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            setup_tray(&app.handle())?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            check_docker,
            start_axon,
            stop_axon,
            get_axon_status,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Axon Desktop");
}
