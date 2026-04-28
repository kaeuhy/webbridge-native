import Foundation

/// ResponseSynthesizer — JS mock 응답을 native HTTP 응답으로 변환한다.
///
/// JS에서 전달된 MockResponse를 HTTPURLResponse + Data로 합성하여,
/// NSURLProtocol의 client에 전달할 수 있는 형태로 만든다.
enum ResponseSynthesizer {

    /// MockResponse를 HTTPURLResponse와 body Data로 변환한다.
    ///
    /// - Parameters:
    ///   - url: 원본 요청 URL
    ///   - mockResponse: JS에서 전달된 mock 응답 데이터
    /// - Returns: (HTTPURLResponse, body Data) 튜플
    static func build(
        url: URL,
        mockResponse: MockResponse
    ) -> (HTTPURLResponse, Data) {
        // Headers 합성 (단일 값 + rawHeaders 다중 값)
        var headerFields: [String: String] = mockResponse.headers

        // rawHeaders가 있으면 다중 값을 쉼표로 합쳐서 headerFields에 반영
        // (HTTPURLResponse는 단일 값 headerFields만 지원하므로)
        if let rawHeaders = mockResponse.rawHeaders {
            for (key, values) in rawHeaders {
                headerFields[key] = values.joined(separator: ", ")
            }
        }

        let httpResponse = HTTPURLResponse(
            url: url,
            statusCode: mockResponse.status,
            httpVersion: "HTTP/1.1",
            headerFields: headerFields
        )!

        // Body 처리
        let bodyData: Data
        if let body = mockResponse.body {
            if mockResponse.bodyEncoding == "base64" {
                bodyData = Data(base64Encoded: body) ?? Data()
            } else {
                bodyData = body.data(using: .utf8) ?? Data()
            }
        } else {
            bodyData = Data()
        }

        return (httpResponse, bodyData)
    }
}
