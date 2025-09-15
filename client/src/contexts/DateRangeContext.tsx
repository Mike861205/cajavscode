import { createContext, useContext, useState, ReactNode } from 'react';
import { createDateRangeWithTimezone } from '@/lib/timezone';
import { useSettings } from './SettingsContext';

interface DateRangeContextType {
  dateRangeType: "today" | "week" | "month" | "custom";
  startDate: string;
  endDate: string;
  setDateRange: (type: "today" | "week" | "month" | "custom", start?: string, end?: string) => void;
  isCustomRange: boolean;
  getTimezoneAwareDates: () => { startDate: string; endDate: string };
}

const DateRangeContext = createContext<DateRangeContextType | undefined>(undefined);

interface DateRangeProviderProps {
  children: ReactNode;
}

export function DateRangeProvider({ children }: DateRangeProviderProps) {
  const [dateRangeType, setDateRangeType] = useState<"today" | "week" | "month" | "custom">("today");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const { settings } = useSettings();

  const setDateRange = (type: "today" | "week" | "month" | "custom", start?: string, end?: string) => {
    setDateRangeType(type);
    if (type === "custom" && start && end) {
      setStartDate(start);
      setEndDate(end);
    } else {
      setStartDate("");
      setEndDate("");
    }
  };

  const getTimezoneAwareDates = () => {
    if (!settings) {
      // Fallback to UTC behavior
      const now = new Date();
      return {
        startDate: now.toISOString(),
        endDate: now.toISOString()
      };
    }

    const timezone = settings.timezone || 'UTC';
    
    try {
      return createDateRangeWithTimezone(
        dateRangeType,
        timezone,
        startDate || undefined,
        endDate || undefined
      );
    } catch (error) {
      console.error('Error creating timezone-aware date range:', error);
      // Fallback to UTC
      const now = new Date();
      return {
        startDate: now.toISOString(),
        endDate: now.toISOString()
      };
    }
  };

  const isCustomRange = dateRangeType !== "today";

  const value = {
    dateRangeType,
    startDate,
    endDate,
    setDateRange,
    isCustomRange,
    getTimezoneAwareDates
  };

  return (
    <DateRangeContext.Provider value={value}>
      {children}
    </DateRangeContext.Provider>
  );
}

export function useDateRange() {
  const context = useContext(DateRangeContext);
  if (context === undefined) {
    throw new Error('useDateRange must be used within a DateRangeProvider');
  }
  return context;
}