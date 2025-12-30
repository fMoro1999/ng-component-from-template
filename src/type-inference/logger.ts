/**
 * Logger interface for type inference system
 * Allows for silent mode during tests and configurable logging
 */
export interface Logger {
  log(message: string): void;
  warn(message: string, error?: any): void;
  error(message: string, error?: any): void;
}

/**
 * Console logger - default production logger
 */
export class ConsoleLogger implements Logger {
  log(message: string): void {
    console.log(message);
  }

  warn(message: string, error?: any): void {
    if (error) {
      console.warn(message, error);
    } else {
      console.warn(message);
    }
  }

  error(message: string, error?: any): void {
    if (error) {
      console.error(message, error);
    } else {
      console.error(message);
    }
  }
}

/**
 * Silent logger - for tests
 */
export class SilentLogger implements Logger {
  log(_message: string): void {
    // Silent
  }

  warn(_message: string, _error?: any): void {
    // Silent
  }

  error(_message: string, _error?: any): void {
    // Silent
  }
}

/**
 * Global logger instance - defaults to console logger
 * Can be overridden for testing
 */
let globalLogger: Logger = new ConsoleLogger();

export function setGlobalLogger(logger: Logger): void {
  globalLogger = logger;
}

export function getGlobalLogger(): Logger {
  return globalLogger;
}
