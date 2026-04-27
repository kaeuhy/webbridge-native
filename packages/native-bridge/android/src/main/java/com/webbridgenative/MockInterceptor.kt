package com.webbridgenative

// TODO: OkHttp 의존성 추가 후 실제 구현
// import okhttp3.Interceptor
// import okhttp3.Protocol
// import okhttp3.Response
// import okhttp3.ResponseBody.Companion.toResponseBody
// import java.util.concurrent.CompletableFuture
// import java.util.concurrent.TimeUnit

/**
 * OkHttp Network Interceptor — mock 응답을 native 레벨에서 합성.
 *
 * 반드시 Network Interceptor로 등록해야 DevTools에 표시됨.
 * Application Interceptor로 등록하면 DevTools에 안 보임 (TS-204 참고).
 *
 * 등록: client.addNetworkInterceptor(MockInterceptor(bridge))
 *
 * 동작:
 * 1. 요청이 mock 대상인지 Bridge를 통해 JS에 질의
 * 2. JS에서 mock 응답이 오면 OkHttp Response로 합성하여 반환
 * 3. mock 대상이 아니면 chain.proceed()로 실제 네트워크 요청
 */
class MockInterceptor {
    // TODO: Interceptor 인터페이스 구현
    //
    // override fun intercept(chain: Interceptor.Chain): Response {
    //     val request = chain.request()
    //
    //     // JS에 요청 전달, 응답 대기
    //     val future = CompletableFuture<MockResponse?>()
    //     bridge.askJS(request.toJSON()) { result ->
    //         future.complete(result)
    //     }
    //
    //     val mockResponse = try {
    //         future.get(5, TimeUnit.SECONDS)
    //     } catch (e: Exception) {
    //         null
    //     }
    //
    //     return if (mockResponse != null) {
    //         // 합성 응답 — DevTools가 이것도 본다
    //         Response.Builder()
    //             .request(request)
    //             .protocol(Protocol.HTTP_1_1)
    //             .code(mockResponse.status)
    //             .message(mockResponse.statusText)
    //             .body(mockResponse.body.toResponseBody())
    //             .apply {
    //                 mockResponse.headers.forEach { (k, v) ->
    //                     addHeader(k, v)
    //                 }
    //             }
    //             .build()
    //     } else {
    //         // passthrough
    //         chain.proceed(request)
    //     }
    // }
}
