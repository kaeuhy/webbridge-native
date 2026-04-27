package com.webbridgenative

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.module.annotations.ReactModule
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import org.json.JSONArray
import java.io.IOException
import java.util.Base64
import java.util.concurrent.TimeUnit

/**
 * TurboModule 구현 — JS ↔ Native 브릿지 (Android).
 * RN 0.73+ New Architecture 전용.
 */
@ReactModule(name = WebBridgeNativeModule.NAME)
class WebBridgeNativeModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        const val NAME = "WebBridgeNative"
    }

    override fun getName(): String = NAME

    private val client: OkHttpClient = OkHttpClient.Builder()
        .addNetworkInterceptor(MockInterceptor())
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .build()

    @ReactMethod
    fun sendRequest(requestJson: String, promise: Promise) {
        // 백그라운드 스레드에서 실행
        Thread {
            try {
                val parsed = JSONObject(requestJson)
                val url = parsed.getString("url")
                val method = parsed.getString("method")
                val requestId = parsed.optString("id", "")
                val headers = parsed.optJSONObject("headers")
                val bodyStr = parsed.optString("body", "")
                val bodyEncoding = parsed.optString("bodyEncoding", "utf8")

                val requestBuilder = Request.Builder()
                    .url(url)

                // 헤더 설정
                if (headers != null) {
                    val keys = headers.keys()
                    while (keys.hasNext()) {
                        val key = keys.next()
                        requestBuilder.addHeader(key, headers.getString(key))
                    }
                }

                // requestId 헤더 (MockInterceptor가 참조)
                if (requestId.isNotEmpty()) {
                    requestBuilder.addHeader(MockInterceptor.REQUEST_ID_HEADER, requestId)
                }

                // Body 처리
                val body = if (bodyStr.isNotEmpty()) {
                    val bytes = if (bodyEncoding == "base64") {
                        Base64.getDecoder().decode(bodyStr)
                    } else {
                        bodyStr.toByteArray(Charsets.UTF_8)
                    }
                    val contentType = headers?.optString("Content-Type", "application/octet-stream")
                        ?: "application/octet-stream"
                    bytes.toRequestBody(contentType.toMediaTypeOrNull())
                } else {
                    null
                }

                requestBuilder.method(method, body)

                val response = client.newCall(requestBuilder.build()).execute()

                // 응답 변환
                val responseHeaders = JSONObject()
                val rawHeaders = JSONObject()

                for (name in response.headers.names()) {
                    val values = response.headers.values(name)
                    responseHeaders.put(name, values.last())
                    if (name.equals("set-cookie", ignoreCase = true) && values.size > 1) {
                        rawHeaders.put("set-cookie", JSONArray(values))
                    }
                }

                // Body
                val responseBody = response.body?.bytes()
                var bodyValue: String? = null
                var bodyEnc = "utf8"

                if (responseBody != null) {
                    val text = try {
                        String(responseBody, Charsets.UTF_8)
                    } catch (e: Exception) {
                        null
                    }

                    if (text != null) {
                        bodyValue = text
                    } else {
                        bodyValue = Base64.getEncoder().encodeToString(responseBody)
                        bodyEnc = "base64"
                    }
                }

                val result = JSONObject().apply {
                    put("url", response.request.url.toString())
                    put("status", response.code)
                    put("statusText", response.message)
                    put("headers", responseHeaders)
                    if (rawHeaders.length() > 0) {
                        put("rawHeaders", rawHeaders)
                    }
                    put("body", bodyValue)
                    put("bodyEncoding", bodyEnc)
                }

                promise.resolve(result.toString())
                response.close()

            } catch (e: IOException) {
                promise.reject("NETWORK_ERROR", e.message, e)
            } catch (e: Exception) {
                promise.reject("REQUEST_ERROR", e.message, e)
            }
        }.start()
    }

    @ReactMethod
    fun registerMockHandler(requestId: String) {
        MockRegistry.registerMock(requestId)
    }

    @ReactMethod
    fun respondToMock(requestId: String, responseJson: String) {
        try {
            val parsed = JSONObject(responseJson)
            val status = parsed.optInt("status", 200)
            val statusText = parsed.optString("statusText", "")
            val headersObj = parsed.optJSONObject("headers")
            val bodyStr = parsed.optString("body", "")
            val bodyEncoding = parsed.optString("bodyEncoding", "utf8")

            val headers = mutableMapOf<String, String>()
            if (headersObj != null) {
                val keys = headersObj.keys()
                while (keys.hasNext()) {
                    val key = keys.next()
                    headers[key] = headersObj.getString(key)
                }
            }

            val body = if (bodyStr.isNotEmpty()) {
                if (bodyEncoding == "base64") {
                    Base64.getDecoder().decode(bodyStr)
                } else {
                    bodyStr.toByteArray(Charsets.UTF_8)
                }
            } else {
                null
            }

            MockRegistry.resolve(requestId, MockResponse(status, statusText, headers, body))
        } catch (e: Exception) {
            MockRegistry.resolve(requestId, null)
        }
    }

    @ReactMethod
    fun cancelRequest(requestId: String) {
        MockRegistry.cancel(requestId)
    }
}
