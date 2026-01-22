export const RANKS = [2, 4, 8, 16, 32];

export const CHECKPOINTS = {
  Tiny: "tiny",
  Small: "small",
  "Base+": "base_plus",
  Large: "large",
};

export const DATASETS = {
  LWAM: "MAZAK",
  "ir Polymer": "irPOLYMER",
  "vis Polymer": "visPOLYMER",
  TIG: "TIG",
};

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
