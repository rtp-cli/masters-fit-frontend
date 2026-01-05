import { ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import WaiverHeader from "@/components/waiver/header";
import MainContent from "@/components/waiver/main-content";
import AgreementCheckbox from "@/components/waiver/agreement-checkbox";
import DocumentLinks from "@/components/waiver/document-links";
import BottomActions from "@/components/waiver/bottom-actions";
import { useWaiverController } from "@/components/waiver/use-waiver-controller";
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

  return (
    <SafeAreaView className="flex-1 bg-background">
      <StatusBar style="dark" />
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <WaiverHeader onClose={handleCancel} />
        <MainContent isUpdate={isUpdate} />
        <AgreementCheckbox isAgreed={isAgreed} onToggle={toggleAgree} />
        <DocumentLinks
          onOpenTerms={() => viewDocument("terms")}
          onOpenPrivacy={() => viewDocument("privacy")}
          onOpenWaiver={() => viewDocument("waiver")}
        />
      </ScrollView>

      <BottomActions
        isAgreed={isAgreed}
        isLoading={isLoading}
        onCancel={handleCancel}
        onContinue={handleAgree}
      />

      {/* Custom Dialog */}
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
