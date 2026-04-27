package com.webbridgenative

// TODO: React Native TurboModule 의존성 추가 후 실제 구현
// import com.facebook.react.bridge.*
// import com.facebook.react.module.annotations.ReactModule

/**
 * TurboModule 구현 — JS ↔ Native 브릿지 (Android).
 *
 * JS에서 sendRequest()를 호출하면:
 * 1. 요청 JSON 파싱
 * 2. OkHttp로 실제 요청 또는 MockInterceptor로 합성
 * 3. 응답 JSON 반환
 */
// @ReactModule(name = WebBridgeNativeModule.NAME)
class WebBridgeNativeModule {

    companion object {
        const val NAME = "WebBridgeNative"
    }

    // TODO: 구현
    // @ReactMethod
    // fun sendRequest(requestJson: String, promise: Promise) {
    //     // 1. requestJson 파싱
    //     // 2. OkHttp 클라이언트로 실행
    //     // 3. 응답을 JSON으로 직렬화하여 promise.resolve
    //     promise.reject("NOT_IMPLEMENTED", "sendRequest not yet implemented")
    // }

    // @ReactMethod
    // fun registerMockHandler(requestId: String) {
    //     // MockInterceptor에 pending mock 등록
    // }

    // @ReactMethod
    // fun respondToMock(requestId: String, responseJson: String) {
    //     // MockInterceptor의 pending future에 응답 전달
    // }

    // @ReactMethod
    // fun cancelRequest(requestId: String) {
    //     // 진행 중인 요청 취소
    // }
}
