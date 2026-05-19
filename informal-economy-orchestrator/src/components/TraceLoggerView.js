import React, { useRef, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';

const STATUS_COLORS = {
  RUNNING: '#F59E0B',
  DONE:    '#10B981',
  WARNING: '#F97316',
  ERROR:   '#EF4444',
  ALERT:   '#EF4444',
};

export function TraceLoggerView({ logs = [] }) {
  const scrollRef = useRef(null);
  useEffect(() => { scrollRef.current?.scrollToEnd({ animated: true }); }, [logs]);

  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        <View style={styles.dot} />
        <Text style={styles.title}>ANTIGRAVITY RUNTIME EXECUTION TRACE</Text>
        <Text style={styles.count}>{logs.length} steps</Text>
      </View>
      <ScrollView ref={scrollRef} style={styles.scroll} nestedScrollEnabled showsVerticalScrollIndicator={false}>
        {logs.map((log, i) => (
          <View key={i} style={styles.row}>
            <Text style={styles.index}>{String(i+1).padStart(2,'0')}</Text>
            <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS[log.status] || '#64748B' }]} />
            <View style={styles.content}>
              <Text style={styles.step}>{log.step}</Text>
              <Text style={styles.msg}>{log.message}</Text>
            </View>
          </View>
        ))}
        {logs.length === 0 && (
          <Text style={styles.empty}>Awaiting orchestration pipeline...</Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper:  { height: 200, backgroundColor:'#0D1117', borderTopWidth:1, borderColor:'#21262D' },
  header:   { flexDirection:'row', alignItems:'center', paddingHorizontal:12, paddingVertical:6, borderBottomWidth:1, borderColor:'#21262D' },
  dot:      { width:6, height:6, borderRadius:3, backgroundColor:'#10B981', marginRight:8 },
  title:    { flex:1, color:'#58A6FF', fontSize:10, fontWeight:'700', letterSpacing:1 },
  count:    { color:'#6E7681', fontSize:10 },
  scroll:   { flex:1, paddingHorizontal:8 },
  row:      { flexDirection:'row', alignItems:'flex-start', paddingVertical:4, borderBottomWidth:1, borderColor:'#161B22' },
  index:    { color:'#6E7681', fontSize:10, fontFamily:'monospace', width:22 },
  statusDot:{ width:6, height:6, borderRadius:3, marginTop:3, marginRight:6 },
  content:  { flex:1 },
  step:     { color:'#3FB950', fontSize:10, fontWeight:'700' },
  msg:      { color:'#C9D1D9', fontSize:10, lineHeight:14 },
  empty:    { color:'#6E7681', fontSize:11, textAlign:'center', marginTop:20, fontStyle:'italic' },
});
