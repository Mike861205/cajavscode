import { createContext, useContext, useState } from "react";

interface SuspensionContextType {
  isModalOpen: boolean;
  suspensionMessage: string;
  showSuspensionModal: (message: string) => void;
  hideSuspensionModal: () => void;
}

const SuspensionContext = createContext<SuspensionContextType | undefined>(undefined);

export function SuspensionProvider({ children }: { children: React.ReactNode }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [suspensionMessage, setSuspensionMessage] = useState("");

  const showSuspensionModal = (message: string) => {
    setSuspensionMessage(message);
    setIsModalOpen(true);
  };

  const hideSuspensionModal = () => {
    setIsModalOpen(false);
    setSuspensionMessage("");
  };

  return (
    <SuspensionContext.Provider value={{
      isModalOpen,
      suspensionMessage,
      showSuspensionModal,
      hideSuspensionModal
    }}>
      {children}
    </SuspensionContext.Provider>
  );
}

export function useSuspension() {
  const context = useContext(SuspensionContext);
  if (context === undefined) {
    throw new Error("useSuspension must be used within a SuspensionProvider");
  }
  return context;
}