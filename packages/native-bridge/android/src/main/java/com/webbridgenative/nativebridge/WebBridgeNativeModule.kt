package com.webbridgenative.nativebridge

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule
import org.json.JSONObject

/**
 * WebBridgeNativeModule — React Native TurboModule 구현 (Android).
 *
 * JS와 Native 사이의 양방향 통신을 담당한다:
 * - Native → JS: onRequestIntercepted 이벤트 발행
 * - JS → Native: resolveRequest/rejectRequest로 응답 전달
 *
 * MockInterceptor와 MockRegistry를 관리하며,
 * install/uninstall로 인터셉터 생명주기를 제어한다.
 */
class WebBridgeNativeModule(
    private val reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext) {

    private val registry = MockRegistry()
    private val interceptor = MockInterceptor(this, registry)

    override fun getName(): String = NAME

    companion object {
        const val NAME = "WebBridgeNative"
    }

    /**
     * Native 인터셉터를 활성화한다.
     * OkHttp 클라이언트에 MockInterceptor를 Network Interceptor로 등록한다.
     */
    @ReactMethod
    fun install() {
        interceptor.isActive = true
        OkHttpInterceptorManager.install(interceptor)
    }

    /**
     * Native 인터셉터를 비활성화한다.
     */
    @ReactMethod
    fun uninstall() {
        interceptor.isActive = false
        OkHttpInterceptorManager.uninstall(interceptor)
        registry.clear()
    }

    /**
     * JS → Native: mock 응답을 전달한다.
     * @param requestId 요청 식별자
     * @param responseJSON JSON 직렬화된 BridgeResponsePayload
     */
    @ReactMethod
    fun resolveRequest(requestId: String, responseJSON: String) {
        try {
            val json = JSONObject(responseJSON)
            val headersJson = json.optJSONObject("headers")
            val headers = mutableMapOf<String, String>()
            headersJson?.keys()?.forEach { key ->
                headers[key] = headersJson.getString(key)
            }

            // rawHeaders 파싱
            val rawHeadersJson = json.optJSONObject("rawHeaders")
            val rawHeaders = if (rawHeadersJson != null) {
                val map = mutableMapOf<String, List<String>>()
                rawHeadersJson.keys().forEach { key ->
                    val arr = rawHeadersJson.getJSONArray(key)
                    val values = mutableListOf<String>()
                    for (i in 0 until arr.length()) {
                        values.add(arr.getString(i))
                    }
                    map[key] = values
                }
                map
            } else null

            val response = MockResponse(
                status = json.getInt("status"),
                statusText = json.optString("statusText", ""),
                headers = headers,
                rawHeaders = rawHeaders,
                body = json.optString("body", null),
                bodyEncoding = json.optString("bodyEncoding", "text")
            )

            registry.resolve(requestId, response)
        } catch (e: Exception) {
            // JSON 파싱 실패 시 passthrough
            registry.reject(requestId)
        }
    }

    /**
     * JS → Native: 핸들러 없음을 알린다.
     * Native는 실제 네트워크 요청을 진행한다.
     */
    @ReactMethod
    fun rejectRequest(requestId: String) {
        registry.reject(requestId)
    }

    /**
     * Native → JS: 가로챈 요청을 이벤트로 발행한다.
     */
    fun emitRequestIntercepted(
        requestId: String,
        url: String,
        method: String,
        headers: Map<String, String>,
        body: String?
    ) {
        val params = Arguments.createMap().apply {
            putString("requestId", requestId)
            putString("url", url)
            putString("method", method)
            putString("headers", JSONObject(headers).toString())
            putString("body", body)
            putString("bodyEncoding", "text")
        }

        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit("onRequestIntercepted", params)
    }

    /**
     * RCTEventEmitter 호환: 이벤트 리스너 등록.
     */
    @ReactMethod
    fun addListener(@Suppress("UNUSED_PARAMETER") eventName: String) {
        // JS에서 NativeEventEmitter 생성 시 호출됨
    }

    /**
     * RCTEventEmitter 호환: 이벤트 리스너 제거.
     */
    @ReactMethod
    fun removeListeners(@Suppress("UNUSED_PARAMETER") count: Int) {
        // JS에서 NativeEventEmitter 제거 시 호출됨
    }
}
