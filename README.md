# Masters Fit Mobile App

A React Native mobile application using Expo and Expo Router for fitness tracking, workout planning, and progress monitoring.

## Features

- Authentication with magic link email
- Personalized user onboarding
- Dashboard with fitness metrics and progress
- Calendar view for workout scheduling
- Exercise search and filtering
- User profile and settings management

## Tech Stack

- React Native
- TypeScript
- Expo SDK
- Expo Router for navigation
- Secure Store for data persistence
- React Native Calendars

## Project Structure

```
mobile-app/
├── app/                   # Expo Router app directory
│   ├── _layout.tsx        # Root layout component
│   ├── index.tsx          # Entry/welcome screen
│   ├── auth.tsx           # Authentication screen
│   ├── onboarding.tsx     # User onboarding screen
│   └── main/              # Main authenticated screens
│       ├── _layout.tsx    # Tab navigation layout
│       ├── dashboard.tsx  # Dashboard screen
│       ├── calendar.tsx   # Calendar/schedule screen
│       ├── search.tsx     # Exercise search screen
│       └── settings.tsx   # User settings screen
├── assets/                # App assets (images, fonts)
├── components/            # Reusable UI components
├── contexts/              # React Context providers
│   └── AuthContext.tsx    # Authentication context
├── hooks/                 # Custom React hooks
│   └── useAuth.ts         # Auth hook
├── lib/                   # Utility libraries
│   ├── api.ts             # API client utilities
│   └── auth.ts            # Authentication utilities
├── utils/                 # Helper functions
├── app.json               # Expo configuration
├── babel.config.js        # Babel configuration
├── package.json           # Project dependencies
└── tsconfig.json          # TypeScript configuration
```

## Getting Started

### Prerequisites

- Node.js (v16 or later)
- Yarn or npm
- Expo CLI (`npm install -g expo-cli`)

### Installation

1. Clone the repository
2. Navigate to the mobile-app directory
3. Install dependencies:

```bash
npm install
# or
yarn install
```

### Running the App

```bash
npm start
# or
yarn start
```

This will start the Expo development server. You can run the app on:

- iOS Simulator (macOS only)
- Android Emulator
- Physical device using Expo Go app (scan QR code)
- Web browser (limited functionality)

## Development Notes

- The app connects to the same backend API as the web version
- API base URL is automatically configured based on development environment
- Authentication uses the same passwordless email link system as the web app
- User data is securely stored using Expo SecureStore
