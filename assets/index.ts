// Centralized asset exports to prevent image loading conflicts
// Use absolute imports from this file across the entire app

export const images = {
  // App branding
  icon: require('./icon.png'),
  logo: require('./logo.png'),
  logoDark: require('./logo-dark.png'),
  splash: require('./splash.png'),
  
  // UI images
  home: require('./home.png'),
  gymGeneric: require('./gym-generic.jpg'),
} as const;

// Type-safe image keys
export type ImageKey = keyof typeof images;

// Helper function to get image source with validation
export const getImageSource = (key: ImageKey) => {
  const source = images[key];
  if (!source) {
    console.warn(`Image asset '${key}' not found`);
  }
  return source;
};