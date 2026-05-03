/**
 * InlineAvatar — Pure SVG avatar with deterministic colour from name.
 *
 * Zero network requests, zero external dependencies.
 * Renders a coloured circle with up to 2 initials, identical to the
 * /api/avatar endpoint on the Railway proxy.
 */
import React from 'react';

const PALETTES = [
  ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#14b8a6'],
  ['#7c3aed', '#db2777', '#d97706', '#059669', '#2563eb', '#dc2626', '#0891b2', '#65a30d'],
  ['#4f46e5', '#9333ea', '#e11d48', '#ca8a04', '#16a34a', '#1d4ed8', '#b91c1c', '#0e7490'],
];

function hashName(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = (Math.imul(31, h) + name.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  if (parts[0]) return parts[0].slice(0, 2).toUpperCase();
  return '?';
}

interface InlineAvatarProps {
  name: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZES = { sm: 28, md: 32, lg: 40 };
const FONT_SIZES = { sm: 11, md: 13, lg: 16 };

const InlineAvatar: React.FC<InlineAvatarProps> = ({ name, size = 'md', className = '' }) => {
  const safeName = name || '?';
  const h = hashName(safeName);
  const palette = PALETTES[h % PALETTES.length];
  const bg = palette[h % palette.length];
  const initials = getInitials(safeName);
  const px = SIZES[size];
  const fs = FONT_SIZES[size];

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${px} ${px}`}
      width={px}
      height={px}
      className={`rounded-full shrink-0 ${className}`}
      aria-label={safeName}
    >
      <rect width={px} height={px} rx={px / 2} fill={bg} />
      <text
        x="50%"
        y="50%"
        dominantBaseline="central"
        textAnchor="middle"
        fontFamily="system-ui, -apple-system, sans-serif"
        fontSize={fs}
        fontWeight="600"
        fill="white"
      >
        {initials}
      </text>
    </svg>
  );
};

export default InlineAvatar;
