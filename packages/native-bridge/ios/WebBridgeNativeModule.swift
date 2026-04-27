import Foundation

/// TurboModule 구현 — JS ↔ Native 브릿지.
/// RN 0.73+ New Architecture 전용.
///
/// JS에서 sendRequest()를 호출하면:
/// 1. 요청 JSON 파싱
/// 2. NSURLSession으로 실제 요청 또는 MockURLProtocol로 합성
/// 3. 응답 JSON 반환
@objc(WebBridgeNative)
class WebBridgeNativeModule: NSObject {

    /// JS에서 호출 — 요청을 native 레이어로 전달.
    @objc
    func sendRequest(_ requestJson: String,
                     resolve: @escaping (String) -> Void,
                     reject: @escaping (String, String, Error?) -> Void) {
        // TODO: 구현
        // 1. requestJson 파싱
        // 2. URLRequest 생성
        // 3. URLSession.shared.dataTask로 실행
        // 4. 응답을 JSON으로 직렬화하여 resolve
        reject("NOT_IMPLEMENTED", "sendRequest not yet implemented", nil)
    }

    /// mock 핸들러 등록 알림.
    @objc
    func registerMockHandler(_ requestId: String) {
        // TODO: MockURLProtocol에 pending mock 등록
    }

    /// JS에서 생성한 mock 응답을 native로 전달.
    @objc
    func respondToMock(_ requestId: String, responseJson: String) {
        // TODO: MockURLProtocol의 pending future에 응답 전달
    }

    /// 요청 취소.
    @objc
    func cancelRequest(_ requestId: String) {
        // TODO: 진행 중인 URLSessionTask 취소
    }

    /// TurboModule 요구 — 메인 큐 필요 여부.
    @objc
    static func requiresMainQueueSetup() -> Bool {
        return false
    }
}
