import type { ErrorCode } from '../../shared/types';

export class AppError extends Error {
  code: ErrorCode;
  detail?: string;

  constructor(code: ErrorCode, message: string, detail?: string) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.detail = detail;
  }
}

export function asAppError(err: unknown, fallbackCode: ErrorCode, fallbackMessage: string): AppError {
  if (err instanceof AppError) {
    return err;
  }
  const message = err instanceof Error ? err.message : String(err);
  return new AppError(fallbackCode, fallbackMessage, message);
}
