export function currencyDigits(currency: string): number {
  if (!/^[A-Z]{3}$/.test(currency)) throw new Error('Informe uma moeda com três letras, como BRL.');
  const supported = Intl.supportedValuesOf('currency');
  if (!supported.includes(currency)) throw new Error('Moeda não reconhecida.');
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency })
    .resolvedOptions().maximumFractionDigits ?? 2;
}
/** pt-BR input; accepts ungrouped dot decimals for native/CSV interchange. */
export function parseMoney(input: string, currency = 'BRL'): number | null {
  let text = input.trim().replace(/\s/g, '');
  if (!text) return null;
  const digits = currencyDigits(currency);
  if (text.includes(',')) {
    if (!/^\d{1,3}(?:\.\d{3})*(?:,\d+)?$|^\d+(?:,\d+)?$/.test(text)) {
      throw new Error('Valor inválido. Use, por exemplo, 1.234,56.');
    }
    text = text.replace(/\./g, '').replace(',', '.');
  }
  if (!/^\d+(?:\.\d+)?$/.test(text)) throw new Error('Informe um valor positivo.');
  const [whole = '0', fraction = ''] = text.split('.');
  if (fraction.length > digits) throw new Error(`A moeda ${currency} aceita ${digits} casas decimais.`);
  const minor = Number(whole) * 10 ** digits + Number(fraction.padEnd(digits, '0'));
  if (!Number.isSafeInteger(minor) || minor <= 0) throw new Error('O valor deve ser maior que zero e válido.');
  return minor;
}
export function money(minor: number, currency = 'BRL'): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency })
    .format(minor / 10 ** currencyDigits(currency));
}
export function moneyInput(minor: number | null, currency = 'BRL'): string {
  return minor === null ? '' : (minor / 10 ** currencyDigits(currency)).toFixed(currencyDigits(currency)).replace('.', ',');
}
export function localDate(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T12:00:00`);
  return !Number.isNaN(d.getTime()) && localDate(d) === value;
}
export function monthOffset(month: string, offset: number): string {
  const date = new Date(`${month}-15T12:00:00`);
  date.setMonth(date.getMonth() + offset);
  return localDate(date).slice(0, 7);
}
export function monthLabel(month: string): string {
  return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(new Date(`${month}-15T12:00:00`));
}
