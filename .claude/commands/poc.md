---
description: 위험 가정을 작은 PoC로 검증.
---

# PoC 검증

가정: $ARGUMENTS

## 행동
1. `scripts/poc-*.js` 중 관련 있는지 확인.
2. 없으면 `scripts/poc-<topic>.js` 새로 작성.
3. 최소 코드. 프로덕션 품질 신경 쓰지 마라.
4. 결과:
   ```
   ✓ 가정: NSURLProtocol 합성 응답이 RN DevTools에 표시
     결과: 표시됨 (artifacts/poc-devtools-1.png)
     결론: 경로 B 진행 가능
   ```
5. 결과를 GitHub Discussion에 자동 게시 (선택, 사용자 승인 시).
