import Foundation
import CryptoKit
import Security
import ExpoModulesCore

enum WalletInboxError: LocalizedError {
  case keychain(OSStatus)
  case full
  case invalid
  var errorDescription: String? {
    switch self {
    case .keychain: return "Desbloqueie o iPhone e tente registrar novamente."
    case .full: return "Abra Minha Carteira para receber os registros pendentes."
    case .invalid: return "Não foi possível ler um registro. A fila foi preservada."
    }
  }
}

struct CapturedExpense: Codable, Sendable {
  let id: String
  let amount: String?
  let currency: String?
  let merchant: String?
  let card: String?
  let date: String?
  let recordedAt: String
}

// Intents run in this app's target, including when the JS runtime is stopped.
// One encrypted file per event avoids lossy read-modify-write queues.
actor ExpenseInbox {
  static let shared = ExpenseInbox()
  private let service = "com.minhacarteira.inbox"

  private func directory() throws -> URL {
    let base = try FileManager.default.url(for: .applicationSupportDirectory, in: .userDomainMask,
                                           appropriateFor: nil, create: true)
    var dir = base.appendingPathComponent("WalletInbox", isDirectory: true)
    try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true,
      attributes: [.protectionKey: FileProtectionType.completeUntilFirstUserAuthentication])
    var values = URLResourceValues()
    values.isExcludedFromBackup = true
    try dir.setResourceValues(values)
    return dir
  }

  private func key() throws -> SymmetricKey {
    let query: [String: Any] = [
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrService as String: service,
      kSecAttrAccount as String: "aes-key",
      kSecReturnData as String: true
    ]
    var result: CFTypeRef?
    let status = SecItemCopyMatching(query as CFDictionary, &result)
    if status == errSecSuccess, let bytes = result as? Data {
      return SymmetricKey(data: bytes)
    }
    guard status == errSecItemNotFound else { throw WalletInboxError.keychain(status) }
    let generated = SymmetricKey(size: .bits256)
    let bytes = generated.withUnsafeBytes { Data($0) }
    var insert = query
    insert.removeValue(forKey: kSecReturnData as String)
    insert[kSecValueData as String] = bytes
    insert[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
    let added = SecItemAdd(insert as CFDictionary, nil)
    guard added == errSecSuccess else { throw WalletInboxError.keychain(added) }
    return generated
  }

  private func file(for id: String) throws -> URL {
    let digest = SHA256.hash(data: Data(id.utf8)).map { String(format: "%02x", $0) }.joined()
    return try directory().appendingPathComponent(digest + ".sealed")
  }

  private func files() throws -> [URL] {
    try FileManager.default.contentsOfDirectory(at: directory(), includingPropertiesForKeys: nil)
      .filter { $0.pathExtension == "sealed" }
  }

  func save(_ event: CapturedExpense) throws {
    let target = try file(for: event.id)
    if FileManager.default.fileExists(atPath: target.path) { return }
    guard try files().count < 1000 else { throw WalletInboxError.full }
    let data = try JSONEncoder().encode(event)
    guard let sealed = try AES.GCM.seal(data, using: key()).combined else { throw WalletInboxError.invalid }
    try sealed.write(to: target, options: [.atomic, .completeFileProtectionUntilFirstUserAuthentication])
  }

  func pending() throws -> [String] {
    let items = try files()
    if items.isEmpty { return [] }
    let secret = try key()
    return try items.map {
      let sealed = try AES.GCM.SealedBox(combined: Data(contentsOf: $0))
      let clear = try AES.GCM.open(sealed, using: secret)
      guard let json = String(data: clear, encoding: .utf8) else { throw WalletInboxError.invalid }
      return json
    }
  }

  func acknowledge(_ id: String) throws {
    let target = try file(for: id)
    if FileManager.default.fileExists(atPath: target.path) { try FileManager.default.removeItem(at: target) }
  }

  func clear() throws {
    for item in try files() { try FileManager.default.removeItem(at: item) }
  }
}

public final class WalletInbox: Module {
  public func definition() -> ModuleDefinition {
    Name("WalletInbox")
    AsyncFunction("pending") { () async throws -> [String] in
      try await ExpenseInbox.shared.pending()
    }
    AsyncFunction("acknowledge") { (id: String) async throws in
      try await ExpenseInbox.shared.acknowledge(id)
    }
    AsyncFunction("clear") { () async throws in
      try await ExpenseInbox.shared.clear()
    }
  }
}
