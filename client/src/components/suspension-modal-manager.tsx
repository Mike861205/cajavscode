import { useSuspension } from "@/contexts/suspension-context";
import { SuspensionModal } from "@/components/ui/suspension-modal";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { setSuspensionHandler } from "@/lib/suspension-interceptor";

export function SuspensionModalManager() {
  const { isModalOpen, suspensionMessage, hideSuspensionModal, showSuspensionModal } = useSuspension();
  const [, setLocation] = useLocation();

  // Register the suspension handler for the interceptor
  useEffect(() => {
    setSuspensionHandler((message: string) => {
      showSuspensionModal(message);
    });
  }, [showSuspensionModal]);

  const handleRedirect = () => {
    hideSuspensionModal();
    setLocation("/subscription-plans");
  };

  return (
    <SuspensionModal
      open={isModalOpen}
      message={suspensionMessage}
      onClose={hideSuspensionModal}
      onRedirect={handleRedirect}
    />
  );
}