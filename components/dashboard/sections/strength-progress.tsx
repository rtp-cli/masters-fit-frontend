import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { LineChart } from "@/components/charts/line-chart";
import { colors } from "../../../lib/theme";

type StrengthProgressItem = {
  date: string;
  avgWeight: number;
  maxWeight: number;
  label: string;
};

type StrengthProgressSectionProps = {
  data: StrengthProgressItem[];
  filter: "1W" | "1M" | "3M";
  onChangeFilter: (filter: "1W" | "1M" | "3M") => void;
};

const StrengthProgressSection: React.FC<StrengthProgressSectionProps> = ({ data, filter, onChangeFilter }) => {
  if (!data || data.length === 0) return null;

  const latestAvg = data.length > 0 ? Math.round(data[data.length - 1]?.avgWeight || 0) : 0;
  const peakWeight = data.length > 0 ? Math.max(...data.map((d) => d.maxWeight)) : 0;
  const growth = (() => {
    if (data.length < 2) return 0;
    const first = data[0].avgWeight;
    const last = data[data.length - 1].avgWeight;
    return first > 0 ? ((last - first) / first) * 100 : 0;
  })();

  return (
    <View className="px-4 mb-6">
      <View className="px-4">
        <Text className="text-base font-semibold text-text-primary mb-1">Strength Progress</Text>
        <Text className="text-xs text-text-muted mb-3">
          Your weight progression over time ({filter === "3M" ? "Last 3 months" : filter === "1M" ? "Last 1 month" : "Last 1 week"})
        </Text>
      </View>

      <View className="items-center mb-4">
        <View className="flex-row bg-neutral-light-2 rounded-lg p-1">
          {["1W", "1M", "3M"].map((f) => (
            <TouchableOpacity
              key={f}
              className={`px-3 py-1 rounded-md ${filter === f ? "bg-primary" : "bg-transparent"}`}
              onPress={() => onChangeFilter(f as any)}
            >
              <Text className={`text-xs font-medium ${filter === f ? "text-text-primary" : "text-text-muted"}`}>{f}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View className="bg-white rounded-2xl p-4">
        <View className="mb-4">
          <LineChart
            data={data.map((item, index) => {
              let displayLabel = "";
              const totalPoints = data.length;
              if (totalPoints <= 3) {
                displayLabel = item.label;
              } else if (totalPoints <= 7) {
                if (index === 0 || index === Math.floor(totalPoints / 2) || index === totalPoints - 1) {
                  displayLabel = item.label;
                }
              } else {
                if (
                  index === 0 ||
                  index === Math.floor(totalPoints / 4) ||
                  index === Math.floor(totalPoints / 2) ||
                  index === Math.floor((3 * totalPoints) / 4) ||
                  index === totalPoints - 1
                ) {
                  displayLabel = item.label;
                }
              }
              return { label: displayLabel, value: item.avgWeight, date: item.date };
            })}
            height={200}
            color={colors.brand.dark[1]}
            showValues={true}
            showLabels={true}
          />
        </View>

        <View className="flex-row justify-around pt-4 border-t border-neutral-light-2">
          <View className="items-center">
            <Text className="text-base font-bold text-text-primary">{latestAvg} lbs</Text>
            <Text className="text-xs text-text-muted">Latest Avg</Text>
          </View>
          <View className="items-center">
            <Text className="text-base font-bold text-accent">{peakWeight} lbs</Text>
            <Text className="text-xs text-text-muted">Peak Weight</Text>
          </View>
          <View className="items-center">
            <Text className="text-base font-bold text-primary">{`${growth > 0 ? "+" : ""}${Math.round(growth)}%`}</Text>
            <Text className="text-xs text-text-muted">Growth</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

export default StrengthProgressSection;