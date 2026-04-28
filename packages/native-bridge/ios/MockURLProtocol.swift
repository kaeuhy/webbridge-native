import Foundation

/// MockURLProtocol — NSURLProtocol 서브클래스.
///
/// 모든 URLSession 요청을 가로채서 JS 핸들러에 전달한다.
/// DevTools는 NSURLProtocol 레벨에서 요청을 관찰하므로,
/// 여기서 처리하면 DevTools에 요청과 응답 모두 표시된다.
///
/// 동작 흐름:
/// 1. canInit(): 활성 상태이고 아직 처리하지 않은 요청이면 true
/// 2. startLoading(): UUID 생성 → Bridge로 전송 → 콜백 대기
/// 3. Mock 응답 수신 시: ResponseSynthesizer로 합성 → client에 전달
/// 4. 핸들러 없음(nil) 시: 실제 네트워크 요청 수행 (재귀 방지 태그 추가)
class MockURLProtocol: URLProtocol {

    /// 인터셉터 활성 상태
    static var isActive = false

    /// 재귀 방지 태그 키
    private static let handledKey = "WebBridgeHandled"

    /// 진행 중인 데이터 태스크 (passthrough용)
    private var dataTask: URLSessionDataTask?

    // MARK: - NSURLProtocol overrides

    override class func canInit(with request: URLRequest) -> Bool {
        // 비활성이면 무시
        guard isActive else { return false }

        // 이미 처리한 요청이면 무시 (재귀 방지)
        guard URLProtocol.property(
            forKey: handledKey,
            in: request
        ) == nil else {
            return false
        }

        return true
    }

    override class func canonicalRequest(for request: URLRequest) -> URLRequest {
        return request
    }

    override func startLoading() {
        let requestId = UUID().uuidString

        // 요청 정보 추출
        let url = request.url?.absoluteString ?? ""
        let method = request.httpMethod ?? "GET"

        // Headers 추출
        var headers: [String: String] = [:]
        if let allHeaders = request.allHTTPHeaderFields {
            headers = allHeaders
        }

        // Body 추출
        var bodyString: String? = nil
        if let bodyData = request.httpBody {
            bodyString = String(data: bodyData, encoding: .utf8)
        }

        // MockRegistry에 콜백 등록 + Bridge 이벤트 발행
        MockRegistry.shared.register(requestId: requestId) { [weak self] mockResponse in
            guard let self = self else { return }

            if let response = mockResponse {
                // Mock 응답 합성 및 전달
                self.deliverMockResponse(response)
            } else {
                // 핸들러 없음 → 실제 네트워크 요청
                self.performPassthrough()
            }
        }

        // JS에 이벤트 발행
        WebBridgeNativeModule.shared?.emitRequestIntercepted(
            requestId: requestId,
            url: url,
            method: method,
            headers: headers,
            body: bodyString
        )
    }

    override func stopLoading() {
        dataTask?.cancel()
        dataTask = nil
    }

    // MARK: - Private

    /// Mock 응답을 URLProtocol client에 전달한다.
    private func deliverMockResponse(_ mockResponse: MockResponse) {
        guard let url = request.url else {
            client?.urlProtocol(self, didFailWithError: NSError(
                domain: "WebBridgeNative",
                code: -1,
                userInfo: [NSLocalizedDescriptionKey: "Missing URL"]
            ))
            return
        }

        let (httpResponse, bodyData) = ResponseSynthesizer.build(
            url: url,
            mockResponse: mockResponse
        )

        client?.urlProtocol(self, didReceive: httpResponse, cacheStoragePolicy: .notAllowed)

        if !bodyData.isEmpty {
            client?.urlProtocol(self, didLoad: bodyData)
        }

        client?.urlProtocolDidFinishLoading(self)
    }

    /// 실제 네트워크 요청을 수행한다 (passthrough).
    /// 재귀를 방지하기 위해 요청에 태그를 추가한다.
    private func performPassthrough() {
        guard let mutableRequest = (request as NSURLRequest).mutableCopy() as? NSMutableURLRequest else {
            client?.urlProtocol(self, didFailWithError: NSError(
                domain: "WebBridgeNative",
                code: -2,
                userInfo: [NSLocalizedDescriptionKey: "Cannot create mutable request"]
            ))
            return
        }

        // 재귀 방지 태그 설정
        URLProtocol.setProperty(true, forKey: MockURLProtocol.handledKey, in: mutableRequest)

        let session = URLSession(configuration: .default)
        dataTask = session.dataTask(with: mutableRequest as URLRequest) { [weak self] data, response, error in
            guard let self = self else { return }

            if let error = error {
                self.client?.urlProtocol(self, didFailWithError: error)
                return
            }

            if let response = response {
                self.client?.urlProtocol(self, didReceive: response, cacheStoragePolicy: .notAllowed)
            }

            if let data = data, !data.isEmpty {
                self.client?.urlProtocol(self, didLoad: data)
            }

            self.client?.urlProtocolDidFinishLoading(self)
        }
        dataTask?.resume()
    }
}
