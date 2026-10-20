import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import { File, Paths } from 'expo-file-system';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';

export async function pickCSV(): Promise<{ text: string; id: string } | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['text/csv', 'text/comma-separated-values', 'text/plain', 'application/csv'],
    copyToCacheDirectory: true,
  });
  if (result.canceled) return null;
  const asset = result.assets[0]!;
  if (asset.size && asset.size > 5 * 1024 * 1024) throw new Error('Use um CSV de até 5 MB por importação.');
  let text: string;
  if (Platform.OS === 'web') text = await (await fetch(asset.uri)).text();
  else {
    const file = new File(asset.uri);
    try { text = await file.text(); } finally { if (file.exists) file.delete(); }
  }
  if (text.length > 5 * 1024 * 1024) throw new Error('Use um CSV de até 5 MB por importação.');
  const id = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, text);
  return { text, id };
}
export async function shareCSV(text: string, name = 'minha-carteira.csv') {
  if (Platform.OS === 'web') {
    const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url; anchor.download = name; anchor.click(); URL.revokeObjectURL(url);
    return;
  }
  if (!await Sharing.isAvailableAsync()) throw new Error('O compartilhamento não está disponível neste dispositivo.');
  const file = new File(Paths.cache, name);
  try {
    file.write(text);
    await Sharing.shareAsync(file.uri, { mimeType: 'text/csv', UTI: 'public.comma-separated-values-text', dialogTitle: 'Exportar gastos' });
  } finally { if (file.exists) file.delete(); }
}
