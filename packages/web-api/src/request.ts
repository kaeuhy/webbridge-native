/**
 * Fetch API Request spec-compliant implementation for WebBridge Native.
 *
 * Provides fromWebBridge/toWebBridge interop for the interceptor chain.
 */

import type { WebBridgeRequest } from '@webbridge-native/core';
import { WBHeaders } from './headers';

export type RequestCredentials = 'omit' | 'same-origin' | 'include';
export type RequestRedirect = 'follow' | 'manual' | 'error';

export interface WBRequestInit {
  method?: string;
  headers?: Record<string, string> | WBHeaders;
  body?: string | ArrayBuffer | null;
  credentials?: RequestCredentials;
  redirect?: RequestRedirect;
  signal?: AbortSignal;
}

let _idCounter = 0;

function generateId(): string {
  return `wb-req-${Date.now()}-${++_idCounter}`;
}

export class WBRequest {
  readonly url: string;
  readonly method: string;
  readonly headers: WBHeaders;
  readonly body: string | ArrayBuffer | null;
  readonly credentials: RequestCredentials;
  readonly redirect: RequestRedirect;
  readonly signal: AbortSignal | undefined;

  private _bodyUsed = false;

  constructor(input: string | WBRequest, init?: WBRequestInit) {
    if (input instanceof WBRequest) {
      this.url = input.url;
      this.method = init?.method ?? input.method;
      this.headers = new WBHeaders(
        init?.headers instanceof WBHeaders
          ? init.headers
          : init?.headers
            ? new WBHeaders(init.headers)
            : input.headers,
      );
      this.body = init?.body !== undefined ? (init.body ?? null) : input.body;
      this.credentials = init?.credentials ?? input.credentials;
      this.redirect = init?.redirect ?? input.redirect;
      this.signal = init?.signal ?? input.signal;
    } else {
      if (typeof input !== 'string' || input.length === 0) {
        throw new TypeError('Request URL must be a non-empty string');
      }
      this.url = input;
      this.method = (init?.method ?? 'GET').toUpperCase();
      this.headers =
        init?.headers instanceof WBHeaders
          ? new WBHeaders(init.headers)
          : new WBHeaders(init?.headers ?? {});
      this.body = init?.body ?? null;
      this.credentials = init?.credentials ?? 'same-origin';
      this.redirect = init?.redirect ?? 'follow';
      this.signal = init?.signal;
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
   * Creates an independent clone of this request.
   * The clone has bodyUsed reset to false.
   */
  clone(): WBRequest {
    return new WBRequest(this.url, {
      method: this.method,
      headers: new WBHeaders(this.headers),
      body: this.body,
      credentials: this.credentials,
      redirect: this.redirect,
      signal: this.signal,
    });
  }

  /**
   * Creates a WBRequest from a WebBridgeRequest (interceptor chain input).
   */
  static fromWebBridge(req: WebBridgeRequest): WBRequest {
    const request = new WBRequest(req.url, {
      method: req.method,
      headers: req.headers,
      body: req.body ?? null,
      credentials: req.credentials ?? 'same-origin',
      redirect: req.redirect ?? 'follow',
      signal: req.signal,
    });
    return request;
  }

  /**
   * Converts this WBRequest to a WebBridgeRequest for the interceptor chain.
   */
  toWebBridge(): WebBridgeRequest {
    return {
      url: this.url,
      method: this.method,
      headers: this.headers.toRecord(),
      body: this.body,
      credentials: this.credentials,
      redirect: this.redirect,
      signal: this.signal,
      id: generateId(),
    };
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
    const decoder = new TextDecoder();
    return decoder.decode(this.body);
  }
}
