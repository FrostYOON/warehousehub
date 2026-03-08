/**
 * API 에러에서 메시지 추출 유틸
 * Axios 에러 (response.data.message) 또는 일반 에러 처리
 */
export function getErrorMessage(
  err: unknown,
  fallback = '요청에 실패했습니다.',
): string {
  if (!err || typeof err !== 'object') return fallback;

  const ax = err as {
    response?: { data?: { message?: string | string[] }; status?: number };
    message?: string;
  };

  const payload = ax.response?.data;
  if (payload && typeof payload === 'object' && 'message' in payload) {
    const msg = payload.message;
    if (Array.isArray(msg)) return msg[0] ?? fallback;
    if (typeof msg === 'string') return msg;
  }

  if (typeof ax.message === 'string' && ax.message.trim()) {
    return ax.message.trim();
  }

  return fallback;
}
