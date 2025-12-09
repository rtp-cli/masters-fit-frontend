import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Linking,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useEffect, useState, useRef } from "react";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/lib/theme";
import { images } from "@/assets";

// Import legal documents
import {
  waiverDocument,
  termsDocument,
  privacyDocument,
} from "@/lib/legalDocuments";

interface MarkdownSection {
  type: "heading2" | "heading3" | "paragraph" | "list";
  content: string;
  items?: string[];
}

interface DocumentData {
  title: string;
  effectiveDate: string;
  lastUpdated: string;
  disclaimer: string;
  sections: MarkdownSection[];
}

interface GroupedSection {
  heading: string;
  content: MarkdownSection[];
}

export default function LegalDocumentScreen() {
  const router = useRouter();
  const { type } = useLocalSearchParams<{ type: string }>();
  const [documentData, setDocumentData] = useState<DocumentData | null>(null);
  const [groupedSections, setGroupedSections] = useState<GroupedSection[]>([]);
  const scrollViewRef = useRef<ScrollView>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);

  // Parse bold text within a string
  const parseBoldText = (text: string) => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        const boldText = part.slice(2, -2);
        return (
          <Text key={index} className="font-bold text-text-primary">
            {boldText}
          </Text>
        );
      }
      return <Text key={index}>{part}</Text>;
    });
  };

  // Parse markdown content into sections
  const parseMarkdownContent = (content: string): MarkdownSection[] => {
    const lines = content.split("\n");
    const parsed: MarkdownSection[] = [];
    let currentList: string[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Skip empty lines
      if (!line) {
        if (currentList.length > 0) {
          parsed.push({ type: "list", content: "", items: currentList });
          currentList = [];
        }
        continue;
      }

      // Headers
      if (line.startsWith("### ")) {
        if (currentList.length > 0) {
          parsed.push({ type: "list", content: "", items: currentList });
          currentList = [];
        }
        parsed.push({ type: "heading3", content: line.substring(4) });
      } else if (line.startsWith("## ")) {
        if (currentList.length > 0) {
          parsed.push({ type: "list", content: "", items: currentList });
          currentList = [];
        }
        parsed.push({ type: "heading2", content: line.substring(3) });
      }
      // List items
      else if (line.startsWith("- ")) {
        currentList.push(line.substring(2));
      }
      // Sub-list items (indented)
      else if (line.startsWith("  - ")) {
        currentList.push("  • " + line.substring(4));
      }
      // Regular paragraphs
      else {
        if (currentList.length > 0) {
          parsed.push({ type: "list", content: "", items: currentList });
          currentList = [];
        }
        parsed.push({ type: "paragraph", content: line });
      }
    }

    // Add any remaining list items
    if (currentList.length > 0) {
      parsed.push({ type: "list", content: "", items: currentList });
    }

    return parsed;
  };

  // Group sections by H2 headings
  const groupSectionsByHeading = (
    sections: MarkdownSection[]
  ): GroupedSection[] => {
    const grouped: GroupedSection[] = [];
    let currentGroup: GroupedSection | null = null;

    sections.forEach((section) => {
      if (section.type === "heading2") {
        if (currentGroup) {
          grouped.push(currentGroup);
        }
        currentGroup = {
          heading: section.content,
          content: [],
        };
      } else if (currentGroup) {
        currentGroup.content.push(section);
      }
    });

    if (currentGroup) {
      grouped.push(currentGroup);
    }

    return grouped;
  };

  useEffect(() => {
    let document;

    switch (type) {
      case "waiver":
        document = waiverDocument;
        break;
      case "terms":
        document = termsDocument;
        break;
      case "privacy":
        document = privacyDocument;
        break;
      default:
        return;
    }

    const sections = parseMarkdownContent(document.content);
    const grouped = groupSectionsByHeading(sections);

    setDocumentData({
      title: document.title,
      effectiveDate: document.effectiveDate,
      lastUpdated: document.lastUpdated,
      disclaimer: document.disclaimer,
      sections: sections,
    });
    setGroupedSections(grouped);
  }, [type]);

  const renderSection = (section: MarkdownSection, index: number) => {
    switch (section.type) {
      case "heading3":
        return (
          <View key={index} className="mb-4 mt-6">
            <Text className="text-lg font-bold text-text-primary mb-1">
              {section.content}
            </Text>
            <View className="h-0.5 w-12 bg-brand-primary opacity-50 mt-1" />
          </View>
        );
      case "list":
        return (
          <View key={index} className="mb-6">
            {section.items?.map((item, itemIndex) => {
              const isSubItem = item.startsWith("  •");
              return (
                <View
                  key={itemIndex}
                  className={`flex-row mb-3 ${isSubItem ? "ml-6" : ""}`}
                >
                  <Text className="text-base text-text-primary mt-1.5">
                    {isSubItem ? "◦" : "•"}
                  </Text>
                  <View className="flex-1 ml-3">
                    <Text className="text-base text-text-primary leading-7">
                      {parseBoldText(
                        isSubItem ? item.substring(3).trim() : item
                      )}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        );
      case "paragraph":
        return (
          <Text
            key={index}
            className="text-base text-text-secondary mb-4 leading-7"
          >
            {parseBoldText(section.content)}
          </Text>
        );
      default:
        return null;
    }
  };

  const scrollToTop = () => {
    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
  };

  const handleScroll = (event: any) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    setShowScrollTop(offsetY > 500);
  };

  if (!documentData) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 justify-center items-center">
          <Text className="text-base text-neutral-medium-4">Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Calculate reading time (approx 200 words per minute)
  const wordCount = documentData.sections.reduce((acc, section) => {
    if (section.type === "paragraph")
      return acc + section.content.split(" ").length;
    if (section.type === "list" && section.items) {
      return acc + section.items.join(" ").split(" ").length;
    }
    return acc;
  }, 0);
  const readingTime = Math.ceil(wordCount / 200);

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar style="light" />

      {/* Header */}
      <View className="bg-white">
        <View className="px-5 py-4">
          <View className="flex-row items-center">
            <TouchableOpacity
              onPress={() => router.back()}
              className="p-1 -ml-1"
            >
              <Ionicons
                name="arrow-back"
                size={24}
                color={colors.text.primary}
              />
            </TouchableOpacity>
            <View className="ml-4 flex-1">
              <Text className="text-sm text-text-muted">Legal Document</Text>
              <Text
                className="text-base font-semibold text-text-primary"
                numberOfLines={1}
              >
                {documentData.title}
              </Text>
            </View>
            <Image
              source={images.logo}
              className="w-8 h-8"
              resizeMode="contain"
            />
          </View>
        </View>
      </View>

      {/* Document Content */}
      <ScrollView
        ref={scrollViewRef}
        className="flex-1"
        onScroll={handleScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
      >
        {/* Colored Header Section */}
        <View style={{ backgroundColor: colors.brand.primary }}>
          <View className="px-6 pt-8 pb-6">
            <View className="flex-row items-center mb-4">
              <Image
                source={images.logo}
                className="w-10 h-10 mr-3"
                resizeMode="contain"
                style={{ tintColor: "white" }}
              />
              <Text className="text-3xl font-bold text-white flex-1">
                {documentData.title.replace("MastersFit LLC – ", "")}
              </Text>
            </View>
            <View className="flex-row items-center mb-2">
              <Ionicons name="calendar-outline" size={16} color="white" />
              <Text className="text-sm text-white ml-2 opacity-95">
                Effective: {documentData.effectiveDate}
              </Text>
            </View>
            <View className="flex-row items-center">
              <Ionicons name="refresh-outline" size={16} color="white" />
              <Text className="text-sm text-white ml-2 opacity-95">
                Updated: {documentData.lastUpdated}
              </Text>
            </View>
          </View>
        </View>

        {/* Main Content */}
        <View className="px-5 py-6 bg-white">
          {/* Disclaimer Section */}
          {documentData.disclaimer && (
            <View className="mb-8">
              <View
                className="rounded-xl p-5 border border-brand-primary border-opacity-20"
                style={{ backgroundColor: colors.brand.light[1] }}
              >
                <View className="flex-row items-start">
                  <View className="mr-3 mt-0.5">
                    <Ionicons
                      name="information-circle"
                      size={24}
                      color={colors.brand.dark[1]}
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-semibold text-text-primary mb-2 uppercase tracking-wider">
                      Important Notice
                    </Text>
                    <Text className="text-base text-text-primary leading-7">
                      {parseBoldText(documentData.disclaimer)}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* Document Sections */}
          <View className="bg-white rounded-xl px-6 py-6">
            {groupedSections.map((group, groupIndex) => (
              <View key={groupIndex} className={groupIndex > 0 ? "mt-8" : ""}>
                {/* Section Header */}
                <Text className="text-xl font-bold text-text-primary mb-4">
                  {group.heading}
                </Text>

                {/* Section Content */}
                {group.content.map((section, index) =>
                  renderSection(section, index)
                )}
              </View>
            ))}
          </View>

          {/* Contact Footer */}
          <View className="mt-8 mb-6">
            <View className="bg-white rounded-xl p-5 border border-neutral-light-2">
              <View className="flex-row items-center justify-between">
                <View className="flex-1">
                  <Text className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">
                    Have Questions?
                  </Text>
                  <Text className="text-base font-bold text-text-primary">
                    MastersFit LLC
                  </Text>
                  <Text className="text-sm text-text-secondary mt-1">
                    1023 East Lincolnway
                  </Text>
                  <Text className="text-sm text-text-secondary">
                    Cheyenne, WY 82001
                  </Text>
                </View>
                <TouchableOpacity
                  className="ml-4"
                  onPress={() => Linking.openURL("mailto:legal@mastersfit.ai")}
                >
                  <View
                    className="w-12 h-12 rounded-full items-center justify-center"
                    style={{ backgroundColor: colors.brand.primary }}
                  >
                    <Ionicons name="mail" size={20} color="white" />
                  </View>
                </TouchableOpacity>
              </View>
              <View className="mt-3 pt-3 border-t border-neutral-light-2">
                <Text className="text-sm text-brand-primary font-medium">
                  legal@mastersfit.ai
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Scroll to Top Button */}
      {showScrollTop && (
        <TouchableOpacity
          onPress={scrollToTop}
          className="absolute bottom-6 right-6"
          style={{
            backgroundColor: colors.brand.primary,
            width: 48,
            height: 48,
            borderRadius: 24,
            justifyContent: "center",
            alignItems: "center",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 4,
            elevation: 5,
          }}
        >
          <Ionicons name="arrow-up" size={24} color="white" />
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}
