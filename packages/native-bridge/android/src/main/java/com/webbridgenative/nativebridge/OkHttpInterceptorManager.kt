package com.webbridgenative.nativebridge

import okhttp3.Interceptor
import okhttp3.OkHttpClient

/**
 * OkHttpInterceptorManager — RN의 OkHttpClient에 Network Interceptor를 관리한다.
 *
 * RN은 내부적으로 OkHttpClient를 사용하며, OkHttpClientProvider를 통해
 * 커스텀 클라이언트를 제공할 수 있다.
 *
 * 이 매니저는 MockInterceptor의 설치/제거를 관리하며,
 * OkHttpClientFactory 패턴을 통해 RN의 네트워크 레이어에 주입된다.
 *
 * 참고: Network Interceptor(Application Interceptor가 아님)로 등록해야
 * DevTools가 요청을 관찰할 수 있다.
 */
object OkHttpInterceptorManager {
    private val interceptors = mutableListOf<Interceptor>()
    private var originalClientBuilder: (() -> OkHttpClient.Builder)? = null

    /**
     * MockInterceptor를 등록한다.
     */
    @Synchronized
    fun install(interceptor: Interceptor) {
        if (!interceptors.contains(interceptor)) {
            interceptors.add(interceptor)
        }
    }

    /**
     * MockInterceptor를 제거한다.
     */
    @Synchronized
    fun uninstall(interceptor: Interceptor) {
        interceptors.remove(interceptor)
    }

    /**
     * 등록된 모든 인터셉터를 OkHttpClient.Builder에 Network Interceptor로 추가한다.
     * RN의 OkHttpClientFactory에서 호출된다.
     */
    @Synchronized
    fun applyInterceptors(builder: OkHttpClient.Builder): OkHttpClient.Builder {
        for (interceptor in interceptors) {
            builder.addNetworkInterceptor(interceptor)
        }
        return builder
    }

    /**
     * 등록된 인터셉터 수.
     */
    val size: Int
        @Synchronized get() = interceptors.size

    /**
     * 모든 인터셉터를 제거한다.
     */
    @Synchronized
    fun clear() {
        interceptors.clear()
    }
}
