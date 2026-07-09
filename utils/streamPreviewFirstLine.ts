/** Main timeline shows one logical line per entry. */
export function streamPreviewFirstLine(text: string): string {
  const first = text.split(/\r?\n/, 1)[0];
  return first.trimEnd();
}
