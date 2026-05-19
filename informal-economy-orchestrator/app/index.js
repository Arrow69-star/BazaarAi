import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, SafeAreaView } from 'react-native';
import { useRouter } from 'expo-router';
import { isSupabaseConfigured } from '../src/config/supabaseClient';

const EXAMPLES = [
  'Mujhe kal subah G-13 mein AC repair chahiye, budget kam hai',
  'G-11 mein bijli wala chahiye aaj, fan kaam nahi kar raha',
  'Plumber chahiye F-10 mein urgent, pipe leak ho rahi hai',
  'AC bilkul kaam nahi kar raha, kal subah G-13 mein technician chahiye',
];

export default function WelcomeScreen() {
  const router = useRouter();
  const connected = isSupabaseConfigured();

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.heroSection}>
          <Text style={styles.logo}>🧠</Text>
          <Text style={styles.title}>BazaarAI</Text>
          <Text style={styles.subtitle}>Autonomous Service Orchestrator</Text>
          <Text style={styles.desc}>Powered by Google Antigravity Multi-Agent Architecture</Text>
          <View style={[styles.badge, connected ? styles.badgeLive : styles.badgeOffline]}>
            <View style={[styles.badgeDot, { backgroundColor: connected ? '#10B981' : '#F59E0B' }]} />
            <Text style={styles.badgeText}>{connected ? 'Supabase Connected' : 'Offline Mode (Demo)'}</Text>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          {[['5', 'AI Agents'],['6','Ranking Factors'],['15+','Providers'],['3','Languages']].map(([v,l]) => (
            <View key={l} style={styles.stat}>
              <Text style={styles.statVal}>{v}</Text>
              <Text style={styles.statLbl}>{l}</Text>
            </View>
          ))}
        </View>

        {/* CTA */}
        <TouchableOpacity style={styles.mainBtn} onPress={() => router.push('/chat')}>
          <Text style={styles.mainBtnText}>🚀  Launch Orchestrator Studio</Text>
        </TouchableOpacity>

        {/* Example queries */}
        <Text style={styles.examplesTitle}>Try these queries:</Text>
        {EXAMPLES.map((ex, i) => (
          <TouchableOpacity key={i} style={styles.exampleCard} onPress={() => router.push({ pathname:'/chat', params:{ prefill: ex } })}>
            <Text style={styles.exampleNum}>{i+1}</Text>
            <Text style={styles.exampleText}>{ex}</Text>
            <Text style={styles.exampleArrow}>›</Text>
          </TouchableOpacity>
        ))}

        {/* Feature pills */}
        <View style={styles.features}>
          {['Roman Urdu NLP','Multi-Factor Ranking','Dynamic Pricing','Auto-Rebooking','Dispute Resolution','Trace Logs'].map(f => (
            <View key={f} style={styles.featurePill}>
              <Text style={styles.featureText}>{f}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:          { flex:1, backgroundColor:'#0A0E1A' },
  container:     { padding:20, paddingBottom:40 },
  heroSection:   { alignItems:'center', paddingVertical:32 },
  logo:          { fontSize:56, marginBottom:8 },
  title:         { fontSize:36, fontWeight:'900', color:'#E2E8F0', letterSpacing:-1 },
  subtitle:      { fontSize:14, color:'#6366F1', fontWeight:'700', letterSpacing:2, marginTop:4, textTransform:'uppercase' },
  desc:          { fontSize:12, color:'#64748B', textAlign:'center', marginTop:8, lineHeight:18 },
  badge:         { flexDirection:'row', alignItems:'center', paddingHorizontal:12, paddingVertical:6, borderRadius:20, marginTop:16 },
  badgeLive:     { backgroundColor:'rgba(16,185,129,0.15)', borderWidth:1, borderColor:'rgba(16,185,129,0.3)' },
  badgeOffline:  { backgroundColor:'rgba(245,158,11,0.15)', borderWidth:1, borderColor:'rgba(245,158,11,0.3)' },
  badgeDot:      { width:6, height:6, borderRadius:3, marginRight:6 },
  badgeText:     { color:'#E2E8F0', fontSize:11, fontWeight:'600' },
  statsRow:      { flexDirection:'row', backgroundColor:'#161B22', borderRadius:16, padding:16, marginBottom:24, justifyContent:'space-around' },
  stat:          { alignItems:'center' },
  statVal:       { color:'#6366F1', fontSize:24, fontWeight:'800' },
  statLbl:       { color:'#64748B', fontSize:10, marginTop:2 },
  mainBtn:       { backgroundColor:'#6366F1', borderRadius:16, paddingVertical:18, alignItems:'center', marginBottom:28, elevation:4 },
  mainBtnText:   { color:'#FFF', fontSize:16, fontWeight:'800', letterSpacing:0.5 },
  examplesTitle: { color:'#64748B', fontSize:12, fontWeight:'700', letterSpacing:1, textTransform:'uppercase', marginBottom:10 },
  exampleCard:   { backgroundColor:'#161B22', borderRadius:12, padding:14, marginBottom:8, flexDirection:'row', alignItems:'center', borderWidth:1, borderColor:'#21262D' },
  exampleNum:    { color:'#6366F1', fontWeight:'800', fontSize:14, marginRight:10, width:20 },
  exampleText:   { flex:1, color:'#C9D1D9', fontSize:13, lineHeight:18 },
  exampleArrow:  { color:'#6366F1', fontSize:20, fontWeight:'300' },
  features:      { flexDirection:'row', flexWrap:'wrap', marginTop:20, gap:8 },
  featurePill:   { backgroundColor:'rgba(99,102,241,0.15)', borderRadius:20, paddingHorizontal:12, paddingVertical:6, borderWidth:1, borderColor:'rgba(99,102,241,0.3)' },
  featureText:   { color:'#A5B4FC', fontSize:11, fontWeight:'600' },
});
