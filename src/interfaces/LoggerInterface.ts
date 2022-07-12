export interface LoggerInterface {
  debug: (...args) => void;
  info: (...args) => void;
  warn: (...args) => void;
  error: (...args) => void;
}
