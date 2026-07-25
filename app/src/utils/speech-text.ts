// Wikipedia/AI-generated text reads badly aloud verbatim: citation markers, IPA
// pronunciation guides, and stray whitespace all make TTS sound choppy and robotic.
export function sanitizeForSpeech(text: string): string {
  return text
    .replace(/\[[^\]]*\]/g, '')
    .replace(/\([^)]*\/[^)]*\)/g, '')
    .replace(/\s+([.,;:!?])/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .trim();
}
