/**
 * Centralized logging service for BigCal webpart
 * Provides configurable logging levels and performance-optimized logging
 */
export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3
}

export class LoggingService {
  private static instance: LoggingService;
  private logLevel: LogLevel = LogLevel.ERROR; // Default to ERROR only in production
  private isProduction: boolean = true;

  private constructor() {
    // Detect environment - in development, enable more logging
    this.isProduction = window.location.hostname.indexOf('localhost') === -1 &&
                       window.location.hostname.indexOf('127.0.0.1') === -1 &&
                       window.location.search.indexOf('debug=true') === -1;
    
    // Set default log level based on environment
    this.logLevel = this.isProduction ? LogLevel.ERROR : LogLevel.INFO;
    
    // Allow override via URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    const debugLevel = urlParams.get('loglevel');
    if (debugLevel) {
      switch (debugLevel.toLowerCase()) {
        case 'error':
          this.logLevel = LogLevel.ERROR;
          break;
        case 'warn':
          this.logLevel = LogLevel.WARN;
          break;
        case 'info':
          this.logLevel = LogLevel.INFO;
          break;
        case 'debug':
          this.logLevel = LogLevel.DEBUG;
          break;
      }
    }
  }

  public static getInstance(): LoggingService {
    if (!LoggingService.instance) {
      LoggingService.instance = new LoggingService();
    }
    return LoggingService.instance;
  }

  public setLogLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  public error(message: string, data?: unknown): void {
    if (this.logLevel >= LogLevel.ERROR) {
      if (data) {
        console.error(`[BigCal] ${message}`, data);
      } else {
        console.error(`[BigCal] ${message}`);
      }
    }
  }

  public warn(message: string, data?: unknown): void {
    if (this.logLevel >= LogLevel.WARN) {
      if (data) {
        console.warn(`[BigCal] ${message}`, data);
      } else {
        console.warn(`[BigCal] ${message}`);
      }
    }
  }

  public info(message: string, data?: unknown): void {
    if (this.logLevel >= LogLevel.INFO) {
      if (data) {
        console.log(`[BigCal] ${message}`, data);
      } else {
        console.log(`[BigCal] ${message}`);
      }
    }
  }

  public debug(message: string, data?: unknown): void {
    if (this.logLevel >= LogLevel.DEBUG) {
      if (data) {
        console.log(`[BigCal DEBUG] ${message}`, data);
      } else {
        console.log(`[BigCal DEBUG] ${message}`);
      }
    }
  }

  /**
   * Performance-optimized logging for bulk operations
   * Only logs summary information to avoid performance impact
   */
  public bulkOperation(operation: string, count: number, duration?: number): void {
    if (this.logLevel >= LogLevel.INFO) {
      const durationText = duration ? ` in ${duration}ms` : '';
      console.log(`[BigCal] ${operation}: ${count} items${durationText}`);
    }
  }

  /**
   * Log only critical errors that need immediate attention
   */
  public critical(message: string, error?: unknown): void {
    // Always log critical errors regardless of log level
    if (error) {
      console.error(`[BigCal CRITICAL] ${message}`, error);
    } else {
      console.error(`[BigCal CRITICAL] ${message}`);
    }
  }

  /**
   * Conditional logging for development/debugging
   * Only logs when explicitly enabled
   */
  public devOnly(message: string, data?: unknown): void {
    if (!this.isProduction || this.logLevel >= LogLevel.DEBUG) {
      if (data) {
        console.log(`[BigCal DEV] ${message}`, data);
      } else {
        console.log(`[BigCal DEV] ${message}`);
      }
    }
  }

  /**
   * Get current logging configuration
   */
  public getConfig(): { level: LogLevel; isProduction: boolean } {
    return {
      level: this.logLevel,
      isProduction: this.isProduction
    };
  }
}

// Export singleton instance
export const Logger = LoggingService.getInstance();
