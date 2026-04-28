import Foundation

/// TurboModule 구현 — JS ↔ Native 브릿지 (iOS).
/// RN 0.73+ New Architecture 전용.
@objc(WebBridgeNative)
class WebBridgeNativeModule: NSObject {

    private let session: URLSession

    override init() {
        // MockURLProtocol을 protocolClasses에 등록
        let config = URLSessionConfiguration.default
        config.protocolClasses = [MockURLProtocol.self] + (config.protocolClasses ?? [])
        config.timeoutIntervalForRequest = 30
        self.session = URLSession(configuration: config)
        super.init()
    }

    /// JS에서 호출 — 요청을 native 레이어로 전달.
    @objc
    func sendRequest(_ requestJson: String,
                     resolve: @escaping (String) -> Void,
                     reject: @escaping (String, String, Error?) -> Void) {
        guard let data = requestJson.data(using: .utf8),
              let parsed = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let urlString = parsed["url"] as? String,
              let url = URL(string: urlString),
              let method = parsed["method"] as? String else {
            reject("INVALID_REQUEST", "Failed to parse request JSON", nil)
            return
        }

        let requestId = parsed["id"] as? String ?? UUID().uuidString
        let headers = parsed["headers"] as? [String: String] ?? [:]
        let bodyString = parsed["body"] as? String
        let bodyEncoding = parsed["bodyEncoding"] as? String ?? "utf8"

        var request = URLRequest(url: url)
        request.httpMethod = method

        for (key, value) in headers {
            request.setValue(value, forHTTPHeaderField: key)
        }

        // requestId를 헤더에 첨부 (MockURLProtocol이 참조)
        request.setValue(requestId, forHTTPHeaderField: MockURLProtocol.requestIdKey)

        // Body 처리
        if let bodyString = bodyString {
            if bodyEncoding == "base64" {
                request.httpBody = Data(base64Encoded: bodyString)
            } else {
                request.httpBody = bodyString.data(using: .utf8)
            }
        }

        session.dataTask(with: request) { data, response, error in
            if let error = error {
                reject("NETWORK_ERROR", error.localizedDescription, error)
                return
            }

            guard let httpResponse = response as? HTTPURLResponse else {
                reject("INVALID_RESPONSE", "Response is not HTTP", nil)
                return
            }

            // 응답 헤더 변환
            var responseHeaders: [String: String] = [:]
            var rawHeaders: [String: [String]] = [:]
            for (key, value) in httpResponse.allHeaderFields {
                let k = String(describing: key)
                let v = String(describing: value)
                responseHeaders[k] = v

                // Set-Cookie는 배열로
                if k.lowercased() == "set-cookie" {
                    rawHeaders["set-cookie"] = v.components(separatedBy: ", ")
                }
            }

            // Body 인코딩
            var bodyValue: String? = nil
            var bodyEnc = "utf8"
            if let data = data {
                if let text = String(data: data, encoding: .utf8) {
                    bodyValue = text
                } else {
                    bodyValue = data.base64EncodedString()
                    bodyEnc = "base64"
                }
            }

            let result: [String: Any?] = [
                "url": httpResponse.url?.absoluteString ?? urlString,
                "status": httpResponse.statusCode,
                "statusText": HTTPURLResponse.localizedString(forStatusCode: httpResponse.statusCode),
                "headers": responseHeaders,
                "rawHeaders": rawHeaders.isEmpty ? nil : rawHeaders,
                "body": bodyValue,
                "bodyEncoding": bodyEnc,
            ]

            if let jsonData = try? JSONSerialization.data(withJSONObject: result.compactMapValues { $0 }),
               let jsonString = String(data: jsonData, encoding: .utf8) {
                resolve(jsonString)
            } else {
                reject("SERIALIZATION_ERROR", "Failed to serialize response", nil)
            }
        }.resume()
    }

    @objc
    func registerMockHandler(_ requestId: String) {
        MockRegistry.shared.registerMock(requestId: requestId)
    }

    @objc
    func respondToMock(_ requestId: String, responseJson: String) {
        guard let data = responseJson.data(using: .utf8),
              let parsed = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else {
            MockRegistry.shared.resolve(requestId: requestId, response: nil)
            return
        }

        let status = parsed["status"] as? Int ?? 200
        let statusText = parsed["statusText"] as? String ?? ""
        let headers = parsed["headers"] as? [String: String] ?? [:]
        let bodyString = parsed["body"] as? String
        let bodyEncoding = parsed["bodyEncoding"] as? String ?? "utf8"

        var bodyData: Data? = nil
        if let bodyString = bodyString {
            if bodyEncoding == "base64" {
                bodyData = Data(base64Encoded: bodyString)
            } else {
                bodyData = bodyString.data(using: .utf8)
            }
        }

        let response = MockResponse(
            status: status,
            statusText: statusText,
            headers: headers,
            body: bodyData
        )
        MockRegistry.shared.resolve(requestId: requestId, response: response)
    }

    @objc
    func cancelRequest(_ requestId: String) {
        MockRegistry.shared.cancel(requestId: requestId)
    }

    @objc
    static func requiresMainQueueSetup() -> Bool {
        return false
    }
}
