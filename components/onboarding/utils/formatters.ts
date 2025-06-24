// Helper function to format enum values for display
export const formatEnumValue = (value: string): string => {
  // Special cases
  if (value === "HIIT") return "HIIT";
  if (value === "MOBILITY_FLEXIBILITY") return "Mobility & Flexibility";

  return value
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase());
};

// Helper function to convert centimeters to inches
export const convertCmToInches = (cm: number): number => {
  return Math.round(cm / 2.54);
};

// Helper function to convert inches to centimeters
export const convertInchesToCm = (inches: number): number => {
  return Math.round(inches * 2.54);
};

// Helper function to convert centimeters to feet and inches
export const convertCmToFeetInches = (
  cm: number
): { feet: number; inches: number } => {
  const totalInches = cm / 2.54;
  const feet = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches % 12);
  return { feet, inches };
};

// Helper function to format height display
export const formatHeight = (cm: number): string => {
  const { feet, inches } = convertCmToFeetInches(cm);
  return `${feet}'${inches}"`;
};

// Helper function to format height from inches
export const formatHeightFromInches = (totalInches: number): string => {
  const feet = Math.floor(totalInches / 12);
  const inches = totalInches % 12;
  return `${feet}'${inches}"`;
};
