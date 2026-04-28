/**
 * WebBridge Native 사용 예시 — RN 컴포넌트.
 *
 * 이 파일은 RN 프로젝트에서 WebBridge Native를 사용하는 방법을 보여줍니다.
 * App.tsx에서 import하여 사용하세요.
 */

import React, { useEffect, useState } from 'react';
import { View, Text, Button, ScrollView, StyleSheet } from 'react-native';
import { setupWebBridge, http, HttpResponse } from '@webbridge-native/preset';

// 1. WebBridge 설정 (앱 전역에서 한 번만)
const { client, cookieJar, dispose } = setupWebBridge({
  cookies: true,
  headers: { userAgent: 'browser-like' },
  mock: {
    handlers: [
      // 로그인 API mock
      http.post('https://api.example.com/login', () =>
        HttpResponse.json(
          { success: true, user: { id: 1, name: '홍길동' } },
          {
            status: 200,
            headers: {
              'Set-Cookie': 'session=abc123; Path=/; HttpOnly; Max-Age=3600',
            },
          },
        ),
      ),

      // 사용자 정보 API mock
      http.get('https://api.example.com/me', ({ request }) => {
        const cookie = request.headers['Cookie'] || '';
        if (cookie.includes('session=')) {
          return HttpResponse.json({ id: 1, name: '홍길동', authenticated: true });
        }
        return HttpResponse.json({ error: 'unauthorized' }, { status: 401 });
      }),

      // 목록 API mock
      http.get('https://api.example.com/items', () =>
        HttpResponse.json({
          items: [
            { id: 1, name: '아이템 1' },
            { id: 2, name: '아이템 2' },
            { id: 3, name: '아이템 3' },
          ],
        }),
      ),
    ],
  },
});

export default function WebBridgeExample() {
  const [logs, setLogs] = useState<string[]>([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const addLog = (msg: string) => setLogs((prev) => [...prev, msg]);

  // 앱 종료 시 정리
  useEffect(() => {
    return () => dispose();
  }, []);

  const handleLogin = async () => {
    addLog('→ POST /login');
    const res = await client.fetch('https://api.example.com/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'user@example.com', password: '1234' }),
    });
    const data = JSON.parse(res.body as string);
    addLog(`← ${res.status} | cookies: ${cookieJar?.size}`);
    addLog(`  user: ${data.user?.name}`);
    setIsLoggedIn(true);
  };

  const handleGetMe = async () => {
    addLog('→ GET /me (cookie auto-attached)');
    const res = await client.fetch('https://api.example.com/me');
    const data = JSON.parse(res.body as string);
    addLog(`← ${res.status} | authenticated: ${data.authenticated}`);
  };

  const handleGetItems = async () => {
    addLog('→ GET /items');
    const res = await client.fetch('https://api.example.com/items');
    const data = JSON.parse(res.body as string);
    addLog(`← ${res.status} | ${data.items.length} items`);
  };

  const handleClear = () => {
    setLogs([]);
    setIsLoggedIn(false);
    cookieJar?.clear();
    addLog('쿠키 초기화됨');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>WebBridge Native Demo</Text>
      <Text style={styles.subtitle}>RN에서 브라우저처럼 네트워킹</Text>

      <View style={styles.buttons}>
        <Button title="로그인" onPress={handleLogin} />
        <Button title="내 정보" onPress={handleGetMe} disabled={!isLoggedIn} />
        <Button title="목록 조회" onPress={handleGetItems} />
        <Button title="초기화" onPress={handleClear} color="red" />
      </View>

      <ScrollView style={styles.logs}>
        {logs.map((log, i) => (
          <Text key={i} style={styles.log}>{log}</Text>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, paddingTop: 60 },
  title: { fontSize: 24, fontWeight: 'bold' },
  subtitle: { fontSize: 14, color: '#666', marginBottom: 20 },
  buttons: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  logs: { flex: 1, backgroundColor: '#f5f5f5', padding: 10, borderRadius: 8 },
  log: { fontSize: 12, fontFamily: 'monospace', marginBottom: 4 },
});
