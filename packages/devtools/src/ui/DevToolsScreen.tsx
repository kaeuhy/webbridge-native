/**
 * DevToolsScreen — 전체 DevTools 화면.
 * NetworkList + RequestDetail을 조합.
 *
 * @example
 * ```tsx
 * import { DevToolsScreen } from '@webbridge-native/devtools/ui';
 *
 * // React Navigation
 * <Stack.Screen name="DevTools" component={() =>
 *   <DevToolsScreen logger={logger} />
 * } />
 *
 * // 또는 Modal
 * <Modal visible={showDevTools}>
 *   <DevToolsScreen logger={logger} onClose={() => setShowDevTools(false)} />
 * </Modal>
 * ```
 */

import React, { useMemo, useState } from 'react';
import { View, StyleSheet, SafeAreaView } from 'react-native';
import { RequestLogger } from '../logger';
import { DevToolsPanel } from '../panel';
import type { PanelEntry } from '../panel';
import { NetworkList } from './NetworkList';
import { RequestDetail } from './RequestDetail';

interface DevToolsScreenProps {
  logger: RequestLogger;
  onClose?: () => void;
}

export function DevToolsScreen({ logger, onClose }: DevToolsScreenProps) {
  const panel = useMemo(() => new DevToolsPanel(logger), [logger]);
  const [selectedEntry, setSelectedEntry] = useState<PanelEntry | null>(null);

  return (
    <SafeAreaView style={styles.container}>
      {selectedEntry ? (
        <RequestDetail
          entry={selectedEntry}
          logger={logger}
          onClose={() => setSelectedEntry(null)}
        />
      ) : (
        <NetworkList
          panel={panel}
          onSelectEntry={setSelectedEntry}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
});
