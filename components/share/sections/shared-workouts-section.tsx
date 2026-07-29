import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, TouchableOpacity, View } from "react-native";

import Text from "@/components/text";
import {
  listShareLinks,
  revokeShareLink,
  type SharedLinkSummary,
} from "@/lib/share";
import { useThemeColors } from "@/lib/theme";

/**
 * Settings row + list for revoking shared workouts (§5.4). A permanent public
 * URL with no way to withdraw it is not shippable, so this lists the caller's
 * links (GET /api/share) with a per-row revoke + confirm.
 */
export default function SharedWorkoutsSection() {
  const colors = useThemeColors();
  const [links, setLinks] = useState<SharedLinkSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const rows = await listShareLinks();
    setLinks(rows);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const confirmRevoke = (link: SharedLinkSummary) => {
    Alert.alert(
      "Revoke this link?",
      `Anyone who opens “${link.workoutName}” will see that it's no longer shared.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Revoke",
          style: "destructive",
          onPress: async () => {
            setRevoking(link.code);
            const ok = await revokeShareLink(link.code);
            setRevoking(null);
            if (ok) {
              setLinks((prev) =>
                prev.map((l) => (l.code === link.code ? { ...l, revoked: true } : l))
              );
            }
          },
        },
      ]
    );
  };

  const active = links.filter((l) => !l.revoked);

  return (
    <View className="mx-6 mb-6 rounded-xl overflow-hidden bg-card">
      <View className="flex-row items-center px-4 py-3">
        <Ionicons name="share-social-outline" size={20} color={colors.text.muted} />
        <Text className="text-sm text-text-primary ml-3 flex-1">Shared workouts</Text>
        <Text className="text-sm text-text-muted">
          {loading ? "" : `${active.length} link${active.length === 1 ? "" : "s"}`}
        </Text>
      </View>

      {loading ? (
        <View className="p-4 border-t border-neutral-light-2">
          <ActivityIndicator color={colors.text.muted} />
        </View>
      ) : links.length === 0 ? (
        <View className="p-4 border-t border-neutral-light-2">
          <Text className="text-sm text-text-muted">
            You haven't shared any workouts yet.
          </Text>
        </View>
      ) : (
        links.map((link) => (
          <View
            key={link.code}
            className="flex-row items-center px-4 py-3 border-t border-neutral-light-2"
          >
            <View className="flex-1 pr-3">
              <Text className="text-sm text-text-primary" numberOfLines={1}>
                {link.workoutName}
              </Text>
              <Text className="text-xs text-text-muted mt-0.5">
                {link.revoked
                  ? "Revoked"
                  : `${link.openCount} open${link.openCount === 1 ? "" : "s"} · ${link.url.replace(/^https?:\/\//, "")}`}
              </Text>
            </View>
            {link.revoked ? (
              <Text className="text-xs text-text-muted">—</Text>
            ) : (
              <TouchableOpacity
                onPress={() => confirmRevoke(link)}
                disabled={revoking === link.code}
                accessibilityRole="button"
                accessibilityLabel={`Revoke ${link.workoutName}`}
                className="items-center justify-center"
                style={{ minHeight: 44, minWidth: 44 }}
              >
                {revoking === link.code ? (
                  <ActivityIndicator color={colors.text.muted} />
                ) : (
                  <Text className="text-sm font-semibold text-danger">Revoke</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        ))
      )}
    </View>
  );
}
