package com.webbridgenative.nativebridge

import android.util.Base64
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.Protocol
import okhttp3.Request
import okhttp3.Response
import okhttp3.ResponseBody.Companion.toResponseBody

/**
 * ResponseSynthesizer — JS mock 응답을 OkHttp Response로 변환한다.
 *
 * JS에서 전달된 MockResponse를 OkHttp가 기대하는 Response 객체로 합성하여,
 * 실제 네트워크에서 받은 것처럼 DevTools에 표시되게 한다.
 */
object ResponseSynthesizer {

    /**
     * MockResponse를 OkHttp Response로 변환한다.
     *
     * @param request 원본 OkHttp Request
     * @param mockResponse JS에서 전달된 mock 응답 데이터
     * @return 합성된 OkHttp Response
     */
    fun build(request: Request, mockResponse: MockResponse): Response {
        // Body 처리: base64 → bytes, text → string bytes
        val bodyBytes = when {
            mockResponse.body == null -> ByteArray(0)
            mockResponse.bodyEncoding == "base64" ->
                Base64.decode(mockResponse.body, Base64.DEFAULT)
            else -> mockResponse.body.toByteArray(Charsets.UTF_8)
        }

        // Content-Type 추출
        val contentType = mockResponse.headers["content-type"]
            ?: mockResponse.headers["Content-Type"]
            ?: "application/octet-stream"

        val mediaType = contentType.toMediaTypeOrNull()
        val responseBody = bodyBytes.toResponseBody(mediaType)

        // Response builder
        val builder = Response.Builder()
            .request(request)
            .protocol(Protocol.HTTP_1_1)
            .code(mockResponse.status)
            .message(mockResponse.statusText)
            .body(responseBody)

        // Headers 추가
        for ((key, value) in mockResponse.headers) {
            builder.addHeader(key, value)
        }

        // rawHeaders 추가 (다중 값 헤더, e.g., Set-Cookie)
        mockResponse.rawHeaders?.forEach { (key, values) ->
            // 기존 단일 값 헤더를 제거하고 다중 값으로 대체
            builder.removeHeader(key)
            for (value in values) {
                builder.addHeader(key, value)
            }
        }

        return builder.build()
    }
}
