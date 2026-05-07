import AppKit

private final class MainWindow: NSWindow {
    private enum TrafficLightLayout {
        static let insets = NSEdgeInsets(top: 18, left: 20, bottom: 0, right: 0)
        static let originSpacing: CGFloat = 20
    }

    override func makeKeyAndOrderFront(_ sender: Any?) {
        super.makeKeyAndOrderFront(sender)

        DispatchQueue.main.async { [weak self] in
            self?.layoutTrafficLights()
        }
    }

    override func setFrame(_ frameRect: NSRect, display flag: Bool) {
        super.setFrame(frameRect, display: flag)
        layoutTrafficLights()
    }

    private func layoutTrafficLights() {
        guard
            let closeButton = standardWindowButton(.closeButton),
            let minimizeButton = standardWindowButton(.miniaturizeButton),
            let zoomButton = standardWindowButton(.zoomButton),
            let buttonContainer = closeButton.superview
        else {
            return
        }

        let y: CGFloat
        if buttonContainer.isFlipped {
            y = TrafficLightLayout.insets.top
        } else {
            y = buttonContainer.bounds.height - TrafficLightLayout.insets.top - closeButton.frame.height
        }

        var x = TrafficLightLayout.insets.left
        for button in [closeButton, minimizeButton, zoomButton] {
            button.setFrameOrigin(NSPoint(x: x, y: y))
            x += TrafficLightLayout.originSpacing
        }
    }
}

final class AppDelegate: NSObject, NSApplicationDelegate, NSWindowDelegate {
    private var window: NSWindow?

    func applicationDidFinishLaunching(_ notification: Notification) {
        showMainWindow()
    }

    func applicationShouldHandleReopen(_ sender: NSApplication, hasVisibleWindows flag: Bool) -> Bool {
        if !flag {
            showMainWindow()
        }

        return true
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool {
        false
    }

    func windowWillClose(_ notification: Notification) {
        guard
            let closedWindow = notification.object as? NSWindow,
            closedWindow === window
        else {
            return
        }

        window = nil
    }

    private func showMainWindow() {
        if let window = window {
            window.makeKeyAndOrderFront(nil)
            NSApplication.shared.activate(ignoringOtherApps: true)
            return
        }

        let window = MainWindow(
            contentRect: NSRect(x: 0, y: 0, width: 960, height: 540),
            styleMask: [.titled, .closable, .miniaturizable, .resizable, .fullSizeContentView],
            backing: .buffered,
            defer: false
        )

        window.title = "Showcase"
        window.delegate = self
        window.isReleasedWhenClosed = false
        window.titleVisibility = .hidden
        window.titlebarAppearsTransparent = true
        window.contentAspectRatio = NSSize(width: 16, height: 9)
        window.isMovableByWindowBackground = true
        window.center()
        window.contentViewController = MacRootViewController()
        window.makeKeyAndOrderFront(nil)
        NSApplication.shared.activate(ignoringOtherApps: true)
        self.window = window
    }
}

final class MacRootViewController: NSViewController {
    override func loadView() {
        view = NSView(frame: NSRect(x: 0, y: 0, width: 960, height: 540))
        view.wantsLayer = true
        view.layer?.backgroundColor = NSColor.windowBackgroundColor.cgColor
    }
}
