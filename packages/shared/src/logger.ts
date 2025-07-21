// ANSI color codes
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  gray: "\x1b[90m",
} as const;

type LogLevel = "info" | "warn" | "error" | "debug";

function getTimestamp(): string {
  return new Date().toISOString().replace("T", " ").slice(0, -5);
}

function formatMessage(
  level: LogLevel,
  source: string,
  message: string,
  ...args: any[]
): string {
  const timestamp = getTimestamp();
  const colorMap = {
    info: colors.blue,
    warn: colors.yellow,
    error: colors.red,
    debug: colors.gray,
  };

  const levelColor = colorMap[level];
  const sourceColor = colors.magenta;
  const timestampColor = colors.gray;

  return `${timestampColor}[${timestamp}]${colors.reset} ${levelColor}[${level.toUpperCase()}]${colors.reset} ${sourceColor}[${source}]${colors.reset} ${message}`;
}

export function createLogger(source: string) {
  return {
    info: (message: string, ...args: any[]) => {
      console.log(formatMessage("info", source, message), ...args);
    },
    warn: (message: string, ...args: any[]) => {
      console.warn(formatMessage("warn", source, message), ...args);
    },
    error: (message: string, ...args: any[]) => {
      console.error(formatMessage("error", source, message), ...args);
    },
    debug: (message: string, ...args: any[]) => {
      if (process.env.NODE_ENV === "development") {
        console.log(formatMessage("debug", source, message), ...args);
      }
    },
  };
}
