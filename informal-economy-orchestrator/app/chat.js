import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, ActivityIndicator, SafeAreaView, ScrollView, KeyboardAvoidingView, Platform
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AntigravityOrchestrator } from '../src/services/antigravityOrchestrator';
import { TraceLoggerView } from '../src/components/TraceLoggerView';
import { ProviderCard } from '../src/components/ProviderCard';
import { ChatBubble } from '../src/components/ChatBubble';

const QUICK_INPUTS = [
  'Mujhe kal subah G-13 mein AC repair chahiye, budget kam hai',
  'G-11 mein bijli urgent, fan kharab hai',
  'Plumber F-10 mein aaj, pipe leak',
];

function now() { return new Date().toLocaleTimeString('en-PK',{hour:'2-digit',minute:'2-digit'}); }

export default function ChatConsole() {
  const { prefill } = useLocalSearchParams();
  const router = useRouter();
  const flatRef = useRef(null);

  const [input, setInput]             = useState(prefill || '');
  const [processing, setProcessing]   = useState(false);
  const [messages, setMessages]       = useState([
    { id:'0', sender:'agent', text:'Assalam-o-Alaikum! 👋\n\nMain BazaarAI Orchestrator hoon — 5 AI agents ke saath aapki service request handle karunga.\n\nApni request Urdu, Roman Urdu, ya English mein likhein.', time: now() }
  ]);
  const [traces, setTraces]           = useState([]);
  const [result, setResult]           = useState(null);
  const [bookingId, setBookingId]     = useState(null);
  const [showProviders, setShowProviders] = useState(false);
  const [tab, setTab]                 = useState('chat'); // 'chat' | 'providers' | 'pricing'

  useEffect(() => { setTimeout(() => flatRef.current?.scrollToEnd({ animated:true }), 100); }, [messages]);

  const addMsg = (sender, text, isAlert=false) => {
    setMessages(prev => [...prev, { id: Date.now().toString(), sender, text, time: now(), isAlert }]);
  };

  const runPipeline = async (forceMode = null) => {
    const query = forceMode ? 'AC Urgent G-13 mein technician chahiye' : input.trim();
    if (!query && !forceMode) return;

    const userLabel = forceMode ? `[Judge Test: ${forceMode}]` : query;
    addMsg('user', userLabel);
    setInput('');
    setProcessing(true);
    setResult(null);
    setTraces([{ step:'Orchestrator', status:'RUNNING', message:'Pipeline initializing...' }]);
    setTab('chat');

    try {
      const res = await AntigravityOrchestrator.executeWorkflow(query, forceMode);
      setTraces(res.traces);

      if (!res.success) {
        addMsg('agent', `🤔 Clarification needed:\n\n${res.message}`);
        return;
      }

      setResult(res);
      setBookingId(res.bookingId);

      const p = res.provider;
      const msg =
        `${res.fallbackTriggered ? '⚡ Auto-rebooking activated!\n\n' : ''}` +
        `✅ Booking Confirmed!\n\n` +
        `📋 ID: ${res.bookingId?.toString().slice(0,12)}...\n` +
        `👤 Provider: ${p.name}\n` +
        `⭐ Rating: ${p.rating}/5  |  📍 ${p.distanceKms?.toFixed(1)}km\n` +
        `💰 Quote: PKR ${res.pricing?.total}\n` +
        `🕐 Slot: ${res.intent?.timeSlot}\n\n` +
        `Confidence: ${(res.intent?.confidence * 100).toFixed(0)}%`;

      addMsg('agent', msg, res.fallbackTriggered);
      setShowProviders(true);
    } catch (e) {
      addMsg('agent', `❌ System error: ${e.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const runDispute = async () => {
    if (!bookingId) return;
    setProcessing(true);
    const res = await AntigravityOrchestrator.executeDisputeResolution(bookingId, 'PRICE_DISAGREEMENT');
    setTraces(prev => [...prev, ...res.traces]);
    addMsg('agent', `⚖️ Dispute Resolved:\n\n${res.notes}`);
    setProcessing(false);
  };

  // ── TABS ──────────────────────────────────────────────────────
  const renderProviderTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      {result?.rejected?.length > 0 && (
        <>
          <Text style={styles.sectionLabel}>🏆 SELECTED</Text>
          <ProviderCard provider={result.provider} rank={1} />
          <Text style={[styles.sectionLabel, {marginTop:12}]}>❌ WHY NOT OTHERS?</Text>
          {result.rejected.map((p, i) => <ProviderCard key={i} provider={p} rank={i+2} rejected />)}
        </>
      )}
    </ScrollView>
  );

  const renderPricingTab = () => {
    if (!result?.pricing) return null;
    const b = result.pricing.breakdown;
    return (
      <ScrollView style={styles.tabContent}>
        <Text style={styles.sectionLabel}>💰 PRICE BREAKDOWN</Text>
        <View style={styles.priceCard}>
          {[
            ['Base Rate', `PKR ${b.base}`],
            ['Urgency Surge', `+ PKR ${b.urgencySurge}`],
            ['Complexity Fee', `+ PKR ${b.complexitySurge}`],
            ['Distance Cost', `+ PKR ${b.distanceFee}`],
            ['Budget Discount', `- PKR ${b.budgetDiscount}`],
          ].map(([l,v]) => (
            <View key={l} style={styles.priceRow}>
              <Text style={styles.priceLabel}>{l}</Text>
              <Text style={styles.priceVal}>{v}</Text>
            </View>
          ))}
          <View style={styles.priceDivider} />
          <View style={styles.priceRow}>
            <Text style={styles.priceTotalLabel}>TOTAL</Text>
            <Text style={styles.priceTotalVal}>PKR {b.total}</Text>
          </View>
        </View>
        <View style={styles.priceCard} style={{marginTop:12}}>
          <Text style={styles.sectionLabel}>📊 CONFIDENCE BREAKDOWN</Text>
          {[
            ['Intent Detection', result.intent?.confidence >= 0.5 ? '✓' : '✗', result.intent?.confidence],
            ['Location Found',   result.intent?.location  ? '✓' : '✗', result.intent?.location ? 0.9 : 0.2],
            ['Time Extracted',   result.intent?.timeSlot  ? '✓' : '✗', 0.88],
            ['Service Match',    result.intent?.serviceType?'✓':'✗',   result.intent?.serviceType ? 0.95 : 0.2],
          ].map(([l,s,v]) => (
            <View key={l} style={styles.confRow}>
              <Text style={styles.confLabel}>{l}</Text>
              <View style={styles.confBar}>
                <View style={[styles.confFill, { width:`${((v||0)*100).toFixed(0)}%` }]} />
              </View>
              <Text style={styles.confVal}>{((v||0)*100).toFixed(0)}%</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* ── Judge Controls ─────────────────────────────── */}
      <View style={styles.judgePanel}>
        <Text style={styles.judgePanelTitle}>⚡ JUDGE STRESS-TEST SUITE</Text>
        <View style={styles.judgeRow}>
          <TouchableOpacity style={styles.judgeBtn} onPress={() => runPipeline('LOW_CONFIDENCE')}>
            <Text style={styles.judgeBtnTxt}>🌫️ Noisy Input</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.judgeBtn} onPress={() => runPipeline('PROVIDER_CANCELLATION')}>
            <Text style={styles.judgeBtnTxt}>⚡ Auto-Reroute</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.judgeBtn, !bookingId && styles.judgeBtnOff]} disabled={!bookingId} onPress={runDispute}>
            <Text style={styles.judgeBtnTxt}>⚖️ Dispute</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Tab Bar ──────────────────────────────────── */}
      {result && (
        <View style={styles.tabBar}>
          {['chat','providers','pricing'].map(t => (
            <TouchableOpacity key={t} style={[styles.tabBtn, tab===t && styles.tabBtnActive]} onPress={() => setTab(t)}>
              <Text style={[styles.tabBtnTxt, tab===t && styles.tabBtnTxtActive]}>
                {t==='chat'?'💬 Chat':t==='providers'?'👥 Providers':'💰 Pricing'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* ── Main Content ─────────────────────────────── */}
      {tab==='chat' && (
        <FlatList
          ref={flatRef}
          data={messages}
          keyExtractor={m => m.id}
          renderItem={({ item }) => <ChatBubble message={item} />}
          style={styles.chatList}
          contentContainerStyle={{ paddingVertical: 12 }}
          onContentSizeChange={() => flatRef.current?.scrollToEnd({ animated:true })}
        />
      )}
      {tab==='providers' && renderProviderTab()}
      {tab==='pricing'   && renderPricingTab()}

      {/* ── Trace Logger ─────────────────────────────── */}
      <TraceLoggerView logs={traces} />

      {/* ── Loading ──────────────────────────────────── */}
      {processing && (
        <View style={styles.loader}>
          <ActivityIndicator color="#6366F1" size="small" />
          <Text style={styles.loaderTxt}>Antigravity agents processing...</Text>
        </View>
      )}

      {/* ── Input Bar ────────────────────────────────── */}
      <KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':'height'}>
        {/* Quick inputs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickScroll} contentContainerStyle={{ paddingHorizontal:12, gap:8 }}>
          {QUICK_INPUTS.map((q,i) => (
            <TouchableOpacity key={i} style={styles.quickBtn} onPress={() => setInput(q)}>
              <Text style={styles.quickTxt} numberOfLines={1}>{q}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            placeholder="Apni request likhein (Urdu/Roman Urdu/English)..."
            placeholderTextColor="#4A5568"
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={300}
          />
          <TouchableOpacity style={[styles.sendBtn, !input.trim() && styles.sendBtnOff]} onPress={() => runPipeline(null)} disabled={!input.trim() || processing}>
            <Text style={styles.sendTxt}>▶</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:             { flex:1, backgroundColor:'#0A0E1A' },
  judgePanel:       { backgroundColor:'#161B22', paddingHorizontal:12, paddingVertical:8, borderBottomWidth:1, borderColor:'#21262D' },
  judgePanelTitle:  { color:'#F97316', fontSize:10, fontWeight:'800', letterSpacing:1.5, textAlign:'center', marginBottom:6 },
  judgeRow:         { flexDirection:'row', gap:6 },
  judgeBtn:         { flex:1, backgroundColor:'#7C3AED', paddingVertical:8, borderRadius:8, alignItems:'center' },
  judgeBtnOff:      { backgroundColor:'#1F2937' },
  judgeBtnTxt:      { color:'#FFF', fontSize:11, fontWeight:'700' },
  tabBar:           { flexDirection:'row', backgroundColor:'#161B22', borderBottomWidth:1, borderColor:'#21262D' },
  tabBtn:           { flex:1, paddingVertical:10, alignItems:'center' },
  tabBtnActive:     { borderBottomWidth:2, borderColor:'#6366F1' },
  tabBtnTxt:        { color:'#64748B', fontSize:11, fontWeight:'600' },
  tabBtnTxtActive:  { color:'#E2E8F0' },
  chatList:         { flex:1 },
  tabContent:       { flex:1, padding:12 },
  sectionLabel:     { color:'#64748B', fontSize:10, fontWeight:'700', letterSpacing:1.5, marginBottom:8 },
  loader:           { flexDirection:'row', alignItems:'center', justifyContent:'center', paddingVertical:6, backgroundColor:'rgba(99,102,241,0.08)' },
  loaderTxt:        { color:'#6366F1', fontSize:12, marginLeft:8 },
  quickScroll:      { maxHeight:36, marginVertical:4 },
  quickBtn:         { backgroundColor:'#161B22', borderRadius:20, paddingHorizontal:12, paddingVertical:6, borderWidth:1, borderColor:'#2D3748', maxWidth:200 },
  quickTxt:         { color:'#94A3B8', fontSize:11 },
  inputBar:         { flexDirection:'row', padding:10, backgroundColor:'#161B22', borderTopWidth:1, borderColor:'#21262D', gap:8, alignItems:'flex-end' },
  input:            { flex:1, backgroundColor:'#0D1117', color:'#E2E8F0', borderRadius:16, paddingHorizontal:14, paddingVertical:10, fontSize:13, maxHeight:80, borderWidth:1, borderColor:'#2D3748' },
  sendBtn:          { backgroundColor:'#6366F1', width:42, height:42, borderRadius:21, alignItems:'center', justifyContent:'center' },
  sendBtnOff:       { backgroundColor:'#1F2937' },
  sendTxt:          { color:'#FFF', fontSize:16 },
  priceCard:        { backgroundColor:'#161B22', borderRadius:12, padding:16, borderWidth:1, borderColor:'#21262D', marginBottom:8 },
  priceRow:         { flexDirection:'row', justifyContent:'space-between', paddingVertical:6 },
  priceLabel:       { color:'#94A3B8', fontSize:13 },
  priceVal:         { color:'#C9D1D9', fontSize:13, fontWeight:'600' },
  priceDivider:     { height:1, backgroundColor:'#21262D', marginVertical:8 },
  priceTotalLabel:  { color:'#E2E8F0', fontSize:15, fontWeight:'800' },
  priceTotalVal:    { color:'#10B981', fontSize:18, fontWeight:'800' },
  confRow:          { flexDirection:'row', alignItems:'center', marginVertical:5 },
  confLabel:        { color:'#94A3B8', fontSize:11, width:120 },
  confBar:          { flex:1, height:6, backgroundColor:'#21262D', borderRadius:3, marginHorizontal:8, overflow:'hidden' },
  confFill:         { height:6, backgroundColor:'#6366F1', borderRadius:3 },
  confVal:          { color:'#C9D1D9', fontSize:11, width:35, textAlign:'right' },
});
