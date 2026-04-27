package com.webbridgenative

import okhttp3.Interceptor
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.Protocol
import okhttp3.Response
import okhttp3.ResponseBody.Companion.toResponseBody
import java.util.concurrent.CompletableFuture
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.TimeUnit
import java.util.concurrent.TimeoutException

/**
 * Mock 응답 데이터.
 */
data class MockResponse(
    val status: Int,
    val statusText: String,
    val headers: Map<String, String>,
    val body: ByteArray?,
)

/**
 * 공유 레지스트리 — JS에서 mock 응답이 오면 저장, 인터셉터에서 꺼내 반환.
 */
object MockRegistry {
    private val pendingRequests = ConcurrentHashMap<String, CompletableFuture<MockResponse?>>()
    private val registeredIds = ConcurrentHashMap.newKeySet<String>()

    fun registerMock(requestId: String) {
        registeredIds.add(requestId)
        pendingRequests[requestId] = CompletableFuture()
    }

    fun isRegistered(requestId: String): Boolean = registeredIds.contains(requestId)

    fun resolve(requestId: String, response: MockResponse?) {
        registeredIds.remove(requestId)
        pendingRequests.remove(requestId)?.complete(response)
    }

    fun waitForResponse(requestId: String, timeoutMs: Long = 5000): MockResponse? {
        val future = pendingRequests[requestId] ?: return null
        return try {
            future.get(timeoutMs, TimeUnit.MILLISECONDS)
        } catch (e: TimeoutException) {
            registeredIds.remove(requestId)
            pendingRequests.remove(requestId)
            null
        }
    }

    fun cancel(requestId: String) {
        registeredIds.remove(requestId)
        pendingRequests.remove(requestId)?.complete(null)
    }
}

/**
 * OkHttp Network Interceptor — mock 응답을 native 레벨에서 합성.
 *
 * 반드시 addNetworkInterceptor()로 등록해야 DevTools에 표시됨.
 * addInterceptor()로 등록하면 DevTools에 안 보임 (TS-204).
 */
class MockInterceptor : Interceptor {

    companion object {
        const val REQUEST_ID_HEADER = "X-WebBridge-RequestId"
    }

    override fun intercept(chain: Interceptor.Chain): Response {
        val request = chain.request()
        val requestId = request.header(REQUEST_ID_HEADER)

        // requestId가 없거나 mock 대상이 아니면 통과
        if (requestId == null || !MockRegistry.isRegistered(requestId)) {
            return chain.proceed(request)
        }

        // JS에서 mock 응답 대기
        val mockResponse = MockRegistry.waitForResponse(requestId, 5000)

        if (mockResponse != null) {
            // 합성 응답 — DevTools가 이것도 기록한다
            val responseBuilder = Response.Builder()
                .request(request)
                .protocol(Protocol.HTTP_1_1)
                .code(mockResponse.status)
                .message(mockResponse.statusText.ifEmpty { "OK" })

            // 헤더 추가
            for ((key, value) in mockResponse.headers) {
                responseBuilder.addHeader(key, value)
            }

            // Body
            val body = mockResponse.body ?: ByteArray(0)
            val contentType = mockResponse.headers["Content-Type"]?.toMediaTypeOrNull()
            responseBuilder.body(body.toResponseBody(contentType))

            return responseBuilder.build()
        }

        // Passthrough: mock 응답이 없으면 실제 네트워크 요청
        // requestId 헤더 제거하여 깨끗하게
        val cleanRequest = request.newBuilder()
            .removeHeader(REQUEST_ID_HEADER)
            .build()
        return chain.proceed(cleanRequest)
    }
}
