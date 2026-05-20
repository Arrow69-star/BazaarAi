import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, ActivityIndicator, SafeAreaView, ScrollView, KeyboardAvoidingView, Platform, LayoutAnimation, UIManager
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AntigravityOrchestrator } from '../src/services/antigravityOrchestrator';
import { TraceLoggerView } from '../src/components/TraceLoggerView';
import { ProviderCard } from '../src/components/ProviderCard';
import { ChatBubble } from '../src/components/ChatBubble';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

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

  const [input, setInput] = useState(prefill || '');
  const [processing, setProcessing] = useState(false);
  const [messages, setMessages] = useState([
    { id:'0', sender:'agent', text:'Welcome to BazaarAI.\n\nReady to orchestrate your service request using Google Antigravity. Text or use a voice note.', time: now() }
  ]);
  const [traces, setTraces] = useState([]);
  const [result, setResult] = useState(null);
  const [bookingId, setBookingId] = useState(null);
  const [tab, setTab] = useState('chat');

  useEffect(() => { setTimeout(() => flatRef.current?.scrollToEnd({ animated:true }), 100); }, [messages]);

  const addMsg = (sender, text, isAlert=false) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
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
        addMsg('agent', `Clarification needed:\n\n${res.message}`);
        return;
      }

      setResult(res);
      setBookingId(res.bookingId);

      const p = res.provider;
      const msg =
        `${res.fallbackTriggered ? 'Auto-rebooking activated!\n\n' : ''}` +
        `Booking Confirmed!\n\n` +
        `ID: ${res.bookingId?.toString().slice(0,12)}\n` +
        `Provider: ${p.name}\n` +
        `Rating: ${p.rating}/5  |  ${p.distanceKms?.toFixed(1)}km\n` +
        `Quote: PKR ${res.pricing?.total}\n` +
        `Slot: ${res.intent?.timeSlot}\n\n` +
        `Confidence: ${(res.intent?.confidence * 100).toFixed(0)}%`;

      addMsg('agent', msg, res.fallbackTriggered);
    } catch (e) {
      addMsg('agent', `System error: ${e.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const runDispute = async () => {
    if (!bookingId) return;
    setProcessing(true);
    const res = await AntigravityOrchestrator.executeDisputeResolution(bookingId, 'PRICE_DISAGREEMENT');
    setTraces(prev => [...prev, ...res.traces]);
    addMsg('agent', `Dispute Resolved:\n\n${res.notes}`);
    setProcessing(false);
  };

  const simulateVoiceNote = () => {
    const transcript = 'ac bilkul cooling nahi kar raha g 13 mein banda bhej dein';
    setInput(transcript);
    setTimeout(() => {
      runPipeline();
    }, 500);
  };

  const renderProviderTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      {result?.rejected?.length > 0 && (
        <View>
          <Text style={styles.sectionLabel}>SELECTED OPTIMUM</Text>
          <ProviderCard provider={result.provider} rank={1} />
          <Text style={[styles.sectionLabel, {marginTop:24}]}>WHY NOT OTHERS?</Text>
          {result.rejected.map((p, i) => <ProviderCard key={i} provider={p} rank={i+2} rejected />)}
        </View>
      )}
    </ScrollView>
  );

  const renderPricingTab = () => {
    if (!result?.pricing) return null;
    const b = result.pricing.breakdown;
    return (
      <ScrollView style={styles.tabContent}>
        <Text style={styles.sectionLabel}>COMPUTED PRICE MATRIX</Text>
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
            <Text style={styles.priceTotalLabel}>FINAL TALLY</Text>
            <Text style={styles.priceTotalVal}>PKR {b.total}</Text>
          </View>
        </View>
        <View style={[styles.priceCard, {marginTop:16}]}>
          <Text style={styles.sectionLabel}>NLP CONFIDENCE DISTRIBUTION</Text>
          {[
            ['Intent Detection', result.intent?.confidence >= 0.5 ? 'YES' : 'NO', result.intent?.confidence],
            ['Location Found',   result.intent?.location  ? 'YES' : 'NO', result.intent?.location ? 0.9 : 0.2],
            ['Time Extracted',   result.intent?.timeSlot  ? 'YES' : 'NO', 0.88],
            ['Service Match',    result.intent?.serviceType?'YES':'NO',   result.intent?.serviceType ? 0.95 : 0.2],
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
      <View style={styles.judgePanel}>
        <Text style={styles.judgePanelTitle}>ORCHESTRATOR DEMO CONTROLS</Text>
        <View style={styles.judgeRow}>
          <TouchableOpacity style={styles.judgeBtn} onPress={simulateVoiceNote}>
            <Text style={styles.judgeBtnTxt}>Voice Note</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.judgeBtn} onPress={() => runPipeline('LOW_CONFIDENCE')}>
            <Text style={styles.judgeBtnTxt}>Low Conf Input</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.judgeBtn} onPress={() => runPipeline('PROVIDER_CANCELLATION')}>
            <Text style={styles.judgeBtnTxt}>Trigger Failover</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.judgeBtn, !bookingId && styles.judgeBtnOff]} disabled={!bookingId} onPress={runDispute}>
            <Text style={styles.judgeBtnTxt}>Dispute Result</Text>
          </TouchableOpacity>
        </View>
      </View>

      {result && (
        <View style={styles.tabBar}>
          {['chat','providers','pricing'].map(t => (
            <TouchableOpacity key={t} style={[styles.tabBtn, tab===t && styles.tabBtnActive]} onPress={() => setTab(t)}>
              <Text style={[styles.tabBtnTxt, tab===t && styles.tabBtnTxtActive]}>
                {t.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {tab==='chat' && (
        <FlatList
          ref={flatRef}
          data={messages}
          keyExtractor={m => m.id}
          renderItem={({ item }) => <ChatBubble message={item} />}
          style={styles.chatList}
          contentContainerStyle={{ paddingVertical: 16, paddingHorizontal: 8 }}
          onContentSizeChange={() => flatRef.current?.scrollToEnd({ animated:true })}
        />
      )}
      {tab==='providers' && renderProviderTab()}
      {tab==='pricing'   && renderPricingTab()}

      <TraceLoggerView logs={traces} />

      {processing && (
        <View style={styles.loader}>
          <ActivityIndicator color="#00E676" size="small" />
          <Text style={styles.loaderTxt}>ANTIGRAVITY NODES ACTIVE...</Text>
        </View>
      )}

      <KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':'height'}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickScroll} contentContainerStyle={{ paddingHorizontal:16, gap:12 }}>
          {QUICK_INPUTS.map((q,i) => (
            <TouchableOpacity key={i} style={styles.quickBtn} onPress={() => setInput(q)}>
              <Text style={styles.quickTxt} numberOfLines={1}>{q}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            placeholder="Type request or use Voice Note simulation..."
            placeholderTextColor="#78909C"
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={300}
          />
          <TouchableOpacity style={[styles.sendBtn, !input.trim() && styles.sendBtnOff]} onPress={() => runPipeline(null)} disabled={!input.trim() || processing}>
            <Text style={styles.sendTxt}>SEND</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:             { flex:1, backgroundColor:'#0B132B' },
  judgePanel:       { backgroundColor:'#1C2541', paddingHorizontal:16, paddingVertical:12, borderBottomWidth:1, borderColor:'#3A506B' },
  judgePanelTitle:  { color:'#48CAE4', fontSize:11, fontWeight:'800', letterSpacing:2, textAlign:'center', marginBottom:10 },
  judgeRow:         { flexDirection:'row', gap:8 },
  judgeBtn:         { flex:1, backgroundColor:'#3A506B', paddingVertical:10, borderRadius:6, alignItems:'center' },
  judgeBtnOff:      { backgroundColor:'#1C2541', opacity: 0.5 },
  judgeBtnTxt:      { color:'#FFFFFF', fontSize:10, fontWeight:'700', textTransform:'uppercase' },
  tabBar:           { flexDirection:'row', backgroundColor:'#1C2541', borderBottomWidth:1, borderColor:'#3A506B' },
  tabBtn:           { flex:1, paddingVertical:12, alignItems:'center' },
  tabBtnActive:     { borderBottomWidth:3, borderColor:'#00E676' },
  tabBtnTxt:        { color:'#78909C', fontSize:12, fontWeight:'700', letterSpacing:1 },
  tabBtnTxtActive:  { color:'#FFFFFF' },
  chatList:         { flex:1 },
  tabContent:       { flex:1, padding:16 },
  sectionLabel:     { color:'#48CAE4', fontSize:12, fontWeight:'800', letterSpacing:2, marginBottom:12 },
  loader:           { flexDirection:'row', alignItems:'center', justifyContent:'center', paddingVertical:10, backgroundColor:'rgba(0, 230, 118, 0.1)' },
  loaderTxt:        { color:'#00E676', fontSize:12, marginLeft:10, fontWeight:'600', letterSpacing:1 },
  quickScroll:      { maxHeight:40, marginVertical:8 },
  quickBtn:         { backgroundColor:'#1C2541', borderRadius:20, paddingHorizontal:16, paddingVertical:8, borderWidth:1, borderColor:'#3A506B', maxWidth:220 },
  quickTxt:         { color:'#CFD8DC', fontSize:12 },
  inputBar:         { flexDirection:'row', padding:16, backgroundColor:'#1C2541', borderTopWidth:1, borderColor:'#3A506B', gap:12, alignItems:'flex-end' },
  input:            { flex:1, backgroundColor:'#0B132B', color:'#FFFFFF', borderRadius:8, paddingHorizontal:16, paddingVertical:12, fontSize:14, maxHeight:100, borderWidth:1, borderColor:'#3A506B' },
  sendBtn:          { backgroundColor:'#00E676', paddingHorizontal:16, height:46, borderRadius:8, alignItems:'center', justifyContent:'center' },
  sendBtnOff:       { backgroundColor:'#3A506B' },
  sendTxt:          { color:'#0B132B', fontSize:12, fontWeight:'800', letterSpacing:1 },
  priceCard:        { backgroundColor:'#1C2541', borderRadius:12, padding:20, borderWidth:1, borderColor:'#3A506B', elevation:4 },
  priceRow:         { flexDirection:'row', justifyContent:'space-between', paddingVertical:8 },
  priceLabel:       { color:'#CFD8DC', fontSize:14 },
  priceVal:         { color:'#FFFFFF', fontSize:14, fontWeight:'700' },
  priceDivider:     { height:1, backgroundColor:'#3A506B', marginVertical:12 },
  priceTotalLabel:  { color:'#48CAE4', fontSize:16, fontWeight:'800', letterSpacing:1 },
  priceTotalVal:    { color:'#00E676', fontSize:18, fontWeight:'800' },
  confRow:          { flexDirection:'row', alignItems:'center', marginVertical:8 },
  confLabel:        { color:'#CFD8DC', fontSize:12, width:130 },
  confBar:          { flex:1, height:8, backgroundColor:'#0B132B', borderRadius:4, marginHorizontal:12, overflow:'hidden', borderWidth:1, borderColor:'#3A506B' },
  confFill:         { height:8, backgroundColor:'#00E676', borderRadius:4 },
  confVal:          { color:'#FFFFFF', fontSize:12, width:40, textAlign:'right', fontWeight:'600' },
});
