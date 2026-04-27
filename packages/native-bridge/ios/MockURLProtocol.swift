import Foundation

/// NSURLProtocol 서브클래스 — mock 응답을 native 레벨에서 합성.
/// DevTools가 이 레이어를 감시하므로 mock 응답도 표시됨.
///
/// 등록: URLProtocol.registerClass(MockURLProtocol.self)
/// 또는 URLSessionConfiguration.protocolClasses에 추가.
class MockURLProtocol: URLProtocol {

    /// mock 대상 요청인지 판별.
    /// MockRegistry에 등록된 핸들러가 있으면 true.
    override class func canInit(with request: URLRequest) -> Bool {
        // TODO: MockRegistry.shared.hasHandler(for: request)
        return false
    }

    override class func canonicalRequest(for request: URLRequest) -> URLRequest {
        return request
    }

    /// 요청 처리 시작.
    /// Bridge를 통해 JS에 요청을 전달하고, 합성 응답을 반환.
    override func startLoading() {
        // TODO: Bridge를 통한 JS 핸들러 호출
        //
        // Bridge.shared.askJS(request: request) { [weak self] mockResponse in
        //     guard let self = self else { return }
        //
        //     if let mock = mockResponse {
        //         let httpResponse = HTTPURLResponse(
        //             url: self.request.url!,
        //             statusCode: mock.status,
        //             httpVersion: "HTTP/1.1",
        //             headerFields: mock.headers
        //         )!
        //         self.client?.urlProtocol(self, didReceive: httpResponse,
        //                                  cacheStoragePolicy: .notAllowed)
        //         self.client?.urlProtocol(self, didLoad: mock.body)
        //         self.client?.urlProtocolDidFinishLoading(self)
        //     } else {
        //         // passthrough: 실제 네트워크 요청
        //         let session = URLSession(configuration: .default)
        //         session.dataTask(with: self.request) { data, response, error in
        //             if let error = error {
        //                 self.client?.urlProtocol(self, didFailWithError: error)
        //                 return
        //             }
        //             if let response = response {
        //                 self.client?.urlProtocol(self, didReceive: response,
        //                                          cacheStoragePolicy: .notAllowed)
        //             }
        //             if let data = data {
        //                 self.client?.urlProtocol(self, didLoad: data)
        //             }
        //             self.client?.urlProtocolDidFinishLoading(self)
        //         }.resume()
        //     }
        // }
    }

    /// 요청 취소.
    override func stopLoading() {
        // TODO: 진행 중인 Bridge 요청 취소
    }
}
