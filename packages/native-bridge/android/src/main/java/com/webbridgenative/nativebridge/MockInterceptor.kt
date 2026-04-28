package com.webbridgenative.nativebridge

import okhttp3.Interceptor
import okhttp3.Response
import okio.Buffer
import java.util.UUID

/**
 * MockInterceptor — OkHttp **Network** Interceptor.
 *
 * 반드시 Network Interceptor로 등록해야 한다 (Application Interceptor가 아님).
 * RN DevTools는 Network Interceptor 레벨에서 요청을 관찰하므로,
 * 여기서 short-circuit해야 DevTools에 요청과 응답 모두 표시된다.
 *
 * 동작 흐름:
 * 1. 요청 가로채기 → requestId 생성
 * 2. JS에 이벤트 발행 (onRequestIntercepted)
 * 3. CompletableFuture.get(5s)로 JS 응답 대기 (OkHttp 워커 스레드에서 블로킹)
 * 4. Mock 응답 수신 시 → ResponseSynthesizer로 OkHttp Response 합성
 * 5. 핸들러 없음(null) 시 → chain.proceed()로 실제 네트워크 요청
 */
class MockInterceptor(
    private val module: WebBridgeNativeModule,
    private val registry: MockRegistry,
    private val timeoutMs: Long = 5000
) : Interceptor {

    @Volatile
    var isActive: Boolean = false

    override fun intercept(chain: Interceptor.Chain): Response {
        val request = chain.request()

        // 비활성 상태면 바로 진행
        if (!isActive) {
            return chain.proceed(request)
        }

        val requestId = UUID.randomUUID().toString()

        // 요청 body를 문자열로 읽기
        val bodyString = request.body?.let { body ->
            try {
                val buffer = Buffer()
                body.writeTo(buffer)
                buffer.readUtf8()
            } catch (e: Exception) {
                null
            }
        }

        // 요청 headers를 Map으로 변환
        val headers = mutableMapOf<String, String>()
        for (i in 0 until request.headers.size) {
            headers[request.headers.name(i)] = request.headers.value(i)
        }

        // Registry에 Future 등록
        val future = registry.register(requestId)

        // JS에 이벤트 발행
        module.emitRequestIntercepted(
            requestId = requestId,
            url = request.url.toString(),
            method = request.method,
            headers = headers,
            body = bodyString
        )

        // JS 응답 대기 (OkHttp 워커 스레드에서 블로킹 — 메인 스레드 아님)
        val mockResponse = registry.awaitResponse(future, requestId, timeoutMs)

        return if (mockResponse != null) {
            // Mock 응답 합성
            ResponseSynthesizer.build(request, mockResponse)
        } else {
            // 핸들러 없음 또는 타임아웃 → 실제 네트워크 요청
            chain.proceed(request)
        }
    }
}
