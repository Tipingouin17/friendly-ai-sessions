export const MAX_REASONABLE_SESSION_DURATION_MINUTES = 24 * 60;

export const coerceIsoDate = (value?: string | null): Date | null => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const calculateCanonicalSessionDurationMinutes = ({
  startedAt,
  createdAt,
  endedAt,
  maxMinutes = MAX_REASONABLE_SESSION_DURATION_MINUTES,
}: {
  startedAt?: string | null;
  createdAt?: string | null;
  endedAt?: string | null;
  maxMinutes?: number;
}): number => {
  const endDate = coerceIsoDate(endedAt) ?? new Date();
  const startDate = coerceIsoDate(startedAt) ?? coerceIsoDate(createdAt);

  if (!startDate) return 0;

  const diffMinutes = Math.round((endDate.getTime() - startDate.getTime()) / 60_000);
  if (!Number.isFinite(diffMinutes) || diffMinutes <= 0) return 1;
  if (diffMinutes > maxMinutes) return 0;
  return diffMinutes;
};

export const calculateEngagementScore = ({
  uniqueRespondents,
  participantCount,
}: {
  uniqueRespondents: number;
  participantCount: number;
}): number => {
  if (!Number.isFinite(uniqueRespondents) || !Number.isFinite(participantCount) || participantCount <= 0) {
    return 0;
  }

  return Math.min(1, Math.max(0, Math.round((uniqueRespondents / participantCount) * 100) / 100));
};
