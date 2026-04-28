package com.webbridgenative.nativebridge

import java.util.concurrent.CompletableFuture
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.TimeUnit
import java.util.concurrent.TimeoutException

/**
 * MockResponse — JS에서 반환된 mock 응답 데이터.
 */
data class MockResponse(
    val status: Int,
    val statusText: String,
    val headers: Map<String, String>,
    val rawHeaders: Map<String, List<String>>?,
    val body: String?,
    val bodyEncoding: String // "text" or "base64"
)

/**
 * MockRegistry — 대기 중인 요청의 스레드 세이프 레지스트리.
 *
 * Native 인터셉터가 요청을 가로채면 requestId로 CompletableFuture를 등록하고,
 * JS가 resolveRequest/rejectRequest를 호출하면 future를 완료한다.
 *
 * ConcurrentHashMap 기반으로 동시 50+ 요청을 안전하게 처리한다.
 */
class MockRegistry {
    private val pending = ConcurrentHashMap<String, CompletableFuture<MockResponse?>>()

    /** 현재 대기 중인 요청 수 */
    val size: Int get() = pending.size

    /**
     * 요청을 등록하고 응답을 기다리는 Future를 반환한다.
     */
    fun register(requestId: String): CompletableFuture<MockResponse?> {
        val future = CompletableFuture<MockResponse?>()
        pending[requestId] = future
        return future
    }

    /**
     * 요청에 mock 응답을 전달한다.
     * @return 해당 requestId가 존재했는지 여부
     */
    fun resolve(requestId: String, response: MockResponse): Boolean {
        val future = pending.remove(requestId) ?: return false
        future.complete(response)
        return true
    }

    /**
     * 요청에 passthrough를 전달한다 (핸들러 없음 → 실제 네트워크).
     * @return 해당 requestId가 존재했는지 여부
     */
    fun reject(requestId: String): Boolean {
        val future = pending.remove(requestId) ?: return false
        future.complete(null)
        return true
    }

    /**
     * Future의 결과를 타임아웃과 함께 기다린다.
     * 타임아웃 시 null(passthrough)을 반환한다.
     */
    fun awaitResponse(
        future: CompletableFuture<MockResponse?>,
        requestId: String,
        timeoutMs: Long = 5000
    ): MockResponse? {
        return try {
            future.get(timeoutMs, TimeUnit.MILLISECONDS)
        } catch (e: TimeoutException) {
            pending.remove(requestId)
            null
        } catch (e: Exception) {
            pending.remove(requestId)
            null
        }
    }

    /** 모든 대기 중인 요청을 passthrough로 완료하고 정리한다. */
    fun clear() {
        val entries = pending.entries.toList()
        for ((_, future) in entries) {
            future.complete(null)
        }
        pending.clear()
    }
}
