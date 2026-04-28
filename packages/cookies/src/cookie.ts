/**
 * Cookie 객체 — RFC 6265 §5.3에 정의된 쿠키 속성.
 */
export interface Cookie {
  /** 쿠키 이름 */
  name: string;
  /** 쿠키 값 */
  value: string;
  /** 도메인 (leading dot 없이 저장) */
  domain: string;
  /** 경로 */
  path: string;
  /** 만료 시각 (epoch ms). undefined면 세션 쿠키. */
  expires?: number;
  /** HTTPS 전용 */
  secure: boolean;
  /** JS API에서 숨김 */
  httpOnly: boolean;
  /** SameSite 정책 */
  sameSite: 'strict' | 'lax' | 'none';
  /** 생성 시각 (epoch ms) */
  creationTime: number;
  /** 마지막 접근 시각 (epoch ms) */
  lastAccessTime: number;
}
