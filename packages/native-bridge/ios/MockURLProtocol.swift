import Foundation

/// 요청-응답 매칭을 위한 공유 레지스트리.
/// JS에서 mock 응답이 오면 여기에 저장되고, startLoading에서 꺼내 반환.
final class MockRegistry {
    static let shared = MockRegistry()
    private init() {}

    /// requestId → 대기 중인 continuation
    private var pendingRequests: [String: (MockResponse?) -> Void] = [:]
    private let lock = NSLock()

    /// mock 대상 URL 패턴 (JS에서 등록)
    private var registeredIds: Set<String> = []

    func registerMock(requestId: String) {
        lock.lock()
        registeredIds.insert(requestId)
        lock.unlock()
    }

    func isRegistered(requestId: String) -> Bool {
        lock.lock()
        defer { lock.unlock() }
        return registeredIds.contains(requestId)
    }

    /// JS에서 mock 응답이 도착하면 호출
    func resolve(requestId: String, response: MockResponse?) {
        lock.lock()
        let continuation = pendingRequests.removeValue(forKey: requestId)
        registeredIds.remove(requestId)
        lock.unlock()
        continuation?(response)
    }

    /// native에서 JS 응답을 대기
    func waitForResponse(requestId: String, timeout: TimeInterval = 5.0, completion: @escaping (MockResponse?) -> Void) {
        lock.lock()
        pendingRequests[requestId] = completion
        lock.unlock()

        // 타임아웃 처리
        DispatchQueue.global().asyncAfter(deadline: .now() + timeout) { [weak self] in
            self?.lock.lock()
            let pending = self?.pendingRequests.removeValue(forKey: requestId)
            self?.registeredIds.remove(requestId)
            self?.lock.unlock()
            pending?(nil) // 타임아웃 → passthrough
        }
    }

    func cancel(requestId: String) {
        lock.lock()
        let continuation = pendingRequests.removeValue(forKey: requestId)
        registeredIds.remove(requestId)
        lock.unlock()
        continuation?(nil)
    }
}

/// JS에서 전달되는 mock 응답
struct MockResponse {
    let status: Int
    let statusText: String
    let headers: [String: String]
    let body: Data?
}

/// NSURLProtocol 서브클래스 — mock 응답을 native 레벨에서 합성.
/// DevTools가 이 레이어를 감시하므로 mock 응답도 표시됨.
class MockURLProtocol: URLProtocol {

    static let requestIdKey = "X-WebBridge-RequestId"

    override class func canInit(with request: URLRequest) -> Bool {
        guard let requestId = request.value(forHTTPHeaderField: requestIdKey) else {
            return false
        }
        return MockRegistry.shared.isRegistered(requestId: requestId)
    }

    override class func canonicalRequest(for request: URLRequest) -> URLRequest {
        return request
    }

    override func startLoading() {
        guard let requestId = request.value(forHTTPHeaderField: MockURLProtocol.requestIdKey) else {
            client?.urlProtocol(self, didFailWithError: NSError(
                domain: "WebBridgeNative", code: -1,
                userInfo: [NSLocalizedDescriptionKey: "Missing request ID"]
            ))
            return
        }

        MockRegistry.shared.waitForResponse(requestId: requestId, timeout: 5.0) { [weak self] mockResponse in
            guard let self = self else { return }

            if let mock = mockResponse {
                // 합성 응답 — DevTools가 이것도 본다
                guard let url = self.request.url else { return }
                let httpResponse = HTTPURLResponse(
                    url: url,
                    statusCode: mock.status,
                    httpVersion: "HTTP/1.1",
                    headerFields: mock.headers
                )!
                self.client?.urlProtocol(self, didReceive: httpResponse, cacheStoragePolicy: .notAllowed)
                if let body = mock.body {
                    self.client?.urlProtocol(self, didLoad: body)
                }
                self.client?.urlProtocolDidFinishLoading(self)
            } else {
                // Passthrough: 실제 네트워크 요청
                let config = URLSessionConfiguration.default
                let session = URLSession(configuration: config)

                // requestId 헤더 제거하여 무한 루프 방지
                var cleanRequest = self.request
                cleanRequest.setValue(nil, forHTTPHeaderField: MockURLProtocol.requestIdKey)

                session.dataTask(with: cleanRequest) { data, response, error in
                    if let error = error {
                        self.client?.urlProtocol(self, didFailWithError: error)
                        return
                    }
                    if let response = response {
                        self.client?.urlProtocol(self, didReceive: response, cacheStoragePolicy: .notAllowed)
                    }
                    if let data = data {
                        self.client?.urlProtocol(self, didLoad: data)
                    }
                    self.client?.urlProtocolDidFinishLoading(self)
                }.resume()
            }
        }
    }

    override func stopLoading() {
        if let requestId = request.value(forHTTPHeaderField: MockURLProtocol.requestIdKey) {
            MockRegistry.shared.cancel(requestId: requestId)
        }
    }
}
