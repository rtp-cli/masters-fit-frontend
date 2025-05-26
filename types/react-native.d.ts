// Type declarations for external dependencies in our React Native project

// Required React Native modules
declare module "react-native" {
  export * from "react-native/types";
}

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
  export function getItemAsync(
    key: string,
    options?: any
  ): Promise<string | null>;
  export function setItemAsync(
    key: string,
    value: string,
    options?: any
  ): Promise<void>;
  export function deleteItemAsync(key: string, options?: any): Promise<void>;
}

declare module "react-native-safe-area-context" {
  export const SafeAreaView: React.FC<{
    edges?: ("top" | "right" | "bottom" | "left")[];
    style?: any;
    [key: string]: any;
  }>;
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
