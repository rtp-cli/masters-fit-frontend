import React from "react";
import { View, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { SkeletonLoader } from "./skeleton-loader";

// Generic header skeleton
export const HeaderSkeleton = () => (
  <View className="px-5 pt-3 pb-4">
    <SkeletonLoader width={128} height={32} className="mb-2" />
    <SkeletonLoader width={192} height={20} />
  </View>
);

// Card skeleton for workout/calendar items
export const CardSkeleton = () => (
  <View className="bg-white rounded-2xl p-5 shadow-rn-sm mb-4">
    <View className="flex-row items-center justify-between mb-4">
      <SkeletonLoader width={160} height={24} />
      <SkeletonLoader width={80} height={32} />
    </View>
    <SkeletonLoader width="100%" height={80} className="mb-3" />
    <View className="flex-row justify-between">
      <SkeletonLoader width={96} height={48} />
      <SkeletonLoader width={96} height={48} />
      <SkeletonLoader width={96} height={48} />
    </View>
  </View>
);

// List item skeleton
export const ListItemSkeleton = () => (
  <View className="bg-white rounded-lg p-4 mb-3 shadow-rn-sm">
    <View className="flex-row items-center">
      <SkeletonLoader
        width={48}
        height={48}
        variant="circular"
        className="mr-3"
      />
      <View className="flex-1">
        <SkeletonLoader width="80%" height={20} className="mb-2" />
        <SkeletonLoader width="60%" height={16} />
      </View>
      <SkeletonLoader width={24} height={24} />
    </View>
  </View>
);

// Chart skeleton
export const ChartSkeleton = () => (
  <View className="bg-white rounded-2xl p-5 shadow-rn-sm">
    <SkeletonLoader width={144} height={24} className="mb-4" />
    <SkeletonLoader width="100%" height={160} />
  </View>
);

// Calendar skeleton
export const CalendarSkeleton = () => (
  <View className="flex-1 bg-background">
    <SafeAreaView className="flex-1">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        <HeaderSkeleton />

        {/* Calendar Header */}
        <View className="px-5 mb-6">
          <View className="bg-white rounded-2xl p-5 shadow-rn-sm">
            <SkeletonLoader width="100%" height={200} />
          </View>
        </View>

        {/* Workout Items */}
        <View className="px-5">
          <SkeletonLoader width={120} height={24} className="mb-4" />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </View>
      </ScrollView>
    </SafeAreaView>
  </View>
);

// Workout skeleton
export const WorkoutSkeleton = () => (
  <View className="flex-1 bg-background">
    <SafeAreaView className="flex-1">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        <HeaderSkeleton />

        {/* Active Workout */}
        <View className="px-5 mb-6">
          <CardSkeleton />
        </View>

        {/* Exercise List */}
        <View className="px-5">
          <SkeletonLoader width={100} height={24} className="mb-4" />
          <ListItemSkeleton />
          <ListItemSkeleton />
          <ListItemSkeleton />
          <ListItemSkeleton />
        </View>
      </ScrollView>
    </SafeAreaView>
  </View>
);

// Search skeleton
export const SearchSkeleton = () => (
  <View className="flex-1 bg-background">
    <SafeAreaView className="flex-1">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        <HeaderSkeleton />

        {/* Search Bar */}
        <View className="px-5 mb-6">
          <SkeletonLoader width="100%" height={48} />
        </View>

        {/* Search Results */}
        <View className="px-5">
          <SkeletonLoader width={140} height={24} className="mb-4" />
          <ListItemSkeleton />
          <ListItemSkeleton />
          <ListItemSkeleton />
          <ListItemSkeleton />
          <ListItemSkeleton />
        </View>
      </ScrollView>
    </SafeAreaView>
  </View>
);

// Settings skeleton
export const SettingsSkeleton = () => (
  <View className="flex-1 bg-background">
    <SafeAreaView className="flex-1">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        <HeaderSkeleton />

        {/* Profile Section */}
        <View className="px-5 mb-6">
          <View className="bg-white rounded-2xl p-5 shadow-rn-sm">
            <View className="flex-row items-center mb-4">
              <SkeletonLoader
                width={64}
                height={64}
                variant="circular"
                className="mr-4"
              />
              <View className="flex-1">
                <SkeletonLoader width="70%" height={24} className="mb-2" />
                <SkeletonLoader width="50%" height={16} />
              </View>
            </View>
          </View>
        </View>

        {/* Settings Items */}
        <View className="px-5">
          <SkeletonLoader width={80} height={24} className="mb-4" />
          <ListItemSkeleton />
          <ListItemSkeleton />
          <ListItemSkeleton />
          <ListItemSkeleton />
        </View>
      </ScrollView>
    </SafeAreaView>
  </View>
);
