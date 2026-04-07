import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function metallicFilterStyle(color: string, active: boolean) {
  let r = 128, g = 128, b = 128;
  if (color?.startsWith('#') && color.length === 7) {
    r = parseInt(color.slice(1, 3), 16);
    g = parseInt(color.slice(3, 5), 16);
    b = parseInt(color.slice(5, 7), 16);
  }
  const luma = 0.299 * r + 0.587 * g + 0.114 * b;
  const activeText = luma > 160 ? "#1a1a1a" : "#ffffff";
  if (active) {
    return {
      background: color,
      borderColor: color,
      color: activeText,
      boxShadow: `0 0 10px ${color}88`,
    };
  }
  return {
    background: `linear-gradient(160deg,
      rgba(${r},${g},${b},0.06) 0%,
      rgba(${r},${g},${b},0.20) 35%,
      rgba(${r},${g},${b},0.34) 50%,
      rgba(${r},${g},${b},0.20) 65%,
      rgba(${r},${g},${b},0.06) 100%)`,
    borderColor: color,
    color,
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.55), 0 1px 3px rgba(0,0,0,0.10)",
  };
}
