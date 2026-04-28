/**
 * RequestDetail — 요청/응답 상세 뷰.
 */

import React, { useState } from 'react';
import {
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  StyleSheet,
  Share,
} from 'react-native';
import type { PanelEntry } from '../panel';
import { RequestLogger } from '../logger';

interface RequestDetailProps {
  entry: PanelEntry;
  logger?: RequestLogger;
  onClose?: () => void;
}

type Tab = 'headers' | 'request' | 'response' | 'curl';

export function RequestDetail({ entry, logger, onClose }: RequestDetailProps) {
  const [tab, setTab] = useState<Tab>('headers');

  const handleCopyUrl = () => {
    Share.share({ message: entry.url });
  };

  const handleCopyCurl = () => {
    if (logger) {
      const curl = logger.toCurl(entry);
      Share.share({ message: curl });
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={onClose}>
          <Text style={styles.closeBtn}>닫기</Text>
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>
          {entry.method} {entry.url.replace(/^https?:\/\//, '')}
        </Text>
      </View>

      <View style={styles.summary}>
        <Text style={styles.summaryText}>
          Status: {entry.status} | Duration: {entry.duration}ms
          {entry.cacheStatus ? ` | Cache: ${entry.cacheStatus}` : ''}
        </Text>
      </View>

      <View style={styles.tabs}>
        {(['headers', 'request', 'response', 'curl'] as Tab[]).map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, tab === t && styles.tabActive]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={styles.content}>
        {tab === 'headers' && (
          <>
            <Text style={styles.sectionTitle}>Request Headers</Text>
            {Object.entries(entry.requestHeaders).map(([k, v]) => (
              <Text key={k} style={styles.headerLine}>
                <Text style={styles.headerKey}>{k}: </Text>
                {v}
              </Text>
            ))}
            <Text style={styles.sectionTitle}>Response Headers</Text>
            {Object.entries(entry.responseHeaders).map(([k, v]) => (
              <Text key={k} style={styles.headerLine}>
                <Text style={styles.headerKey}>{k}: </Text>
                {v}
              </Text>
            ))}
          </>
        )}
        {tab === 'request' && (
          <Text style={styles.body}>
            {entry.requestBody ?? '(no body)'}
          </Text>
        )}
        {tab === 'response' && (
          <Text style={styles.body}>
            {entry.responseBody ?? '(no body)'}
          </Text>
        )}
        {tab === 'curl' && logger && (
          <View>
            <Text style={styles.body}>{logger.toCurl(entry)}</Text>
            <TouchableOpacity style={styles.copyBtn} onPress={handleCopyCurl}>
              <Text style={styles.copyBtnText}>복사</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  topBar: {
    flexDirection: 'row', alignItems: 'center', padding: 12,
    borderBottomWidth: 1, borderBottomColor: '#eee', gap: 12,
  },
  closeBtn: { color: '#2196f3', fontSize: 16 },
  title: { flex: 1, fontSize: 14, fontWeight: '600' },
  summary: { padding: 8, backgroundColor: '#f5f5f5' },
  summaryText: { fontSize: 12, color: '#666', textAlign: 'center' },
  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#eee' },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: '#2196f3' },
  tabText: { fontSize: 13, color: '#999' },
  tabTextActive: { color: '#2196f3', fontWeight: '600' },
  content: { flex: 1, padding: 12 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#333', marginTop: 12, marginBottom: 6 },
  headerLine: { fontSize: 12, color: '#555', marginBottom: 2, fontFamily: 'monospace' },
  headerKey: { fontWeight: '600', color: '#333' },
  body: { fontSize: 12, fontFamily: 'monospace', color: '#333' },
  copyBtn: {
    marginTop: 12, backgroundColor: '#2196f3', paddingVertical: 10,
    borderRadius: 6, alignItems: 'center',
  },
  copyBtnText: { color: '#fff', fontWeight: '600' },
});
