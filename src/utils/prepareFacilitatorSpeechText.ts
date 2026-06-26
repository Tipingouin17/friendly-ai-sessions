/**
 * prepareFacilitatorSpeechText
 *
 * Normalises AI facilitator text before it is passed to a TTS engine.
 * Chat-optimised text (markdown, long sentences, lists, URLs) sounds robotic
 * when read aloud verbatim. This utility converts it to a spoken-word form
 * that is warm, natural, and appropriately brief.
 *
 * Design goals
 * ─────────────
 * • Strip markdown formatting that TTS reads literally ("asterisk asterisk").
 * • Convert bullet lists into flowing spoken transitions.
 * • Expand common abbreviations / symbols that sound wrong when spoken.
 * • Remove or shorten URLs.
 * • Split sentences that are too long at natural clause boundaries.
 * • Cap total spoken text at ~90 words (≈35 s at 150 wpm) for normal turns.
 *
 * The function is intentionally pure and side-effect-free so it can be unit
 * tested without a DOM or network.
 */

const MAX_SPOKEN_WORDS = 90;

// ---------------------------------------------------------------------------
// Symbol / abbreviation expansion
// ---------------------------------------------------------------------------
const SYMBOL_EXPANSIONS: [RegExp, string][] = [
  [/&amp;/g, 'and'],
  [/&/g, 'and'],
  [/\be\.g\./gi, 'for example'],
  [/\bi\.e\./gi, 'that is'],
  [/\betc\./gi, 'and so on'],
  [/\bvs\./gi, 'versus'],
  [/\bw\//gi, 'with'],
  [/\bw\/o\b/gi, 'without'],
  [/\b(\d+)\s*%/g, '$1 percent'],
  [/\b(\d+)\s*€/g, '$1 euros'],
  [/\b(\d+)\s*\$/g, '$1 dollars'],
  [/\b(\d+)\s*£/g, '$1 pounds'],
];

// ---------------------------------------------------------------------------
// Strip markdown
// ---------------------------------------------------------------------------
function stripMarkdown(text: string): string {
  return text
    // Remove ATX headings (# Heading)
    .replace(/^#{1,6}\s+/gm, '')
    // Remove setext headings (underline-style)
    .replace(/^[=\u002D]{3,}\s*$/gm, '')
    // Bold + italic (***text*** or ___text___)
    .replace(/\*{3}(.+?)\*{3}/g, '$1')
    .replace(/_{3}(.+?)_{3}/g, '$1')
    // Bold (**text** or __text__)
    .replace(/\*{2}(.+?)\*{2}/g, '$1')
    .replace(/_{2}(.+?)_{2}/g, '$1')
    // Italic (*text* or _text_)
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/_(.+?)_/g, '$1')
    // Inline code
    .replace(/`{1,3}[^`]*`{1,3}/g, '')
    // Fenced code blocks
    .replace(/```[\s\S]*?```/g, '')
    // Blockquotes
    .replace(/^>\s*/gm, '')
    // Horizontal rules
    .replace(/^[-*_]{3,}\s*$/gm, '')
    // Images ![alt](url)
    .replace(/!\[.*?\]\(.*?\)/g, '')
    // Links [text](url) → text
    .replace(/\[(.+?)\]\(.*?\)/g, '$1')
    // Bare URLs
    .replace(/https?:\/\/\S+/g, '')
    // HTML tags
    .replace(/<[^>]+>/g, '');
}

// ---------------------------------------------------------------------------
// Convert bullet / numbered lists to spoken transitions
// ---------------------------------------------------------------------------
function listsToSpokenTransitions(text: string): string {
  const lines = text.split('\n');
  const result: string[] = [];
  let bulletBuffer: string[] = [];

  const SPOKEN_CONNECTORS = ['First', 'And also', 'Then', 'Next', 'Finally'];

  function flushBullets() {
    if (bulletBuffer.length === 0) return;
    bulletBuffer.forEach((item, i) => {
      const connector = SPOKEN_CONNECTORS[Math.min(i, SPOKEN_CONNECTORS.length - 1)];
      result.push(`${connector}, ${item.charAt(0).toLowerCase()}${item.slice(1)}.`);
    });
    bulletBuffer = [];
  }

  for (const line of lines) {
    const bulletMatch = line.match(/^\s*[-*+]\s+(.+)/);
    const numberedMatch = line.match(/^\s*\d+[.)]\s+(.+)/);
    if (bulletMatch) {
      bulletBuffer.push(bulletMatch[1].trim());
    } else if (numberedMatch) {
      bulletBuffer.push(numberedMatch[1].trim());
    } else {
      flushBullets();
      if (line.trim()) result.push(line);
    }
  }
  flushBullets();
  return result.join(' ');
}

// ---------------------------------------------------------------------------
// Expand symbols and abbreviations
// ---------------------------------------------------------------------------
function expandSymbols(text: string): string {
  let out = text;
  for (const [pattern, replacement] of SYMBOL_EXPANSIONS) {
    out = out.replace(pattern, replacement);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Split overly long sentences at natural clause boundaries
// ---------------------------------------------------------------------------
function splitLongSentences(text: string): string {
  // Split on sentence-ending punctuation first
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  const result: string[] = [];

  for (const sentence of sentences) {
    const wordCount = sentence.trim().split(/\s+/).length;
    if (wordCount <= 25) {
      result.push(sentence.trim());
      continue;
    }
    // Split at clause boundaries: commas, semicolons, em-dashes, "and", "but", "so", "because"
    const clauses = sentence
      .split(/(?<=[,;—])\s+|(?<=\s)(and|but|so|because|however|although|while|since|when|if)\s+/gi)
      .map(c => c.trim())
      .filter(Boolean);

    if (clauses.length > 1) {
      result.push(...clauses.map(c => {
        // Ensure each clause ends with punctuation
        return /[.!?,;]$/.test(c) ? c : `${c}.`;
      }));
    } else {
      result.push(sentence.trim());
    }
  }

  return result.join(' ');
}

// ---------------------------------------------------------------------------
// Word count helper
// ---------------------------------------------------------------------------
function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

// ---------------------------------------------------------------------------
// Trim to MAX_SPOKEN_WORDS at a sentence boundary
// ---------------------------------------------------------------------------
function trimToMaxWords(text: string, maxWords: number = MAX_SPOKEN_WORDS): string {
  if (wordCount(text) <= maxWords) return text;

  const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
  let accumulated = '';
  for (const sentence of sentences) {
    const candidate = accumulated ? `${accumulated} ${sentence}` : sentence;
    if (wordCount(candidate) > maxWords) break;
    accumulated = candidate;
  }
  // If no sentence fits, hard-truncate at word boundary
  if (!accumulated) {
    const words = text.trim().split(/\s+/);
    accumulated = words.slice(0, maxWords).join(' ') + '…';
  }
  return accumulated.trim();
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Prepare facilitator text for TTS playback.
 *
 * @param rawText  The raw assistant message content (may contain markdown).
 * @param maxWords Override the default 90-word cap (e.g. for summary turns).
 * @returns        A clean, spoken-word-optimised string ready for TTS.
 */
export function prepareFacilitatorSpeechText(
  rawText: string,
  maxWords: number = MAX_SPOKEN_WORDS,
): string {
  if (!rawText || !rawText.trim()) return '';

  let text = rawText;

  // 1. Convert lists before stripping markdown so bullet markers are still present
  text = listsToSpokenTransitions(text);

  // 2. Strip remaining markdown
  text = stripMarkdown(text);

  // 3. Expand symbols and abbreviations
  text = expandSymbols(text);

  // 4. Collapse excessive whitespace / newlines
  text = text.replace(/\n{2,}/g, ' ').replace(/\n/g, ' ').replace(/\s{2,}/g, ' ').trim();

  // 5. Split overly long sentences
  text = splitLongSentences(text);

  // 6. Trim to max word count
  text = trimToMaxWords(text, maxWords);

  return text;
}
