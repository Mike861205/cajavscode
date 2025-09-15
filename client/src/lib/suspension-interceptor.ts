// Global suspension handler that can be accessed outside of React components
let suspensionHandler: ((message: string) => void) | null = null;

export const setSuspensionHandler = (handler: (message: string) => void) => {
  suspensionHandler = handler;
};

export const handleSuspension = (message: string) => {
  if (suspensionHandler) {
    suspensionHandler(message);
  } else {
    // Fallback to alert if modal system is not available
    alert(message);
    window.location.href = "/subscription-plans";
  }
};