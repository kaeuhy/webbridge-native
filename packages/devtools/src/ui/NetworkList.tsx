/**
 * NetworkList — 네트워크 요청 목록 컴포넌트.
 * DevToolsPanel의 데이터를 FlatList로 렌더링.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  Text,
  TouchableOpacity,
  View,
  StyleSheet,
  TextInput,
} from 'react-native';
import type { PanelEntry } from '../panel';
import { DevToolsPanel } from '../panel';

interface NetworkListProps {
  panel: DevToolsPanel;
  onSelectEntry?: (entry: PanelEntry) => void;
}

const STATUS_COLORS: Record<string, string> = {
  '2': '#4caf50', // 2xx green
  '3': '#ff9800', // 3xx orange
  '4': '#f44336', // 4xx red
  '5': '#9c27b0', // 5xx purple
  '0': '#757575', // error gray
};

function getStatusColor(status: number): string {
  return STATUS_COLORS[String(status)[0]] ?? '#757575';
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export function NetworkList({ panel, onSelectEntry }: NetworkListProps) {
  const [entries, setEntries] = useState<PanelEntry[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const unsubscribe = panel.onUpdate(setEntries);
    panel.startPolling(1000);
    return () => {
      unsubscribe();
      panel.stopPolling();
    };
  }, [panel]);

  useEffect(() => {
    panel.setFilter(search ? { url: search } : {});
  }, [search, panel]);

  const summary = panel.getSummary();

  const renderItem = useCallback(
    ({ item }: { item: PanelEntry }) => (
      <TouchableOpacity
        style={styles.row}
        onPress={() => onSelectEntry?.(item)}
        activeOpacity={0.7}
      >
        <View style={styles.rowLeft}>
          <Text style={[styles.method, { color: getStatusColor(item.status) }]}>
            {item.method}
          </Text>
          <Text style={styles.url} numberOfLines={1}>
            {item.url.replace(/^https?:\/\//, '')}
          </Text>
        </View>
        <View style={styles.rowRight}>
          <Text style={[styles.status, { color: getStatusColor(item.status) }]}>
            {item.status || 'ERR'}
          </Text>
          <Text style={styles.duration}>{formatDuration(item.duration)}</Text>
          {item.cacheStatus && (
            <Text style={styles.cache}>{item.cacheStatus}</Text>
          )}
        </View>
      </TouchableOpacity>
    ),
    [onSelectEntry],
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TextInput
          style={styles.searchInput}
          placeholder="URL 검색..."
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Text style={styles.stats}>
          {summary.total}건 | {summary.cached} cached | avg {summary.avgDuration}ms
        </Text>
      </View>
      <FlatList
        data={entries}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        style={styles.list}
        inverted
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 8, backgroundColor: '#f5f5f5', borderBottomWidth: 1, borderBottomColor: '#ddd' },
  searchInput: {
    backgroundColor: '#fff', borderRadius: 6, paddingHorizontal: 12,
    paddingVertical: 8, fontSize: 14, borderWidth: 1, borderColor: '#ddd',
  },
  stats: { fontSize: 11, color: '#888', marginTop: 4, textAlign: 'center' },
  list: { flex: 1 },
  row: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 0.5, borderBottomColor: '#eee',
  },
  rowLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  method: { fontSize: 11, fontWeight: '700', width: 40 },
  url: { fontSize: 13, color: '#333', flex: 1 },
  status: { fontSize: 12, fontWeight: '600' },
  duration: { fontSize: 11, color: '#999' },
  cache: { fontSize: 10, color: '#2196f3', backgroundColor: '#e3f2fd', paddingHorizontal: 4, borderRadius: 3 },
});
