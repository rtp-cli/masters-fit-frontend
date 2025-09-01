/**
 * Centralized logging utility for production-grade logging
 * Provides structured logging with proper levels and context
 */

export enum LogLevel {
  ERROR = "error",
  WARN = "warn",
  INFO = "info",
  DEBUG = "debug",
}

interface LogContext {
  [key: string]: string | number | boolean | undefined | null;
}

interface LogEntry {
  level: LogLevel;
  message: string;
  context?: LogContext;
  timestamp: string;
  component?: string;
}

class Logger {
  private isDevelopment = __DEV__ || process.env.NODE_ENV === "development";
  private component?: string;

  constructor(component?: string) {
    this.component = component;
  }

  private log(level: LogLevel, message: string, context?: LogContext) {
    const entry: LogEntry = {
      level,
      message,
      context: this.sanitizeContext(context),
      timestamp: new Date().toISOString(),
      component: this.component,
    };

    // Format for console output
    const formattedMessage = this.component
      ? `[${this.component}] ${message}`
      : message;

    switch (level) {
      case LogLevel.ERROR:
        console.error(formattedMessage, context || "");
        break;
      case LogLevel.WARN:
        console.warn(formattedMessage, context || "");
        break;
      case LogLevel.INFO:
        // Only log info in development or if explicitly enabled
        if (this.isDevelopment || this.shouldLogInfo()) {
          console.info(formattedMessage, context || "");
        }
        break;
      case LogLevel.DEBUG:
        // Only log debug in development
        if (this.isDevelopment) {
          console.log(formattedMessage, context || "");
        }
        break;
    }

    // In production, you could send to external logging service here
    // this.sendToLoggingService(entry);
  }

  private sanitizeContext(context?: LogContext): LogContext | undefined {
    if (!context) return undefined;

    // Remove sensitive data from context
    const sanitized = { ...context };
    const sensitiveKeys = [
      "password",
      "token",
      "email",
      "phone",
      "ssn",
      "credit",
    ];

    Object.keys(sanitized).forEach((key) => {
      const lowerKey = key.toLowerCase();
      if (sensitiveKeys.some((sensitive) => lowerKey.includes(sensitive))) {
        sanitized[key] = "[REDACTED]";
      }

      // Truncate very long values
      if (typeof sanitized[key] === "string" && sanitized[key].length > 200) {
        sanitized[key] = sanitized[key].substring(0, 200) + "...";
      }
    });

    return sanitized;
  }

  private shouldLogInfo(): boolean {
    // Could be controlled by environment variable or feature flag
    return process.env.EXPO_PUBLIC_LOG_LEVEL === "info";
  }

  error(message: string, context?: LogContext) {
    this.log(LogLevel.ERROR, message, context);
  }

  warn(message: string, context?: LogContext) {
    this.log(LogLevel.WARN, message, context);
  }

  info(message: string, context?: LogContext) {
    this.log(LogLevel.INFO, message, context);
  }

  debug(message: string, context?: LogContext) {
    this.log(LogLevel.DEBUG, message, context);
  }

  // Specialized logging methods for common use cases
  apiRequest(endpoint: string, method: string = "GET", duration?: number) {
    const context: LogContext = { endpoint, method };
    if (duration !== undefined) {
      context.duration = `${duration}ms`;
      if (duration > 5000) {
        this.warn("Slow API request detected", context);
      } else {
        this.debug("API request completed", context);
      }
    } else {
      this.debug("API request started", context);
    }
  }

  apiError(endpoint: string, error: unknown, method: string = "GET") {
    const errorContext: LogContext = {
      endpoint,
      method,
    };

    if (error instanceof Error) {
      errorContext.error = error.message;
      errorContext.stack = error.stack;
    } else if (typeof error === "string") {
      errorContext.error = error;
    } else {
      errorContext.error = "Unknown error";
    }

    this.error("API request failed", errorContext);
  }

  userAction(action: string, context?: LogContext) {
    this.info(`User action: ${action}`, context);
  }

  performanceMetric(metric: string, value: number, unit: string = "ms") {
    this.info(`Performance: ${metric}`, { value, unit });
  }

  securityEvent(event: string, context?: LogContext) {
    this.warn(`Security event: ${event}`, context);
  }

  businessEvent(event: string, context?: LogContext) {
    this.info(`Business event: ${event}`, context);
  }
}

// Single logger instance for the entire app
export const logger = new Logger();
