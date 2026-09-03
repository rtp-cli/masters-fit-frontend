// Type declarations for external dependencies in our React Native project

// Expo modules
declare module "expo-status-bar" {
  export interface StatusBarProps {
    style?: "auto" | "inverted" | "light" | "dark";
    backgroundColor?: string;
    translucent?: boolean;
    hidden?: boolean;
  }

  export const StatusBar: React.FC<StatusBarProps>;
  export const StatusBarManager: {
    defaultProps: {
      animated: boolean;
    };
  };
}

declare module "expo-router" {
  export interface RouterProps {}

  export function useRouter(): {
    replace: (route: string) => void;
    push: (route: string) => void;
    back: () => void;
  };

  export function usePathname(): string;
  export function useSegments(): string[];
  export function useLocalSearchParams<T = any>(): T;

  export const Link: React.FC<{
    href: string;
    asChild?: boolean;
    [key: string]: any;
  }>;

  export const Redirect: React.FC<{
    href: string;
  }>;

  export const Stack: {
    Screen: React.FC<{
      name: string;
      options?: any;
      [key: string]: any;
    }>;
  } & React.FC<{
    screenOptions?: any;
    [key: string]: any;
  }>;

  export const Tabs: {
    Screen: React.FC<{
      name: string;
      options?: any;
      [key: string]: any;
    }>;
  } & React.FC<{
    screenOptions?: any;
    [key: string]: any;
  }>;
}

declare module "expo-secure-store" {
  export type KeychainAccessibilityConstant = number;
  // Keychain accessibility levels (iOS; ignored on Android). Mirrors the real
  // exports in expo-secure-store/build/SecureStore.d.ts, which this local
  // override otherwise shadows.
  export const AFTER_FIRST_UNLOCK: KeychainAccessibilityConstant;
  export const AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: KeychainAccessibilityConstant;
  export const WHEN_UNLOCKED: KeychainAccessibilityConstant;
  export const WHEN_UNLOCKED_THIS_DEVICE_ONLY: KeychainAccessibilityConstant;
  export type SecureStoreOptions = {
    keychainService?: string;
    keychainAccessible?: KeychainAccessibilityConstant;
    requireAuthentication?: boolean;
    authenticationPrompt?: string;
  };
  export function getItemAsync(
    key: string,
    options?: SecureStoreOptions
  ): Promise<string | null>;
  export function setItemAsync(
    key: string,
    value: string,
    options?: SecureStoreOptions
  ): Promise<void>;
  export function deleteItemAsync(
    key: string,
    options?: SecureStoreOptions
  ): Promise<void>;
}

declare module "react-native-calendars" {
  export interface DateData {
    year: number;
    month: number;
    day: number;
    timestamp: number;
    dateString: string;
  }

  export interface CalendarProps {
    current?: string;
    markedDates?: any;
    onDayPress?: (date: DateData) => void;
    theme?: any;
    [key: string]: any;
  }

  export const Calendar: React.FC<CalendarProps>;
}
