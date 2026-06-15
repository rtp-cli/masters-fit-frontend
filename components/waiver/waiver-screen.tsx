import { ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import WaiverHeader from "@/components/waiver/header";
import MainContent from "@/components/waiver/main-content";
import AgreementCheckbox from "@/components/waiver/agreement-checkbox";
import DocumentLinks from "@/components/waiver/document-links";
import BottomActions from "@/components/waiver/bottom-actions";
import { useWaiverController } from "@/components/waiver/use-waiver-controller";
import { useThemeColors } from "@/lib/theme";
import { CustomDialog } from "@/components/ui";

export default function WaiverScreen() {
  const {
    isAgreed,
    isLoading,
    isUpdate,
    toggleAgree,
    viewDocument,
    handleCancel,
    handleAgree,
    dialogVisible,
    dialogConfig,
    setDialogVisible,
  } = useWaiverController();

  const colors = useThemeColors();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style="dark" />

      {/* Header — back chevron + centered brand lockup */}
      <WaiverHeader onBack={handleCancel} />

      {/* Body — scrollable for safety on smaller devices */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: 16, paddingBottom: 10 }}
        showsVerticalScrollIndicator={false}
      >
        <MainContent isUpdate={isUpdate} />
      </ScrollView>

      {/* Footer — checkbox, links, actions */}
      <View
        style={{
          paddingTop: 12,
          paddingHorizontal: 24,
          paddingBottom: 20,
          borderTopWidth: 1,
          borderTopColor: colors.neutral.medium[1],
          gap: 12,
        }}
      >
        <AgreementCheckbox isAgreed={isAgreed} onToggle={toggleAgree} />
        <DocumentLinks
          onOpenTerms={() => viewDocument("terms")}
          onOpenPrivacy={() => viewDocument("privacy")}
          onOpenWaiver={() => viewDocument("waiver")}
        />
        <BottomActions
          isAgreed={isAgreed}
          isLoading={isLoading}
          onCancel={handleCancel}
          onContinue={handleAgree}
        />
      </View>

      {dialogConfig && (
        <CustomDialog
          visible={dialogVisible}
          onClose={() => setDialogVisible(false)}
          title={dialogConfig.title}
          description={dialogConfig.description}
          primaryButton={dialogConfig.primaryButton}
          secondaryButton={dialogConfig.secondaryButton}
          icon={dialogConfig.icon}
        />
      )}
    </SafeAreaView>
  );
}
