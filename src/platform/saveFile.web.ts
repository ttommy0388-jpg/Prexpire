type Downloads = { save: (req: { filename: string; data: string }) => Promise<unknown> };
type ClaudeHost = { use: (name: 'downloads') => Promise<Downloads | null> };

// Downloads text as a file. Inside a claude.ai artifact (where plain downloads are blocked)
// the viewer's download prompt is used instead; declining it is not an error.
export async function saveTextFile(fileName: string, mimeType: string, text: string) {
  const host = (window as unknown as { claude?: ClaudeHost }).claude;
  const downloads = host?.use ? await host.use('downloads') : null;
  if (downloads) {
    try {
      await downloads.save({ filename: fileName, data: text });
    } catch (e) {
      if ((e as { code?: string })?.code !== 'declined') throw e;
    }
    return;
  }

  // The object URL is released once the download has started.
  const blob = new Blob([text], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.rel = 'noopener';
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }
}
