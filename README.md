# Masters Fit Mobile App

A React Native mobile application built with Expo for comprehensive fitness tracking, personalized workout planning, and progress monitoring. Features a modern UI with NativeWind styling and seamless integration with the Masters Fit API.

## Features

- **Passwordless Authentication**: Magic link email authentication system
- **Personalized Onboarding**: Comprehensive user questionnaire for tailored fitness plans
- **Interactive Dashboard**: Real-time fitness metrics, progress charts, and analytics
- **Smart Calendar**: Workout scheduling with visual progress indicators
- **Exercise Search**: Advanced filtering and search through comprehensive exercise database
- **Progress Tracking**: Weight progression, workout consistency, and performance metrics
- **User Profile Management**: Settings, preferences, and profile customization
- **Offline Support**: Local data caching with secure storage

## Tech Stack

- **Framework**: React Native with Expo SDK 53
- **Language**: TypeScript for type safety
- **Navigation**: Expo Router (file-based routing)
- **Styling**: NativeWind (Tailwind CSS for React Native)
- **State Management**: React Context + Custom Hooks
- **Storage**: Expo SecureStore for sensitive data
- **Charts**: React Native Chart Kit with SVG support
- **UI Components**: Custom components with Expo Vector Icons
- **Calendar**: React Native Calendars
- **Development**: Hot reload, TypeScript support

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v16 or later) - [Download here](https://nodejs.org/)
- **yarn** package manager
- **Expo CLI**: `npm install -g @expo/cli`
- **Git** for cloning the repository

### Development Environment Setup

Choose one of the following for testing the app:

**Option 1: Physical Device (Recommended)**

- Install **Expo Go** app from App Store (iOS) or Google Play (Android)
- Ensure device is on the same WiFi network as your development machine

**Option 2: Simulators**

- **iOS**: Xcode with iOS Simulator (macOS only)
- **Android**: Android Studio with Android Emulator

## Getting Started

### 1. Clone and Install

```bash
# Clone the repository
git clone https://github.com/areejfnaqvi/masters-fit-frontend.git
cd masters-fit-frontend

# Install dependencies
yarn install
```

### 2. Environment Configuration

#### Update API Configuration

Edit `config.ts` to point to your backend server:

```typescript
// config.ts
const getApiUrl = (): string => {
  if (__DEV__) {
    // Replace with your development machine's IP address
    return `http://YOUR_IP_ADDRESS:5000/api`;
  }
  return "https://api.masters-fit.com"; // Production URL
};
```

**To find your IP address:**

- **macOS/Linux**: `ifconfig | grep "inet " | grep -v 127.0.0.1`
- **Windows**: `ipconfig | findstr "IPv4"`

#### Example configuration:

```typescript
// If your IP is 192.168.1.100
return `http://192.168.1.100:5000/api`;
```

### 3. Start the Development Server

```bash
yarn start
```

This will start the Expo development server and display a QR code.

### 4. Run the App

#### On Physical Device:

1. Open **Expo Go** app on your phone
2. Scan the QR code displayed in terminal/browser
3. The app will load automatically

#### On iOS Simulator:

```bash
yarn ios
```

#### On Android Emulator:

```bash
yarn android
```

#### On Web Browser (Limited functionality):

```bash
yarn web
```

### 5. Backend Connection

Ensure the backend server is running before using the app:

1. Follow the backend README setup instructions
2. Start the backend server: `npm run dev`
3. Verify it's running at `http://YOUR_IP:5000/docs`

## Available Scripts

| Script             | Description                           |
| ------------------ | ------------------------------------- |
| `yarn start`       | Start Expo development server         |
| `yarn run ios`     | Run on iOS simulator (macOS only)     |
| `yarn run android` | Run on Android emulator               |
| `yarn run web`     | Run in web browser (limited features) |

## Project Structure

```
frontend/
├── app/                        # Expo Router app directory
│   ├── _layout.tsx             # Root layout with authentication check
│   ├── index.tsx               # Welcome/landing screen
│   ├── (auth)/                 # Authentication flow
│   │   ├── login.tsx           # Login screen
│   │   ├── onboarding.tsx      # User onboarding flow
│   │   └── _layout.tsx         # Auth layout
│   └── (tabs)/                 # Main authenticated app
│       ├── _layout.tsx         # Tab navigation layout
│       ├── dashboard.tsx       # Dashboard with metrics
│       ├── calendar.tsx        # Workout calendar
│       ├── workout.tsx         # Active workout screen
│       ├── search.tsx          # Exercise search
│       └── profile.tsx         # User profile
├── components/                 # Reusable UI components
│   ├── ui/                     # Basic UI components
│   │   ├── Button.tsx
│   │   ├── Modal.tsx
│   │   └── Slider.tsx
│   ├── charts/                 # Chart components
│   │   ├── WeightProgressChart.tsx
│   │   ├── WorkoutConsistencyChart.tsx
│   │   └── WorkoutTypeChart.tsx
│   ├── OnboardingForm.tsx      # Multi-step onboarding
│   ├── ExerciseCard.tsx        # Exercise display component
│   └── WorkoutCard.tsx         # Workout display component
├── contexts/                   # React Context providers
│   └── AuthContext.tsx         # Authentication state management
├── hooks/                      # Custom React hooks
│   ├── useAuth.ts              # Authentication logic
│   ├── useDashboard.ts         # Dashboard data management
│   ├── useWorkout.ts           # Workout session management
│   └── useExercises.ts         # Exercise data management
├── lib/                        # Utility libraries
│   ├── api.ts                  # API client with error handling
│   └── auth.ts                 # Authentication utilities
├── utils/                      # Helper functions
│   ├── dateUtils.ts            # Date formatting utilities
│   ├── formatters.ts           # Data formatting functions
│   └── storage.ts              # Secure storage utilities
├── types/                      # TypeScript type definitions
│   ├── api.ts                  # API response types
│   ├── auth.ts                 # Authentication types
│   └── workout.ts              # Workout-related types
├── assets/                     # Static assets
│   ├── images/                 # App images and icons
│   └── fonts/                  # Custom fonts
├── config.ts                   # App configuration
├── tailwind.config.js          # NativeWind configuration
├── babel.config.js             # Babel configuration
├── metro.config.js             # Metro bundler configuration
├── app.json                    # Expo configuration
├── package.json                # Dependencies and scripts
└── tsconfig.json               # TypeScript configuration
```

## Development Guidelines

### Code Style

- Use TypeScript for all components and utilities
- Follow React Native and Expo best practices
- Use NativeWind classes for styling
- Implement proper error handling and loading states
- Use meaningful component and variable names

### State Management

```typescript
// Use React Context for global state
const { user, login, logout } = useAuth();

// Use custom hooks for data fetching
const { exercises, loading, error } = useExercises();

// Use Expo SecureStore for sensitive data
import * as SecureStore from "expo-secure-store";
```

### Styling with NativeWind

```typescript
// Use Tailwind CSS classes
<View className="flex-1 bg-white px-4 py-6">
  <Text className="text-2xl font-bold text-gray-900 mb-4">
    Welcome to Masters Fit
  </Text>
</View>
```

### API Integration

```typescript
// Use the centralized API client
import { apiRequest } from "@/lib/api";

const data = await apiRequest("/workouts", {
  method: "POST",
  body: workoutData,
});
```

## Common Development Tasks

### Adding a New Screen

1. Create file in appropriate `app/` directory
2. Export React component as default
3. Add TypeScript types for props
4. Implement proper navigation

### Adding a New Component

1. Create in `components/` directory
2. Use TypeScript interfaces for props
3. Add NativeWind styling
4. Export with meaningful name

### Managing State

1. Use React Context for global state
2. Create custom hooks for data logic
3. Implement proper loading and error states
4. Use SecureStore for sensitive data

## Troubleshooting

### Common Issues

**1. Metro bundler fails to start**

```bash
# Clear Metro cache
npx expo start --clear

# Reset node modules
rm -rf node_modules
yarn install
```

**2. "Network request failed" errors**

```bash
# Check API configuration in config.ts
# Ensure backend server is running
# Verify IP address is correct
# Check device/simulator is on same network
```

**3. TypeScript errors**

```bash
# Run type checking
npx tsc --noEmit

# Check for missing dependencies
yarn install
```

**4. Unable to connect to backend**

- Verify backend server is running on correct port
- Check `config.ts` has correct IP address
- Ensure firewall isn't blocking connections
- Test API directly: `curl http://YOUR_IP:5000/api/health`

**5. App crashes on device but works in simulator**

- Check device logs in Expo Go app
- Ensure all native dependencies are compatible
- Test on different device/OS version

**6. Styling issues (NativeWind not working)**

```bash
# Ensure NativeWind is properly configured
# Check tailwind.config.js
# Restart development server
npx expo start --clear
```

### Performance Tips

1. **Optimize Images**: Use proper image formats and sizes
2. **Lazy Loading**: Implement lazy loading for lists
3. **Memoization**: Use `React.memo` for expensive components
4. **Bundle Size**: Monitor bundle size with Expo tools
5. **Memory Usage**: Avoid memory leaks in useEffect hooks

### Debugging

#### Using Expo Developer Tools

```bash
# Open developer menu on device
# - iOS: Shake device or Cmd+D in simulator
# - Android: Shake device or Cmd+M in emulator

# Access debugging tools:
# - Element Inspector
# - Performance Monitor
# - Network Inspector
```

## Building for Production

### Development Build

```bash
# Build for development
npx expo build:android
npx expo build:ios
```

### Production Build

```bash
# Build for app stores
expo build:android --type app-bundle
expo build:ios --type archive
```

## Testing

### Manual Testing Checklist

- [ ] Authentication flow works end-to-end
- [ ] All navigation routes function correctly
- [ ] API calls handle errors gracefully
- [ ] Offline functionality works as expected
- [ ] Charts and visualizations render correctly
- [ ] Form submissions work and validate properly

### Device Testing

- Test on both iOS and Android devices
- Test different screen sizes and orientations
- Verify performance on older devices
- Test network connectivity issues

## Deployment

### Expo Application Services (EAS)

```bash
# Install EAS CLI
yarn install -g @expo/eas-cli

# Configure EAS
eas build:configure

# Build for app stores
eas build --platform all
```

### App Store Deployment

1. Build production version with EAS
2. Submit to App Store Connect (iOS) or Google Play Console (Android)
3. Follow platform-specific review guidelines
4. Monitor app performance and crashes

## Contributing

1. Follow the existing code style and patterns
2. Add TypeScript types for all new features
3. Test on multiple devices and platforms
4. Update documentation for new features
5. Submit pull requests with clear descriptions

## Support

For support, please:

1. Check this README and troubleshooting section
2. Review the Expo documentation
3. Test API endpoints directly
4. Open an issue in the repository
5. Contact the development team

---

## License

This project is proprietary software. All rights reserved.
