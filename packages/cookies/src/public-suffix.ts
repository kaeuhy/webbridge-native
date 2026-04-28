/**
 * 최소한의 Public Suffix 검사.
 * 전체 PSL(publicsuffix.org)을 포함하면 번들 크기가 커지므로,
 * 가장 흔한 TLD와 이중 TLD만 검사한다.
 *
 * 이 검사를 통과하지 못하면 해당 도메인에 쿠키를 설정할 수 없다.
 */

/** 흔한 이중 TLD */
const DOUBLE_TLDS = new Set([
  'co.uk', 'co.kr', 'co.jp', 'co.nz', 'co.za', 'co.in', 'co.id',
  'com.au', 'com.br', 'com.cn', 'com.mx', 'com.tw', 'com.hk', 'com.sg',
  'org.uk', 'org.au',
  'net.au', 'net.br',
  'ac.uk', 'ac.kr', 'ac.jp',
  'go.kr', 'go.jp',
  'ne.jp', 'or.jp', 'or.kr',
  'gov.uk', 'gov.au', 'gov.br',
  'edu.au', 'edu.cn',
]);

/**
 * 도메인이 public suffix인지 검사한다.
 * public suffix에는 쿠키를 설정할 수 없다 (RFC 6265 §5.3 step 5).
 *
 * @returns true면 public suffix (쿠키 설정 거부해야 함)
 */
export function isPublicSuffix(domain: string): boolean {
  const lower = domain.toLowerCase();
  const parts = lower.split('.');

  // 단일 라벨 (예: "com", "localhost") → public suffix
  if (parts.length <= 1) return true;

  // 이중 TLD 체크 (예: "co.uk")
  if (parts.length === 2 && DOUBLE_TLDS.has(lower)) return true;

  // 2-라벨 도메인이 이중 TLD 위에 있는지 (예: "example.co.uk" → OK)
  // 하지만 "co.uk" 자체는 위에서 이미 잡힘

  return false;
}
