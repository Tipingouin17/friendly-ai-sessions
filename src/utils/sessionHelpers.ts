const colorPalette = [
  "#FCA5A5", // red
  "#FDBA74", // orange
  "#BEF264", // lime
  "#86EFAC", // green
  "#6EE7B7", // emerald
  "#5EEAD4", // teal
  "#67E8F9", // cyan
  "#7DD3FC", // light blue
];

export const getParticipantColor = (participantName: string) => {
  // Use a hash function to consistently map names to colors
  const hash = participantName.split('').reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc);
  }, 0);
  return colorPalette[Math.abs(hash) % colorPalette.length];
};

// Participant color map keyed by plain numeric string ID (e.g. "1", "2", ...)
export const participantColors: { [key: string]: string } = {
  "1": colorPalette[0],
  "2": colorPalette[1],
  "3": colorPalette[2],
  "4": colorPalette[3],
  "5": colorPalette[4],
  "6": colorPalette[5],
  "7": colorPalette[6],
  "8": colorPalette[7],
};
