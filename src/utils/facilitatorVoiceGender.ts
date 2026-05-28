export type FacilitatorVoiceGender = 'female' | 'male';

interface FacilitatorVoiceGenderInput {
  title?: string | null;
  details?: string | null;
  description?: string | null;
  profilePicture?: string | null;
}

const FEMININE_PATTERNS = [
  /\bfemale\b/i,
  /\bfeminine\b/i,
  /\bwoman\b/i,
  /\bwomen\b/i,
  /\bshe\s*\/\s*her\b/i,
  /\bher\s*\/\s*hers\b/i,
  /\bms\.?\b/i,
  /\bmrs\.?\b/i,
  /\bmadam\b/i,
  /\blady\b/i,
];

const MASCULINE_PATTERNS = [
  /\bmale\b/i,
  /\bmasculine\b/i,
  /\bman\b/i,
  /\bmen\b/i,
  /\bhe\s*\/\s*him\b/i,
  /\bhim\s*\/\s*his\b/i,
  /\bmr\.?\b/i,
  /\bsir\b/i,
  /\bgentleman\b/i,
];

const FEMININE_NAME_HINTS = new Set([
  'aaliyah', 'abigail', 'ada', 'adriana', 'aiyana', 'alice', 'alisha', 'amelia', 'amina', 'amy', 'ana', 'andrea', 'angela', 'anna', 'aria', 'ava', 'bella', 'camila', 'carla', 'carmen', 'charlotte', 'chloe', 'claire', 'diana', 'emma', 'emily', 'eva', 'fatima', 'fiona', 'grace', 'hannah', 'isabella', 'jane', 'jenny', 'jessica', 'julia', 'kate', 'laura', 'lena', 'lily', 'lisa', 'lucia', 'maria', 'maya', 'mia', 'natalie', 'nora', 'olivia', 'rachel', 'samantha', 'sara', 'sarah', 'serena', 'sofia', 'sonia', 'sophia', 'sophie', 'victoria', 'zoe'
]);

const MASCULINE_NAME_HINTS = new Set([
  'adam', 'adrian', 'ahmed', 'alexander', 'andrew', 'anthony', 'ben', 'benjamin', 'brian', 'carlos', 'charles', 'christopher', 'daniel', 'david', 'diego', 'edward', 'ethan', 'felix', 'george', 'henry', 'jack', 'jacob', 'james', 'john', 'jose', 'liam', 'lucas', 'luke', 'mark', 'matthew', 'michael', 'mohamed', 'muhammad', 'nathan', 'nicholas', 'noah', 'oliver', 'oscar', 'paul', 'peter', 'ryan', 'samuel', 'sebastian', 'thomas', 'tom', 'william'
]);

const normalizeTokens = (value: string): string[] => {
  return value
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/[_./?#=&-]+/g, ' ')
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);
};

const scorePatterns = (source: string, patterns: RegExp[]): number => {
  return patterns.reduce((score, pattern) => pattern.test(source) ? score + 4 : score, 0);
};

const scoreNameHints = (source: string, hints: Set<string>): number => {
  const [firstToken] = normalizeTokens(source);
  if (!firstToken) return 0;
  return hints.has(firstToken) ? 2 : 0;
};

/**
 * Infers the intended browser TTS voice family from the facilitator avatar/profile metadata.
 *
 * The current facilitator schema does not expose a dedicated avatar-gender column, so this
 * deliberately uses conservative hints from text and image filenames. If no reliable signal
 * exists, the caller should keep the previous neutral/default voice-selection behavior.
 */
export const inferFacilitatorVoiceGender = ({
  title,
  details,
  description,
  profilePicture,
}: FacilitatorVoiceGenderInput): FacilitatorVoiceGender | null => {
  const profilePictureText = profilePicture ? decodeURIComponent(profilePicture) : '';
  const combinedText = [title, details, description, profilePictureText]
    .filter((value): value is string => Boolean(value && value.trim()))
    .join(' ');

  if (!combinedText.trim()) return null;

  const feminineScore = scorePatterns(combinedText, FEMININE_PATTERNS)
    + scoreNameHints(title ?? '', FEMININE_NAME_HINTS)
    + scoreNameHints(profilePictureText, FEMININE_NAME_HINTS);
  const masculineScore = scorePatterns(combinedText, MASCULINE_PATTERNS)
    + scoreNameHints(title ?? '', MASCULINE_NAME_HINTS)
    + scoreNameHints(profilePictureText, MASCULINE_NAME_HINTS);

  if (feminineScore === masculineScore) return null;
  return feminineScore > masculineScore ? 'female' : 'male';
};
