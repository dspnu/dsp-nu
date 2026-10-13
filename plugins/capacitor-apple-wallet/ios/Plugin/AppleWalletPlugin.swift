import Foundation
import Capacitor
import PassKit

@objc(AppleWalletPlugin)
public class AppleWalletPlugin: CAPPlugin, CAPBridgedPlugin, PKAddPassesViewControllerDelegate {
    public let identifier = "AppleWalletPlugin"
    public let jsName = "AppleWallet"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "addPass", returnType: CAPPluginReturnPromise)
    ]

    private var pendingCall: CAPPluginCall?

    @objc func addPass(_ call: CAPPluginCall) {
        guard pendingCall == nil else {
            call.reject("A Wallet pass is already being presented")
            return
        }

        guard let base64 = call.getString("base64"), !base64.isEmpty else {
            call.reject("Missing pass data")
            return
        }

        guard let data = Data(base64Encoded: base64, options: .ignoreUnknownCharacters) else {
            call.reject("Pass data is not valid base64")
            return
        }

        let pass: PKPass
        do {
            pass = try PKPass(data: data)
        } catch {
            call.reject("Could not read the pass: \(error.localizedDescription)")
            return
        }

        guard PKAddPassesViewController.canAddPasses() else {
            call.reject("This device cannot add passes to Apple Wallet")
            return
        }

        guard let addController = PKAddPassesViewController(pass: pass) else {
            call.reject("Could not open Add to Apple Wallet")
            return
        }

        addController.delegate = self

        DispatchQueue.main.async { [weak self] in
            guard let self else {
                call.reject("Wallet plugin was released")
                return
            }
            guard let presenter = self.bridge?.viewController else {
                call.reject("No view controller to present Apple Wallet")
                return
            }
            self.pendingCall = call
            presenter.present(addController, animated: true)
        }
    }

    public func addPassesViewControllerDidFinish(_ controller: PKAddPassesViewController) {
        controller.dismiss(animated: true) { [weak self] in
            self?.pendingCall?.resolve()
            self?.pendingCall = nil
        }
    }
}
