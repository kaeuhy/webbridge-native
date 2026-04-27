/** 파싱된 SSE 이벤트 */
export interface SSEEvent {
  type: string;
  data: string;
  lastEventId: string;
}

/**
 * text/event-stream 형식을 파싱한다.
 * W3C EventSource spec 준수.
 *
 * @param chunk - 이벤트 스트림 텍스트 (여러 이벤트 포함 가능)
 * @returns 파싱된 이벤트 배열
 */
export function parseEventStream(chunk: string): SSEEvent[] {
  const events: SSEEvent[] = [];
  const blocks = chunk.split('\n\n');

  for (const block of blocks) {
    if (!block.trim()) continue;

    let eventType = 'message';
    const dataLines: string[] = [];
    let lastEventId = '';

    const lines = block.split('\n');

    for (const line of lines) {
      // 주석 무시
      if (line.startsWith(':')) continue;

      const colonIndex = line.indexOf(':');
      let field: string;
      let value: string;

      if (colonIndex === -1) {
        field = line;
        value = '';
      } else {
        field = line.slice(0, colonIndex);
        value = line.slice(colonIndex + 1);
        // 첫 번째 공백 제거
        if (value.startsWith(' ')) value = value.slice(1);
      }

      switch (field) {
        case 'event':
          eventType = value;
          break;
        case 'data':
          dataLines.push(value);
          break;
        case 'id':
          lastEventId = value;
          break;
        case 'retry':
          // retry는 EventSource 레벨에서 처리
          break;
      }
    }

    if (dataLines.length > 0) {
      events.push({
        type: eventType,
        data: dataLines.join('\n'),
        lastEventId,
      });
    }
  }

  return events;
}

/**
 * retry 필드 값을 추출한다.
 * @returns retry 값 (ms) 또는 undefined
 */
export function parseRetryField(chunk: string): number | undefined {
  const lines = chunk.split('\n');
  for (const line of lines) {
    if (line.startsWith('retry:')) {
      const value = line.slice(6).trim();
      const num = parseInt(value, 10);
      if (!isNaN(num) && num >= 0) return num;
    }
  }
  return undefined;
}
