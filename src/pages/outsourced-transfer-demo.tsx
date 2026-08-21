import { useState } from "react";
import { FloatingAlert, type FloatingAlertInput } from "../components/ui/floating-alert";
import { OutsourcedTransferSuggestionsPage } from "./outsourced-transfer-suggestions";
import { OutsourcedTransferSuggestionDetailPage } from "./outsourced-transfer-suggestion-detail";
import {
  type TransferSuggestion,
} from "../data/outsourced-transfer-suggestions";

export function OutsourcedTransferDemo() {
  const [currentView, setCurrentView] = useState<"list" | "detail">("list");
  const [selectedSuggestion, setSelectedSuggestion] = useState<TransferSuggestion | null>(null);
  const [alert, setAlert] = useState<FloatingAlertInput | null>(null);

  function handleViewDetail(suggestion: TransferSuggestion) {
    setSelectedSuggestion(suggestion);
    setCurrentView("detail");
  }

  function handleBackToList() {
    setCurrentView("list");
    setSelectedSuggestion(null);
  }

  function handleShowAlert(input: FloatingAlertInput) {
    setAlert(input);
    setTimeout(() => setAlert(null), 3000);
  }

  return (
    <div>
      <FloatingAlert notice={alert} />
      {currentView === "list" && (
        <OutsourcedTransferSuggestionsPage
          onViewDetail={handleViewDetail}
          onShowAlert={handleShowAlert}
        />
      )}
      {currentView === "detail" && selectedSuggestion && (
        <OutsourcedTransferSuggestionDetailPage
          suggestion={selectedSuggestion}
          onBack={handleBackToList}
          onShowAlert={handleShowAlert}
        />
      )}
    </div>
  );
}
