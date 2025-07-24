import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  category: string;
  message: string;
  data?: any;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

/**
 * Centralized logging service for the HVAC Crosswalk application
 * Logs to both console and file system with categorization
 */
export class LoggerService {
  private static instance: LoggerService;
  private logDir: string | null = null;
  private projectLogDir: string | null = null;
  private currentLogLevel: LogLevel = LogLevel.DEBUG;
  private readonly maxLogFiles = 7; // Keep 7 days of logs
  private readonly maxLogSizeBytes = 10 * 1024 * 1024; // 10MB per log file
  private initialized = false;

  private constructor() {
    // Don't initialize log directory immediately - wait until first log
  }

  public static getInstance(): LoggerService {
    if (!LoggerService.instance) {
      LoggerService.instance = new LoggerService();
    }
    return LoggerService.instance;
  }

  /**
   * Set the minimum log level
   */
  public setLogLevel(level: LogLevel): void {
    this.currentLogLevel = level;
    this.info('logger', `Log level set to ${LogLevel[level]}`);
  }

  /**
   * Log debug information
   */
  public debug(category: string, message: string, data?: any): void {
    this.log(LogLevel.DEBUG, category, message, data);
  }

  /**
   * Log general information
   */
  public info(category: string, message: string, data?: any): void {
    this.log(LogLevel.INFO, category, message, data);
  }

  /**
   * Log warnings
   */
  public warn(category: string, message: string, data?: any): void {
    this.log(LogLevel.WARN, category, message, data);
  }

  /**
   * Log errors
   */
  public error(category: string, message: string, error?: Error, data?: any): void {
    this.log(LogLevel.ERROR, category, message, data, error);
  }

  /**
   * Log API key operations (sensitive data filtered)
   */
  public apiKey(action: string, success: boolean, details?: string): void {
    const message = `API Key ${action}: ${success ? 'SUCCESS' : 'FAILED'}`;
    const data = { action, success, details };
    
    if (success) {
      this.info('api-key', message, data);
    } else {
      this.error('api-key', message, undefined, data);
    }
  }

  /**
   * Log file operations
   */
  public fileOperation(operation: string, filePath: string, success: boolean, details?: string, error?: Error): void {
    const safeFilePath = this.sanitizeFilePath(filePath);
    const message = `File ${operation}: ${safeFilePath} - ${success ? 'SUCCESS' : 'FAILED'}`;
    const data = { operation, filePath: safeFilePath, success, details };
    
    if (success) {
      this.info('file-ops', message, data);
    } else {
      this.error('file-ops', message, error, data);
    }
  }

  /**
   * Log database operations
   */
  public database(operation: string, table: string, success: boolean, details?: string, error?: Error): void {
    const message = `Database ${operation} on ${table}: ${success ? 'SUCCESS' : 'FAILED'}`;
    const data = { operation, table, success, details };
    
    if (success) {
      this.info('database', message, data);
    } else {
      this.error('database', message, error, data);
    }
  }

  /**
   * Log network requests (OpenAI API calls, etc.)
   */
  public network(method: string, url: string, statusCode?: number, responseTime?: number, error?: Error): void {
    const sanitizedUrl = this.sanitizeUrl(url);
    const success = statusCode !== undefined && statusCode >= 200 && statusCode < 400;
    const message = `${method} ${sanitizedUrl} - ${statusCode || 'FAILED'} (${responseTime || 0}ms)`;
    const data = { method, url: sanitizedUrl, statusCode, responseTime };
    
    if (success) {
      this.info('network', message, data);
    } else {
      this.error('network', message, error, data);
    }
  }

  /**
   * Log application events
   */
  public app(event: string, details?: string, data?: any): void {
    this.info('app', `Application ${event}${details ? ': ' + details : ''}`, data);
  }

  /**
   * Initialize the logging system if not already done
   */
  private ensureInitialized(): void {
    if (this.initialized) {
      return;
    }

    try {
      // Create logs directory in user data folder (primary location)
      const userDataPath = app.getPath('userData');
      this.logDir = path.join(userDataPath, 'logs');

      // Also create logs directory in project folder (for development)
      this.projectLogDir = path.join(process.cwd(), 'logs');

      this.ensureLogDirectory();
      this.cleanupOldLogs();

      this.initialized = true;

      // Log initialization success
      console.log(`[Logger] Initialized - Main logs: ${this.logDir}`);
      console.log(`[Logger] Initialized - Dev logs: ${this.projectLogDir}`);
    } catch (error) {
      // If we can't initialize file logging, at least console logging will work
      console.error('Failed to initialize logger file system:', error);
      this.initialized = true; // Mark as initialized to prevent repeated attempts
    }
  }

  /**
   * Core logging method
   */
  private log(level: LogLevel, category: string, message: string, data?: any, error?: Error): void {
    if (level < this.currentLogLevel) {
      return;
    }

    // Ensure logging system is initialized
    this.ensureInitialized();

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      data: data ? this.sanitizeData(data) : undefined,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : undefined
    };

    // Log to console
    this.logToConsole(entry);

    // Log to file
    this.logToFile(entry);
  }

  /**
   * Log to console with colors
   */
  private logToConsole(entry: LogEntry): void {
    const timestamp = entry.timestamp.split('T')[1].split('.')[0];
    const levelStr = LogLevel[entry.level].padEnd(5);
    const categoryStr = entry.category.padEnd(12);

    let color = '';
    switch (entry.level) {
      case LogLevel.DEBUG: color = '\x1b[36m'; break; // Cyan
      case LogLevel.INFO: color = '\x1b[32m'; break;  // Green
      case LogLevel.WARN: color = '\x1b[33m'; break;  // Yellow
      case LogLevel.ERROR: color = '\x1b[31m'; break; // Red
    }

    const reset = '\x1b[0m';
    const prefix = `${color}[${timestamp}] ${levelStr} ${categoryStr}${reset}`;

    console.log(`${prefix} ${entry.message}`);

    if (entry.data) {
      console.log(`${' '.repeat(35)} Data:`, entry.data);
    }

    if (entry.error) {
      console.error(`${' '.repeat(35)} Error:`, entry.error);
    }
  }

  /**
   * Log to file(s) - writes to both main and project log directories
   */
  private logToFile(entry: LogEntry): void {
    const today = new Date().toISOString().split('T')[0];
    const logLine = JSON.stringify(entry) + '\n';

    // Write to main log directory (user data)
    if (this.logDir) {
      this.writeToLogFile(this.logDir, today, logLine);
    }

    // Write to project log directory (development)
    if (this.projectLogDir) {
      this.writeToLogFile(this.projectLogDir, today, logLine);
    }
  }

  /**
   * Write to a specific log file with rotation
   */
  private writeToLogFile(logDir: string, today: string, logLine: string): void {
    try {
      const logFile = path.join(logDir, `hvac-crosswalk-${today}.log`);

      // Check if we need to rotate the log file
      if (fs.existsSync(logFile)) {
        const stats = fs.statSync(logFile);
        if (stats.size > this.maxLogSizeBytes) {
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const rotatedFile = path.join(logDir, `hvac-crosswalk-${today}-${timestamp}.log`);
          fs.renameSync(logFile, rotatedFile);
        }
      }

      fs.appendFileSync(logFile, logLine, 'utf8');
    } catch (error) {
      console.error(`Failed to write to log file in ${logDir}:`, error);
    }
  }

  /**
   * Ensure log directories exist
   */
  private ensureLogDirectory(): void {
    // Ensure main log directory exists
    if (this.logDir) {
      try {
        if (!fs.existsSync(this.logDir)) {
          fs.mkdirSync(this.logDir, { recursive: true });
        }
      } catch (error) {
        console.error('Failed to create main log directory:', error);
      }
    }

    // Ensure project log directory exists
    if (this.projectLogDir) {
      try {
        if (!fs.existsSync(this.projectLogDir)) {
          fs.mkdirSync(this.projectLogDir, { recursive: true });
        }
      } catch (error) {
        console.error('Failed to create project log directory:', error);
      }
    }
  }

  /**
   * Clean up old log files in both directories
   */
  private cleanupOldLogs(): void {
    // Clean up main log directory
    if (this.logDir) {
      this.cleanupLogDirectory(this.logDir);
    }

    // Clean up project log directory
    if (this.projectLogDir) {
      this.cleanupLogDirectory(this.projectLogDir);
    }
  }

  /**
   * Clean up old log files in a specific directory
   */
  private cleanupLogDirectory(logDir: string): void {
    try {
      const files = fs.readdirSync(logDir);
      const logFiles = files
        .filter(file => file.startsWith('hvac-crosswalk-') && file.endsWith('.log'))
        .map(file => ({
          name: file,
          path: path.join(logDir, file),
          mtime: fs.statSync(path.join(logDir, file)).mtime
        }))
        .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

      // Keep only the most recent log files
      const filesToDelete = logFiles.slice(this.maxLogFiles);

      filesToDelete.forEach(file => {
        try {
          fs.unlinkSync(file.path);
        } catch (error) {
          console.error(`Failed to delete old log file ${file.name}:`, error);
        }
      });
    } catch (error) {
      console.error(`Failed to cleanup old logs in ${logDir}:`, error);
    }
  }

  /**
   * Sanitize file paths for logging (remove sensitive info)
   */
  private sanitizeFilePath(filePath: string): string {
    if (!filePath) return '[no path]';

    // Replace user-specific paths with placeholders
    const userDataPath = app.getPath('userData');
    const homePath = app.getPath('home');

    return filePath
      .replace(userDataPath, '[USER_DATA]')
      .replace(homePath, '[HOME]')
      .replace(/\/Users\/[^\/]+/, '[USER]');
  }

  /**
   * Sanitize URLs for logging (remove API keys)
   */
  private sanitizeUrl(url: string): string {
    if (!url) return '[no url]';

    // Remove API keys from URLs
    return url.replace(/[?&]key=[^&]+/gi, '?key=[REDACTED]')
              .replace(/[?&]api_key=[^&]+/gi, '?api_key=[REDACTED]')
              .replace(/[?&]token=[^&]+/gi, '?token=[REDACTED]');
  }

  /**
   * Sanitize data for logging (remove sensitive information)
   */
  private sanitizeData(data: any): any {
    if (!data) return data;

    const sanitized = JSON.parse(JSON.stringify(data));

    // Remove sensitive keys
    const sensitiveKeys = ['apiKey', 'api_key', 'token', 'password', 'secret', 'key'];

    const sanitizeObject = (obj: any): any => {
      if (typeof obj !== 'object' || obj === null) return obj;

      if (Array.isArray(obj)) {
        return obj.map(sanitizeObject);
      }

      const result = { ...obj };
      for (const key in result) {
        if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
          result[key] = '[REDACTED]';
        } else if (typeof result[key] === 'object') {
          result[key] = sanitizeObject(result[key]);
        }
      }
      return result;
    };

    return sanitizeObject(sanitized);
  }

  /**
   * Get log file paths for external access (from main log directory)
   */
  public getLogFiles(): string[] {
    this.ensureInitialized();

    if (!this.logDir) {
      return [];
    }

    try {
      const files = fs.readdirSync(this.logDir);
      return files
        .filter(file => file.startsWith('hvac-crosswalk-') && file.endsWith('.log'))
        .map(file => path.join(this.logDir!, file))
        .sort((a, b) => fs.statSync(b).mtime.getTime() - fs.statSync(a).mtime.getTime());
    } catch (error) {
      console.error('Failed to get log files:', error);
      return [];
    }
  }

  /**
   * Get project log file paths (for development)
   */
  public getProjectLogFiles(): string[] {
    this.ensureInitialized();

    if (!this.projectLogDir) {
      return [];
    }

    try {
      const files = fs.readdirSync(this.projectLogDir);
      return files
        .filter(file => file.startsWith('hvac-crosswalk-') && file.endsWith('.log'))
        .map(file => path.join(this.projectLogDir!, file))
        .sort((a, b) => fs.statSync(b).mtime.getTime() - fs.statSync(a).mtime.getTime());
    } catch (error) {
      console.error('Failed to get project log files:', error);
      return [];
    }
  }

  /**
   * Get recent log entries
   */
  public getRecentLogs(count: number = 100, category?: string): LogEntry[] {
    try {
      const logFiles = this.getLogFiles();
      const entries: LogEntry[] = [];

      for (const logFile of logFiles) {
        if (entries.length >= count) break;

        const content = fs.readFileSync(logFile, 'utf8');
        const lines = content.trim().split('\n').reverse(); // Most recent first

        for (const line of lines) {
          if (entries.length >= count) break;

          try {
            const entry = JSON.parse(line);
            if (!category || entry.category === category) {
              entries.push(entry);
            }
          } catch (parseError) {
            // Skip invalid JSON lines
          }
        }
      }

      return entries;
    } catch (error) {
      console.error('Failed to get recent logs:', error);
      return [];
    }
  }

  /**
   * Export logs for debugging
   */
  public exportLogs(outputPath: string): boolean {
    try {
      const logs = this.getRecentLogs(1000);
      const exportData = {
        exportedAt: new Date().toISOString(),
        logCount: logs.length,
        logs
      };

      fs.writeFileSync(outputPath, JSON.stringify(exportData, null, 2), 'utf8');
      this.info('logger', `Logs exported to ${outputPath}`, { logCount: logs.length });
      return true;
    } catch (error) {
      this.error('logger', 'Failed to export logs', error instanceof Error ? error : new Error(String(error)));
      return false;
    }
  }
}

// Create singleton instance
export const logger = LoggerService.getInstance();