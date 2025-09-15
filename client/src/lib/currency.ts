import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

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

// Hook to get system settings
export function useSystemSettings() {
  return useQuery({
    queryKey: ["/api/settings"],
    queryFn: () => apiRequest("GET", "/api/settings"),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false
  });
}

// Format currency based on system settings
export function formatCurrency(amount: number, settings?: SystemSettings): string {
  if (!settings) {
    // Default formatting if no settings available
    return `$${amount.toLocaleString('es-MX', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    })}`;
  }

  const {
    currencySymbol,
    decimalPlaces,
    thousandsSeparator,
    decimalSeparator
  } = settings;

  // Format the number with specified decimal places
  const fixedAmount = amount.toFixed(decimalPlaces);
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
}

// Format date based on system settings
export function formatDate(date: Date | string, settings?: SystemSettings): string {
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
}

// Format time based on system settings
export function formatTime(date: Date | string, settings?: SystemSettings): string {
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
}

// Format number based on system settings
export function formatNumber(number: number, settings?: SystemSettings): string {
  if (!settings) {
    return number.toLocaleString('es-MX');
  }

  const {
    decimalPlaces,
    thousandsSeparator,
    decimalSeparator
  } = settings;

  const fixedNumber = number.toFixed(decimalPlaces);
  const [integerPart, decimalPart] = fixedNumber.split('.');

  // Add thousands separator
  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, thousandsSeparator);

  // Combine with decimal part if needed
  if (decimalPlaces > 0 && decimalPart) {
    return formattedInteger + decimalSeparator + decimalPart;
  }

  return formattedInteger;
}

// Get current date/time in system timezone
export function getCurrentDateTime(settings?: SystemSettings): Date {
  if (!settings?.timezone) {
    return new Date();
  }

  // Create a date in the system timezone
  const now = new Date();
  const options: Intl.DateTimeFormatOptions = {
    timeZone: settings.timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  };

  const formatter = new Intl.DateTimeFormat('en-CA', options);
  const parts = formatter.formatToParts(now);
  
  const year = parseInt(parts.find(p => p.type === 'year')?.value || '');
  const month = parseInt(parts.find(p => p.type === 'month')?.value || '') - 1;
  const day = parseInt(parts.find(p => p.type === 'day')?.value || '');
  const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '');
  const minute = parseInt(parts.find(p => p.type === 'minute')?.value || '');
  const second = parseInt(parts.find(p => p.type === 'second')?.value || '');

  return new Date(year, month, day, hour, minute, second);
}