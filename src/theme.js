export const colors = {
  wood: "#241812",
  woodDeep: "#140E0B",
  paper: "#F3EEE6",
  paperRaised: "#FBF7F1",
  ink: "#241C17",
  inkSoft: "#6E6258",
  rule: "#E3D9CC",
  rust: "#B8432F",
  rustDeep: "#8E3122",
  gold: "#9C7840",
  moss: "#2F6A4A",
  mossDeep: "#214D36",
  white: "#FFFCF8",
};

export const palette = [
  "#8C3A2F",
  "#2F5D50",
  "#3E4C7A",
  "#A15C07",
  "#6B3FA0",
  "#1F6F78",
  "#8A4B2F",
  "#4E5B2F",
  "#7A3145",
  "#3F4F3A",
  "#5C4A32",
  "#245E78",
];

export const fonts = {
  display: "Fraunces_700Bold",
  displayItalic: "Fraunces_700Bold_Italic",
  body: "Figtree_400Regular",
  medium: "Figtree_500Medium",
  semibold: "Figtree_600SemiBold",
  bold: "Figtree_700Bold",
};

export function colorForSeat(seat) {
  const index = Number.isFinite(seat) && seat >= 0 ? seat : 0;
  return palette[index % palette.length];
}

export function initials(name) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export function wash(hex) {
  return `${hex}22`;
}
