import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export function ProviderCard({ provider, rank, rejected }) {
  if (rejected) {
    return (
      <View style={styles.rejectedCard}>
        <Text style={styles.rejectedName}>❌ #{rank} {provider.name}</Text>
        <Text style={styles.rejectedReason}>{provider.reason}</Text>
        <Text style={styles.rejectedScore}>Score: {(provider.score * 100).toFixed(1)}%</Text>
      </View>
    );
  }
  return (
    <View style={[styles.card, rank === 1 && styles.winnerCard]}>
      <View style={styles.header}>
        <View style={[styles.rankBadge, rank===1&&styles.rankBadgeGold]}>
          <Text style={styles.rankText}>#{rank}</Text>
        </View>
        <View style={styles.info}>
          <Text style={styles.name}>{provider.name}</Text>
          <Text style={styles.dist}>{provider.distanceKms?.toFixed(1)} km away</Text>
        </View>
        <View style={styles.scoreBox}>
          <Text style={styles.scoreNum}>{(provider.matchScore*100).toFixed(0)}</Text>
          <Text style={styles.scoreLabel}>score</Text>
        </View>
      </View>
      <View style={styles.metrics}>
        <View style={styles.metric}><Text style={styles.metricVal}>⭐ {provider.rating}</Text><Text style={styles.metricLbl}>Rating</Text></View>
        <View style={styles.metric}><Text style={styles.metricVal}>{(provider.on_time_score*100).toFixed(0)}%</Text><Text style={styles.metricLbl}>On-Time</Text></View>
        <View style={styles.metric}><Text style={styles.metricVal}>{(provider.cancellation_rate*100).toFixed(0)}%</Text><Text style={styles.metricLbl}>Cancel</Text></View>
        <View style={styles.metric}><Text style={styles.metricVal}>PKR {provider.base_rate_pkr}</Text><Text style={styles.metricLbl}>Base Rate</Text></View>
      </View>
      {rank === 1 && <Text style={styles.winnerLabel}>🏆 SELECTED BY AI</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  card:          { backgroundColor:'#1C2333', borderRadius:12, padding:12, marginVertical:4, borderWidth:1, borderColor:'#2D3748' },
  winnerCard:    { borderColor:'#6366F1', borderWidth:2 },
  header:        { flexDirection:'row', alignItems:'center', marginBottom:10 },
  rankBadge:     { width:30, height:30, borderRadius:15, backgroundColor:'#374151', alignItems:'center', justifyContent:'center', marginRight:10 },
  rankBadgeGold: { backgroundColor:'#6366F1' },
  rankText:      { color:'#FFF', fontSize:12, fontWeight:'800' },
  info:          { flex:1 },
  name:          { color:'#E2E8F0', fontSize:13, fontWeight:'700' },
  dist:          { color:'#64748B', fontSize:11, marginTop:2 },
  scoreBox:      { alignItems:'center' },
  scoreNum:      { color:'#10B981', fontSize:18, fontWeight:'800' },
  scoreLabel:    { color:'#64748B', fontSize:9 },
  metrics:       { flexDirection:'row', justifyContent:'space-between' },
  metric:        { alignItems:'center' },
  metricVal:     { color:'#C9D1D9', fontSize:12, fontWeight:'600' },
  metricLbl:     { color:'#64748B', fontSize:9, marginTop:2 },
  winnerLabel:   { color:'#6366F1', fontSize:11, fontWeight:'700', textAlign:'center', marginTop:8, letterSpacing:1 },
  rejectedCard:  { backgroundColor:'#1A1A2E', borderRadius:8, padding:10, marginVertical:3, borderWidth:1, borderColor:'#3D2020', flexDirection:'row', alignItems:'center', flexWrap:'wrap' },
  rejectedName:  { color:'#EF4444', fontSize:12, fontWeight:'700', flex:1 },
  rejectedReason:{ color:'#94A3B8', fontSize:11, width:'100%', marginTop:2 },
  rejectedScore: { color:'#64748B', fontSize:10 },
});
