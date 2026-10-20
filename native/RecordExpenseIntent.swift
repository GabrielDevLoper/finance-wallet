import AppIntents
import Foundation

struct RecordExpenseIntent: AppIntent {
  static let title: LocalizedStringResource = "Registrar gasto na Minha Carteira"
  static let description = IntentDescription("Recebe os dados disponíveis da compra e guarda um registro para revisão.")
  static let openAppWhenRun = false
  // This action only appends; it cannot reveal or delete the user's financial data.
  static let authenticationPolicy: IntentAuthenticationPolicy = .alwaysAllowed

  @Parameter(title: "Valor")
  var amount: Double?

  @Parameter(title: "Moeda (ex.: BRL)")
  var currency: String?

  @Parameter(title: "Estabelecimento")
  var merchant: String?

  @Parameter(title: "Cartão ou apelido configurado")
  var card: String?

  @Parameter(title: "Data da compra")
  var purchaseDate: Date?

  @Parameter(title: "ID estável do evento (opcional)")
  var eventID: String?

  static var parameterSummary: some ParameterSummary {
    Summary("Registrar \(\.$amount) em \(\.$merchant)") {
      \.$currency
      \.$card
      \.$purchaseDate
      \.$eventID
    }
  }

  func perform() async throws -> some IntentResult & ProvidesDialog {
    let now = ISO8601DateFormatter().string(from: Date())
    let formatter = DateFormatter()
    formatter.locale = Locale(identifier: "en_US_POSIX")
    formatter.calendar = Calendar(identifier: .gregorian)
    formatter.dateFormat = "yyyy-MM-dd"
    let suppliedID = eventID?.trimmingCharacters(in: .whitespacesAndNewlines)
    let event = CapturedExpense(
      id: suppliedID.flatMap { $0.isEmpty ? nil : $0 } ?? UUID().uuidString,
      amount: amount.map { String($0) },
      currency: currency,
      merchant: merchant,
      card: card,
      date: purchaseDate.map { formatter.string(from: $0) },
      recordedAt: now
    )
    try await ExpenseInbox.shared.save(event)
    return .result(dialog: "Registro recebido. Abra Minha Carteira para revisar os dados.")
  }
}
