import Foundation
import React

/// WebBridgeNativeModule — React Native TurboModule 구현 (iOS).
///
/// JS와 Native 사이의 양방향 통신을 담당한다:
/// - Native → JS: onRequestIntercepted 이벤트 발행
/// - JS → Native: resolveRequest/rejectRequest로 응답 전달
///
/// MockURLProtocol의 등록/해제를 관리한다.
@objc(WebBridgeNative)
class WebBridgeNativeModule: RCTEventEmitter {

    /// 싱글톤 참조 (MockURLProtocol에서 이벤트 발행 시 사용)
    static weak var shared: WebBridgeNativeModule?

    override init() {
        super.init()
        WebBridgeNativeModule.shared = self
    }

    @objc
    override static func requiresMainQueueSetup() -> Bool {
        return false
    }

    override func supportedEvents() -> [String] {
        return ["onRequestIntercepted"]
    }

    // MARK: - JS에서 호출되는 메서드

    /// Native 인터셉터를 활성화한다.
    /// URLProtocol.registerClass()로 MockURLProtocol을 등록한다.
    @objc
    func install() {
        URLProtocol.registerClass(MockURLProtocol.self)
        MockURLProtocol.isActive = true
    }

    /// Native 인터셉터를 비활성화한다.
    @objc
    func uninstall() {
        MockURLProtocol.isActive = false
        URLProtocol.unregisterClass(MockURLProtocol.self)
        MockRegistry.shared.clear()
    }

    /// JS → Native: mock 응답을 전달한다.
    /// - Parameters:
    ///   - requestId: 요청 식별자
    ///   - responseJSON: JSON 직렬화된 BridgeResponsePayload
    @objc
    func resolveRequest(_ requestId: String, responseJSON: String) {
        guard let data = responseJSON.data(using: .utf8),
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
            // JSON 파싱 실패 시 passthrough
            _ = MockRegistry.shared.reject(requestId: requestId)
            return
        }

        let status = json["status"] as? Int ?? 200
        let statusText = json["statusText"] as? String ?? ""

        // headers 파싱
        var headers: [String: String] = [:]
        if let headersDict = json["headers"] as? [String: String] {
            headers = headersDict
        }

        // rawHeaders 파싱
        var rawHeaders: [String: [String]]? = nil
        if let rawHeadersDict = json["rawHeaders"] as? [String: [String]] {
            rawHeaders = rawHeadersDict
        }

        let body = json["body"] as? String
        let bodyEncoding = json["bodyEncoding"] as? String ?? "text"

        let response = MockResponse(
            status: status,
            statusText: statusText,
            headers: headers,
            rawHeaders: rawHeaders,
            body: body,
            bodyEncoding: bodyEncoding
        )

        _ = MockRegistry.shared.resolve(requestId: requestId, response: response)
    }

    /// JS → Native: 핸들러 없음을 알린다.
    /// Native는 실제 네트워크 요청을 진행한다.
    @objc
    func rejectRequest(_ requestId: String) {
        _ = MockRegistry.shared.reject(requestId: requestId)
    }

    // MARK: - Native → JS 이벤트 발행

    /// 가로챈 요청을 JS에 이벤트로 발행한다.
    func emitRequestIntercepted(
        requestId: String,
        url: String,
        method: String,
        headers: [String: String],
        body: String?
    ) {
        // Headers를 JSON string으로 변환
        let headersJSON: String
        if let headersData = try? JSONSerialization.data(withJSONObject: headers),
           let headersString = String(data: headersData, encoding: .utf8) {
            headersJSON = headersString
        } else {
            headersJSON = "{}"
        }

        sendEvent(withName: "onRequestIntercepted", body: [
            "requestId": requestId,
            "url": url,
            "method": method,
            "headers": headersJSON,
            "body": body as Any,
            "bodyEncoding": "text"
        ])
    }
}
