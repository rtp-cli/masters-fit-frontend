import { colors } from "@/lib/theme";

// Define a consistent color palette that rotates
export const COLOR_PALETTE = [
  {
    color: colors.brand.primary,
    bgColor: "bg-brand-light-1",
  },
  {
    color: colors.brand.dark[2],
    bgColor: "bg-neutral-light-2",
  },
  {
    color: "#E53E3E", // Red
    bgColor: "bg-neutral-light-1",
  },
  {
    color: "#FF8C00", // Orange
    bgColor: "bg-brand-light-2",
  },
  {
    color: "#EC4899", // Pink
    bgColor: "bg-brand-light-1",
  },
] as const;

// Function to get color by index with rotation
export const getColorByIndex = (index: number) => {
  return COLOR_PALETTE[index % COLOR_PALETTE.length];
};
