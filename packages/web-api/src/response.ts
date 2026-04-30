/**
 * Fetch API Response spec-compliant implementation for WebBridge Native.
 *
 * Provides json(), text(), arrayBuffer() body consumption methods
 * and fromWebBridge/toWebBridge interop for the interceptor chain.
 */

import type { WebBridgeResponse } from '@webbridge-native/core';
import { WBHeaders } from './headers';

export type ResponseType = 'basic' | 'cors' | 'error' | 'opaque';

export interface WBResponseInit {
  status?: number;
  statusText?: string;
  headers?: Record<string, string> | WBHeaders;
}

export class WBResponse {
  readonly headers: WBHeaders;
  readonly ok: boolean;
  readonly status: number;
  readonly statusText: string;
  readonly type: ResponseType;
  readonly url: string;
  readonly redirected: boolean;
  readonly body: string | ArrayBuffer | null;

  private _bodyUsed = false;

  constructor(body?: string | ArrayBuffer | null, init?: WBResponseInit) {
    const status = init?.status ?? 200;
    const statusText = init?.statusText ?? '';

    if (status < 200 || status > 599) {
      throw new RangeError(
        `Invalid status code: ${status}. Must be between 200 and 599.`,
      );
    }

    this.status = status;
    this.statusText = statusText;
    this.ok = status >= 200 && status <= 299;
    this.type = 'basic';
    this.url = '';
    this.redirected = false;
    this.body = body ?? null;

    if (init?.headers instanceof WBHeaders) {
      this.headers = new WBHeaders(init.headers);
    } else if (init?.headers) {
      this.headers = new WBHeaders(init.headers);
    } else {
      this.headers = new WBHeaders();
    }
  }

  /** Whether the body has already been consumed. */
  get bodyUsed(): boolean {
    return this._bodyUsed;
  }

  /**
   * Parse the body as JSON.
   * @throws if body has already been consumed
   */
  async json(): Promise<unknown> {
    this._checkBodyUsed();
    this._bodyUsed = true;
    const text = this._bodyToString();
    return JSON.parse(text);
  }

  /**
   * Return the body as a string.
   * @throws if body has already been consumed
   */
  async text(): Promise<string> {
    this._checkBodyUsed();
    this._bodyUsed = true;
    return this._bodyToString();
  }

  /**
   * Return the body as an ArrayBuffer.
   * @throws if body has already been consumed
   */
  async arrayBuffer(): Promise<ArrayBuffer> {
    this._checkBodyUsed();
    this._bodyUsed = true;
    if (this.body instanceof ArrayBuffer) {
      return this.body;
    }
    const text = this._bodyToString();
    const encoder = new TextEncoder();
    return encoder.encode(text).buffer as ArrayBuffer;
  }

  /**
   * Creates an independent clone of this response.
   * The clone has bodyUsed reset to false.
   */
  clone(): WBResponse {
    const cloned = new WBResponse(this.body, {
      status: this.status,
      statusText: this.statusText,
      headers: new WBHeaders(this.headers),
    });
    // Copy non-constructor fields
    (cloned as { url: string }).url = this.url;
    (cloned as { redirected: boolean }).redirected = this.redirected;
    (cloned as { type: ResponseType }).type = this.type;
    return cloned;
  }

  /**
   * Creates a WBResponse from a WebBridgeResponse (interceptor chain output).
   * This is the KEY interop method for bridging native responses to Fetch API.
   */
  static fromWebBridge(res: WebBridgeResponse): WBResponse {
    const response = new WBResponse(res.body, {
      status: res.status,
      statusText: res.statusText,
      headers: res.headers,
    });
    (response as { url: string }).url = res.url;
    (response as { redirected: boolean }).redirected = res.redirected;
    (response as { type: ResponseType }).type = res.type;
    return response;
  }

  /**
   * Converts this WBResponse back to a WebBridgeResponse for the interceptor chain.
   */
  toWebBridge(): WebBridgeResponse {
    return {
      url: this.url,
      status: this.status,
      statusText: this.statusText,
      headers: this.headers.toRecord(),
      body: this.body,
      ok: this.ok,
      redirected: this.redirected,
      type: this.type,
    };
  }

  /**
   * Creates a WBResponse wrapping JSON data.
   */
  static json(data: unknown, init?: WBResponseInit): WBResponse {
    const body = JSON.stringify(data);
    const headers =
      init?.headers instanceof WBHeaders
        ? new WBHeaders(init.headers)
        : new WBHeaders(init?.headers ?? {});
    if (!headers.has('content-type')) {
      headers.set('content-type', 'application/json');
    }
    return new WBResponse(body, {
      ...init,
      headers,
    });
  }

  /**
   * Creates an error response with type 'error' and status 0.
   */
  static error(): WBResponse {
    const response = new WBResponse(null, { status: 200 });
    // Override to error state
    (response as { status: number }).status = 0;
    (response as { ok: boolean }).ok = false;
    (response as { type: ResponseType }).type = 'error';
    (response as { statusText: string }).statusText = '';
    return response;
  }

  /**
   * Creates a redirect response.
   * @param url - The URL to redirect to
   * @param status - The redirect status code (default 302)
   */
  static redirect(url: string, status = 302): WBResponse {
    const validRedirectStatuses = [301, 302, 303, 307, 308];
    if (!validRedirectStatuses.includes(status)) {
      throw new RangeError(`Invalid redirect status: ${status}`);
    }
    const response = new WBResponse(null, {
      status,
      headers: { location: url },
    });
    (response as { redirected: boolean }).redirected = true;
    return response;
  }

  private _checkBodyUsed(): void {
    if (this._bodyUsed) {
      throw new TypeError('Body has already been consumed');
    }
  }

  private _bodyToString(): string {
    if (this.body === null || this.body === undefined) {
      return '';
    }
    if (typeof this.body === 'string') {
      return this.body;
    }
    // ArrayBuffer -> string
    const decoder = new TextDecoder();
    return decoder.decode(this.body);
  }
}
