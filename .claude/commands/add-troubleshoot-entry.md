---
description: 방금 해결한 문제를 트러블슈팅 카탈로그에 추가.
---

# 트러블슈팅 카탈로그 자가 확장

## 실행
1. 직전 작업/대화 컨텍스트에서 문제와 해결을 추출
2. 다음 형식으로 `docs/TROUBLESHOOTING.md`에 항목 추가:
   ```markdown
   ## TS-NNN: <한 줄 제목>

   ### 증상 (Symptom)
   - 사용자가 무엇을 보는가
   - 어떤 에러 메시지

   ### 진단 (Diagnosis)
   - 왜 발생하는가
   - 어떻게 확인하는가

   ### 해결 (Fix)
   - 단계별 해결 방법
   - 코드 변경 예시

   ### 예방 (Prevention)
   - 다음에 같은 문제 안 생기게 하는 방법

   ### 관련
   - 이슈: #N
   - PR: #M
   - 키워드: <검색용>
   ```
3. TS 번호는 기존 최댓값 + 1
4. 카테고리(Build/Test/Native/JS/CI)에 따라 적절한 섹션에 삽입
5. 커밋: `docs(troubleshoot): add TS-NNN <제목>`
