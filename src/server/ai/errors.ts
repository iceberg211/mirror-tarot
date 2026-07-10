export type AiErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'RATE_LIMITED'
  | 'PAYLOAD_TOO_LARGE'
  | 'AI_TIMEOUT'
  | 'AI_FORMAT_ERROR'
  | 'AI_REQUEST_ERROR'
  | 'NOT_FOUND'
  | 'INTERNAL_ERROR';

export class ApiError extends Error {
  readonly code: AiErrorCode;
  readonly status: number;
  readonly details?: unknown;

  constructor(code: AiErrorCode, message: string, status: number, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export function jsonError(
  code: AiErrorCode,
  message: string,
  status: number,
  extra?: Record<string, unknown>
): Response {
  return new Response(
    JSON.stringify({
      error: message,
      code,
      ...extra,
    }),
    {
      status,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

export function handleRouteError(error: unknown, routeLabel: string): Response {
  if (error instanceof ApiError) {
    return jsonError(error.code, error.message, error.status, error.details ? { details: error.details } : undefined);
  }

  console.error(`${routeLabel} Error:`, error);
  const message = error instanceof Error ? error.message : String(error);

  if (/timeout|aborted|AbortError/i.test(message)) {
    return jsonError('AI_TIMEOUT', 'AI 请求超时，请稍后重试', 504);
  }

  return jsonError('INTERNAL_ERROR', message || '服务器内部错误', 500);
}
