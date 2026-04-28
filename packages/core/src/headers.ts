/**
 * HTTP 헤더 유틸리티 — 케이스 무관 접근.
 * HTTP 헤더 이름은 case-insensitive (RFC 7230 §3.2).
 */

/** 케이스 무관으로 헤더 값을 가져온다. */
export function getHeader(
  headers: Record<string, string>,
  name: string,
): string | undefined {
  const lower = name.toLowerCase();
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === lower) return value;
  }
  return undefined;
}

/** 케이스 무관으로 헤더가 존재하는지 확인한다. */
export function hasHeader(
  headers: Record<string, string>,
  name: string,
): boolean {
  return getHeader(headers, name) !== undefined;
}

/** 케이스 무관으로 헤더를 설정한다 (기존 키 보존). 이미 있으면 덮어쓰지 않는다. */
export function setHeaderIfAbsent(
  headers: Record<string, string>,
  name: string,
  value: string,
): Record<string, string> {
  if (hasHeader(headers, name)) return headers;
  return { ...headers, [name]: value };
}

/** 케이스 무관으로 헤더를 삭제한다. */
export function deleteHeader(
  headers: Record<string, string>,
  name: string,
): Record<string, string> {
  const lower = name.toLowerCase();
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() !== lower) {
      result[key] = value;
    }
  }
  return result;
}
