import Foundation

/// MockResponse — JS에서 반환된 mock 응답 데이터.
struct MockResponse {
    let status: Int
    let statusText: String
    let headers: [String: String]
    let rawHeaders: [String: [String]]?
    let body: Data?
    let bodyEncoding: String // "text" or "base64"
}

/// 대기 중인 요청의 콜백 엔트리
private struct PendingEntry {
    let callback: (MockResponse?) -> Void
    let timer: DispatchWorkItem
}

/// MockRegistry — 대기 중인 요청의 스레드 세이프 레지스트리.
///
/// NSURLProtocol의 startLoading()에서 requestId로 콜백을 등록하고,
/// JS가 resolveRequest/rejectRequest를 호출하면 콜백을 실행한다.
///
/// DispatchQueue 기반으로 동시 요청을 안전하게 처리한다.
class MockRegistry {
    static let shared = MockRegistry()

    private var pending: [String: PendingEntry] = [:]
    private let queue = DispatchQueue(label: "com.webbridgenative.MockRegistry", attributes: .concurrent)
    private let timeoutMs: Int

    /// 현재 대기 중인 요청 수
    var size: Int {
        queue.sync { pending.count }
    }

    init(timeoutMs: Int = 5000) {
        self.timeoutMs = timeoutMs
    }

    /// 요청을 등록하고 콜백을 설정한다.
    /// 타임아웃 시 nil(passthrough)로 콜백이 호출된다.
    func register(requestId: String, callback: @escaping (MockResponse?) -> Void) {
        let timeoutWork = DispatchWorkItem { [weak self] in
            self?.timeout(requestId: requestId)
        }

        queue.async(flags: .barrier) {
            self.pending[requestId] = PendingEntry(callback: callback, timer: timeoutWork)
        }

        // 타임아웃 스케줄링
        DispatchQueue.global().asyncAfter(
            deadline: .now() + .milliseconds(timeoutMs),
            execute: timeoutWork
        )
    }

    /// 요청에 mock 응답을 전달한다.
    func resolve(requestId: String, response: MockResponse) -> Bool {
        var entry: PendingEntry?

        queue.sync(flags: .barrier) {
            entry = self.pending.removeValue(forKey: requestId)
        }

        guard let pending = entry else { return false }
        pending.timer.cancel()
        pending.callback(response)
        return true
    }

    /// 요청에 passthrough를 전달한다 (핸들러 없음).
    func reject(requestId: String) -> Bool {
        var entry: PendingEntry?

        queue.sync(flags: .barrier) {
            entry = self.pending.removeValue(forKey: requestId)
        }

        guard let pending = entry else { return false }
        pending.timer.cancel()
        pending.callback(nil)
        return true
    }

    /// 모든 대기 중인 요청을 passthrough로 완료하고 정리한다.
    func clear() {
        var entries: [PendingEntry] = []

        queue.sync(flags: .barrier) {
            entries = Array(self.pending.values)
            self.pending.removeAll()
        }

        for entry in entries {
            entry.timer.cancel()
            entry.callback(nil)
        }
    }

    /// 타임아웃 처리
    private func timeout(requestId: String) {
        var entry: PendingEntry?

        queue.sync(flags: .barrier) {
            entry = self.pending.removeValue(forKey: requestId)
        }

        entry?.callback(nil) // nil = passthrough
    }
}
