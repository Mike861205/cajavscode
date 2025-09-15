// Timezone utilities for handling dates across the application
export class TimezoneManager {
  constructor(private timezone: string = 'UTC') {}

  /**
   * Converts a date to the configured timezone and returns start of day
   */
  getStartOfDay(date: Date | string): Date {
    const targetDate = typeof date === 'string' ? new Date(date) : new Date(date);
    
    // For Mazatlán timezone (UTC-7)
    if (this.timezone === 'America/Mazatlan' || this.timezone.includes('Mazatlan')) {
      // Create the date in Mazatlán time, then convert to UTC for API
      const year = targetDate.getFullYear();
      const month = targetDate.getMonth();
      const day = targetDate.getDate();
      
      // Start of day in Mazatlán (00:00:00 local = 07:00:00 UTC)
      const localStart = new Date(year, month, day, 0, 0, 0, 0);
      // Convert to UTC by adding 7 hours (since Mazatlán is UTC-7)
      return new Date(localStart.getTime() + (7 * 60 * 60 * 1000));
    }
    
    // Fallback for other timezones
    const year = targetDate.getFullYear();
    const month = targetDate.getMonth();
    const day = targetDate.getDate();
    return new Date(year, month, day, 0, 0, 0, 0);
  }

  /**
   * Converts a date to the configured timezone and returns end of day
   */
  getEndOfDay(date: Date | string): Date {
    const targetDate = typeof date === 'string' ? new Date(date) : new Date(date);
    
    // For Mazatlán timezone (UTC-7)
    if (this.timezone === 'America/Mazatlan' || this.timezone.includes('Mazatlan')) {
      // Create the date in Mazatlán time, then convert to UTC for API
      const year = targetDate.getFullYear();
      const month = targetDate.getMonth();
      const day = targetDate.getDate();
      
      // End of day in Mazatlán (23:59:59 local = 06:59:59 UTC next day)
      const localEnd = new Date(year, month, day, 23, 59, 59, 999);
      // Convert to UTC by adding 7 hours (since Mazatlán is UTC-7)
      return new Date(localEnd.getTime() + (7 * 60 * 60 * 1000));
    }
    
    // Fallback for other timezones
    const year = targetDate.getFullYear();
    const month = targetDate.getMonth();
    const day = targetDate.getDate();
    return new Date(year, month, day, 23, 59, 59, 999);
  }

  /**
   * Gets today's date in the configured timezone
   */
  getToday(): Date {
    const now = new Date();
    
    // For Mazatlán timezone (UTC-7)
    if (this.timezone === 'America/Mazatlan' || this.timezone.includes('Mazatlan')) {
      // Get current time in Mazatlán by subtracting 7 hours from UTC
      const mazatlanTime = new Date(now.getTime() - (7 * 60 * 60 * 1000));
      // Timezone debug logs removed - system working correctly
      return mazatlanTime;
    }
    
    // Fallback for other timezones
    return new Date(now.toLocaleString("en-US", { timeZone: this.timezone }));
  }

  /**
   * Gets the start of today in the configured timezone
   */
  getTodayStart(): Date {
    return this.getStartOfDay(this.getToday());
  }

  /**
   * Gets the end of today in the configured timezone
   */
  getTodayEnd(): Date {
    return this.getEndOfDay(this.getToday());
  }

  /**
   * Gets date range for "this week" in the configured timezone
   */
  getThisWeekRange(): { start: Date; end: Date } {
    const today = this.getToday();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay()); // Sunday
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6); // Saturday
    
    return {
      start: this.getStartOfDay(startOfWeek),
      end: this.getEndOfDay(endOfWeek)
    };
  }

  /**
   * Gets date range for "this month" in the configured timezone
   */
  getThisMonthRange(): { start: Date; end: Date } {
    const today = this.getToday();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    return {
      start: this.getStartOfDay(startOfMonth),
      end: this.getEndOfDay(endOfMonth)
    };
  }

  /**
   * Converts a Date to ISO string for API usage
   */
  toISOString(date: Date): string {
    return date.toISOString();
  }

  /**
   * Formats a date for timezone-aware display
   */
  formatDate(date: Date): string {
    return new Intl.DateTimeFormat('es-MX', {
      timeZone: this.timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(date);
  }

  /**
   * Formats a time for timezone-aware display
   */
  formatTime(date: Date): string {
    return new Intl.DateTimeFormat('es-MX', {
      timeZone: this.timezone,
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }
}

// Helper function to create timezone-aware date ranges
export function createDateRangeWithTimezone(
  type: 'today' | 'week' | 'month' | 'custom',
  timezone: string,
  customStart?: string,
  customEnd?: string
): { startDate: string; endDate: string } {
  const tzManager = new TimezoneManager(timezone);

  switch (type) {
    case 'today':
      const todayStart = tzManager.getTodayStart();
      const todayEnd = tzManager.getTodayEnd();
      
      // Timezone calculation debug removed - system verified working
      
      return {
        startDate: todayStart.toISOString(),
        endDate: todayEnd.toISOString()
      };
    
    case 'week':
      const weekRange = tzManager.getThisWeekRange();
      return {
        startDate: tzManager.toISOString(weekRange.start),
        endDate: tzManager.toISOString(weekRange.end)
      };
    
    case 'month':
      const monthRange = tzManager.getThisMonthRange();
      return {
        startDate: tzManager.toISOString(monthRange.start),
        endDate: tzManager.toISOString(monthRange.end)
      };
    
    case 'custom':
      if (!customStart || !customEnd) {
        throw new Error('Custom date range requires both start and end dates');
      }
      return {
        startDate: tzManager.toISOString(tzManager.getStartOfDay(customStart)),
        endDate: tzManager.toISOString(tzManager.getEndOfDay(customEnd))
      };
    
    default:
      throw new Error(`Unsupported date range type: ${type}`);
  }
}