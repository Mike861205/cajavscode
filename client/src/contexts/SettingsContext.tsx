import React, { createContext, useContext, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { TimezoneManager } from '@/lib/timezone';

interface SystemSettings {
  id: number;
  tenantId: string;
  timezone: string;
  country: string;
  currency: string;
  currencySymbol: string;
  currencyName: string;
  dateFormat: string;
  timeFormat: string;
  decimalPlaces: number;
  thousandsSeparator: string;
  decimalSeparator: string;
  createdAt: string;
  updatedAt: string;
}

interface SettingsContextType {
  settings: SystemSettings | null;
  formatCurrency: (amount: number | string) => string;
  formatNumber: (amount: number | string) => string;
  formatDate: (date: Date | string) => string;
  formatTime: (date: Date | string) => string;
  timezoneManager: TimezoneManager;
  isLoading: boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [timezoneManager, setTimezoneManager] = useState<TimezoneManager>(new TimezoneManager());

  const { data, isLoading } = useQuery({
    queryKey: ["/api/settings"],
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false
  });

  useEffect(() => {
    if (data && typeof data === 'object' && 'id' in data) {
      setSettings(data as SystemSettings);
      // Update timezone manager when settings change
      const timezone = (data as SystemSettings).timezone || 'UTC';
      setTimezoneManager(new TimezoneManager(timezone));
    }
  }, [data]);

  const formatCurrency = (amount: number | string): string => {
    const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(numericAmount)) return '$0.00';

    if (!settings) {
      return `$${numericAmount.toFixed(2)}`;
    }

    const {
      currencySymbol,
      decimalPlaces,
      thousandsSeparator,
      decimalSeparator
    } = settings;

    // Format the number with specified decimal places
    const fixedAmount = numericAmount.toFixed(decimalPlaces);
    const [integerPart, decimalPart] = fixedAmount.split('.');

    // Add thousands separator
    const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, thousandsSeparator);

    // Combine with decimal part if needed
    let formattedAmount = formattedInteger;
    if (decimalPlaces > 0 && decimalPart) {
      formattedAmount += decimalSeparator + decimalPart;
    }

    // Add currency symbol
    return `${currencySymbol}${formattedAmount}`;
  };

  const formatNumber = (amount: number | string): string => {
    const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(numericAmount)) return '0';

    if (!settings) {
      return numericAmount.toLocaleString('es-MX');
    }

    const {
      decimalPlaces,
      thousandsSeparator,
      decimalSeparator
    } = settings;

    const fixedNumber = numericAmount.toFixed(decimalPlaces);
    const [integerPart, decimalPart] = fixedNumber.split('.');

    // Add thousands separator
    const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, thousandsSeparator);

    // Combine with decimal part if needed
    if (decimalPlaces > 0 && decimalPart) {
      return formattedInteger + decimalSeparator + decimalPart;
    }

    return formattedInteger;
  };

  const formatDate = (date: Date | string): string => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    if (!settings || !settings.dateFormat) {
      return dateObj.toLocaleDateString('es-MX');
    }

    const { dateFormat, timezone } = settings;

    // Get date components in the specified timezone
    const options: Intl.DateTimeFormatOptions = {
      timeZone: timezone || 'America/Mexico_City',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    };

    const formatter = new Intl.DateTimeFormat('es-MX', options);
    const parts = formatter.formatToParts(dateObj);
    
    const year = parts.find(p => p.type === 'year')?.value || '';
    const month = parts.find(p => p.type === 'month')?.value || '';
    const day = parts.find(p => p.type === 'day')?.value || '';

    // Format according to specified format
    switch (dateFormat) {
      case 'DD/MM/YYYY':
        return `${day}/${month}/${year}`;
      case 'MM/DD/YYYY':
        return `${month}/${day}/${year}`;
      case 'YYYY-MM-DD':
        return `${year}-${month}-${day}`;
      default:
        return `${day}/${month}/${year}`;
    }
  };

  const formatTime = (date: Date | string): string => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    if (!settings || !settings.timeFormat) {
      return dateObj.toLocaleTimeString('es-MX', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    }

    const { timeFormat, timezone } = settings;

    const options: Intl.DateTimeFormatOptions = {
      timeZone: timezone || 'America/Mexico_City',
      hour: '2-digit',
      minute: '2-digit',
      hour12: timeFormat === '12h'
    };

    return dateObj.toLocaleTimeString('es-MX', options);
  };

  return (
    <SettingsContext.Provider value={{
      settings,
      formatCurrency,
      formatNumber,
      formatDate,
      formatTime,
      timezoneManager,
      isLoading
    }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}