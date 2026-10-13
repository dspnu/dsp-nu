// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "DspNuCapacitorAppleWallet",
    platforms: [.iOS(.v15)],
    products: [
        .library(
            name: "DspNuCapacitorAppleWallet",
            targets: ["AppleWalletPlugin"])
    ],
    dependencies: [
        .package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", from: "8.0.0")
    ],
    targets: [
        .target(
            name: "AppleWalletPlugin",
            dependencies: [
                .product(name: "Capacitor", package: "capacitor-swift-pm"),
                .product(name: "Cordova", package: "capacitor-swift-pm")
            ],
            path: "ios/Plugin",
            linkerSettings: [
                .linkedFramework("PassKit")
            ]
        )
    ]
)
