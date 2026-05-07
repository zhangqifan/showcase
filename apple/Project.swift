import ProjectDescription

let baseSettings: SettingsDictionary = [
    "CURRENT_PROJECT_VERSION": "1",
    "MARKETING_VERSION": "1.0",
    "SWIFT_VERSION": "5.0",
]

let project = Project(
    name: "Showcase",
    options: .options(
        automaticSchemesOptions: .disabled
    ),
    settings: .settings(base: baseSettings),
    targets: [
        .target(
            name: "Mac",
            destinations: .macOS,
            product: .app,
            productName: "Showcase",
            bundleId: "com.shuhari.showcase.mac",
            deploymentTargets: .macOS("14.0"),
            infoPlist: "Sources/Mac/Info.plist",
            sources: "Sources/Mac/**",
            settings: .settings(
                base: [
                    "ENABLE_HARDENED_RUNTIME": "YES",
                ]
            )
        ),
        .target(
            name: "iOS",
            destinations: .iOS,
            product: .app,
            productName: "Showcase",
            bundleId: "com.shuhari.showcase.ios",
            deploymentTargets: .iOS("17.0"),
            infoPlist: "Sources/iOS/Info.plist",
            sources: "Sources/iOS/**"
        ),
    ],
    schemes: [
        .scheme(
            name: "Mac",
            shared: true,
            buildAction: .buildAction(targets: ["Mac"]),
            runAction: .runAction(executable: "Mac")
        ),
        .scheme(
            name: "iOS",
            shared: true,
            buildAction: .buildAction(targets: ["iOS"]),
            runAction: .runAction(executable: "iOS")
        ),
    ]
)
