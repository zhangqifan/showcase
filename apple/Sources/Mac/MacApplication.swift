import AppKit

@main
enum MacApplication {
    private static let appDelegate = AppDelegate()

    static func main() {
        let application = NSApplication.shared
        application.setActivationPolicy(.regular)
        MainMenu.install()
        application.delegate = appDelegate
        application.run()
    }
}

private enum MainMenu {
    static func install() {
        let mainMenu = NSMenu()

        let applicationMenuItem = NSMenuItem(title: "Showcase", action: nil, keyEquivalent: "")
        mainMenu.addItem(applicationMenuItem)

        let applicationMenu = NSMenu(title: "Showcase")
        let quitItem = NSMenuItem(
            title: "Quit Showcase",
            action: #selector(NSApplication.terminate(_:)),
            keyEquivalent: "q"
        )
        quitItem.target = NSApplication.shared
        quitItem.keyEquivalentModifierMask = [.command]
        applicationMenu.addItem(quitItem)
        applicationMenuItem.submenu = applicationMenu

        let windowMenuItem = NSMenuItem(title: "Window", action: nil, keyEquivalent: "")
        mainMenu.addItem(windowMenuItem)

        let windowMenu = NSMenu(title: "Window")
        let closeWindowItem = NSMenuItem(
            title: "Close Window",
            action: #selector(NSWindow.performClose(_:)),
            keyEquivalent: "w"
        )
        closeWindowItem.keyEquivalentModifierMask = [.command]
        windowMenu.addItem(closeWindowItem)
        windowMenuItem.submenu = windowMenu

        NSApplication.shared.mainMenu = mainMenu
        NSApplication.shared.windowsMenu = windowMenu
    }
}
