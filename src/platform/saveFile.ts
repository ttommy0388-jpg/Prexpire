import { Share } from 'react-native';

// On phones the export opens the share sheet with the file's contents (save to Files, mail, …).
export async function saveTextFile(fileName: string, _mimeType: string, text: string) {
  await Share.share({ title: fileName, message: text });
}
