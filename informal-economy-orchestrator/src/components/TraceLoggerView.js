import React, { useRef, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';

const STATUS_COLORS = {
  RUNNING: '#FFD166',
  DONE:    '#06D6A0',
  WARNING: '#FF9F1C',
  ERROR:   '#EF476F',
  ALERT:   '#EF476F',
};

export function TraceLoggerView({ logs = [] }) {
  const scrollRef = useRef(null);
  useEffect(() => { scrollRef.current?.scrollToEnd({ animated: true }); }, [logs]);

  return (
    <View style={styles.wrapper}>
      <View style={styles.header}>
        <View style={styles.dot} />
        <Text style={styles.title}>ANTIGRAVITY ORCHESTRATOR TERMINAL</Text>
        <Text style={styles.count}>[ {logs.length} ops ]</Text>
      </View>
      <ScrollView ref={scrollRef} style={styles.scroll} nestedScrollEnabled showsVerticalScrollIndicator={true} indicatorStyle="white">
        {logs.map((log, i) => (
          <View key={i} style={styles.row}>
            <Text style={styles.index}>{String(i+1).padStart(3,'0')}</Text>
            <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS[log.status] || '#78909C' }]} />
            <View style={styles.content}>
              <Text style={styles.step}>[{log.step.toUpperCase()}]</Text>
              <Text style={styles.msg}>{log.message}</Text>
            </View>
          </View>
        ))}
        {logs.length === 0 && (
          <Text style={styles.empty}>SYSTEM IDLE. AWAITING INPUT STREAM...</Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper:  { height: 220, backgroundColor:'#000000', borderTopWidth:2, borderColor:'#00E676' },
  header:   { flexDirection:'row', alignItems:'center', paddingHorizontal:16, paddingVertical:10, backgroundColor:'#111111', borderBottomWidth:1, borderColor:'#333333' },
  dot:      { width:8, height:8, borderRadius:4, backgroundColor:'#00E676', marginRight:12, shadowColor:'#00E676', shadowOffset:{width:0,height:0}, shadowOpacity:0.8, shadowRadius:4, elevation:4 },
  title:    { flex:1, color:'#FFFFFF', fontSize:11, fontWeight:'800', letterSpacing:2, fontFamily: 'monospace' },
  count:    { color:'#00E676', fontSize:11, fontFamily: 'monospace', fontWeight:'700' },
  scroll:   { flex:1, paddingHorizontal:12, paddingVertical:8 },
  row:      { flexDirection:'row', alignItems:'flex-start', paddingVertical:6 },
  index:    { color:'#555555', fontSize:11, fontFamily:'monospace', width:30 },
  statusDot:{ width:8, height:8, borderRadius:0, marginTop:4, marginRight:10 },
  content:  { flex:1, flexDirection:'row', flexWrap:'wrap' },
  step:     { color:'#00E676', fontSize:11, fontWeight:'700', fontFamily:'monospace', marginRight:8 },
  msg:      { color:'#DDDDDD', fontSize:11, lineHeight:16, fontFamily:'monospace' },
  empty:    { color:'#555555', fontSize:12, textAlign:'center', marginTop:30, fontFamily:'monospace', letterSpacing:1 },
});
