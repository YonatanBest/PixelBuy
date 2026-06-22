import { useWindowDimensions } from "react-native";

export const COLORS = {
  bg: "#1a1a1a",
  surface: "#121212",
  surfaceAlt: "#2a2a2a",
  card: "rgba(255,255,255,0.04)",
  cardStrong: "rgba(255,255,255,0.07)",
  border: "rgba(255,255,255,0.1)",
  borderStrong: "rgba(52,152,219,0.45)",
  text: "#ffffff",
  textMuted: "#bdbdbd",
  textSoft: "#8f9aa3",
  accent: "#3498db",
  accentDark: "#1f77b4",
  danger: "#ff4d4d",
  gold: "#f7b733",
  success: "#22c55e",
};

export function useAppMetrics() {
  const { width, height } = useWindowDimensions();
  const compact = width < 390;
  const tablet = width >= 700;

  return {
    width,
    height,
    compact,
    tablet,
    pagePadding: tablet ? 24 : compact ? 14 : 16,
    sectionGap: tablet ? 18 : 14,
    cardRadius: tablet ? 24 : 18,
    heroRadius: tablet ? 28 : 22,
    headerHeight: compact ? 62 : 68,
    titleSize: tablet ? 36 : compact ? 28 : 32,
    heroTitleSize: tablet ? 44 : compact ? 30 : 36,
    subtitleSize: compact ? 13 : 14,
    bodySize: compact ? 13 : 14,
    chipSize: compact ? 11 : 12,
    imageHeight: tablet ? 240 : compact ? 160 : 190,
    detailImageHeight: tablet ? 360 : compact ? 240 : 280,
    inputHeight: compact ? 46 : 50,
    buttonHeight: compact ? 46 : 50,
    navSize: compact ? 34 : 38,
  };
}