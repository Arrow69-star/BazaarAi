import React from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView, TouchableOpacity, Linking } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

export default function BookingDetails() {
  const router = useRouter();
  const params = useLocalSearchParams();

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.statusBanner}>
          <Text style={styles.statusIcon}>✅</Text>
          <Text style={styles.statusTitle}>Booking Confirmed</Text>
          <Text style={styles.statusSub}>Antigravity Agent sealed this booking</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>📋 Booking Summary</Text>
          <View style={styles.row}><Text style={styles.lbl}>Booking ID</Text><Text style={styles.val}>{params.bookingId || 'BAZ-DEMO-001'}</Text></View>
          <View style={styles.row}><Text style={styles.lbl}>Service</Text><Text style={styles.val}>{params.service || 'AC Repair'}</Text></View>
          <View style={styles.row}><Text style={styles.lbl}>Provider</Text><Text style={styles.val}>{params.provider || 'ColdBreeze AC Experts'}</Text></View>
          <View style={styles.row}><Text style={styles.lbl}>Location</Text><Text style={styles.val}>{params.location || 'G-13, Islamabad'}</Text></View>
          <View style={styles.row}><Text style={styles.lbl}>Time Slot</Text><Text style={styles.val}>{params.timeSlot || 'Tomorrow 9:00 AM'}</Text></View>
          <View style={styles.row}><Text style={styles.lbl}>Total Price</Text><Text style={[styles.val, styles.price]}>PKR {params.price || '1293'}</Text></View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>📲 WhatsApp Simulation</Text>
          {[
            { from:'BazaarAI', msg:`New booking confirmed! Provider: ${params.provider||'ColdBreeze AC'} will arrive ${params.timeSlot||'tomorrow 9AM'}.`, time:'Now' },
            { from:'Provider', msg:'Slot confirmed. I will be there on time. Shukria!', time:'1 min ago' },
            { from:'BazaarAI', msg:`Reminder: Your AC repair is scheduled for ${params.timeSlot||'tomorrow morning'}. Stay home!`, time:'Scheduled' },
          ].map((m,i) => (
            <View key={i} style={[styles.waBubble, m.from==='Provider' && styles.waBubbleRight]}>
              <Text style={styles.waFrom}>{m.from}</Text>
              <Text style={styles.waMsg}>{m.msg}</Text>
              <Text style={styles.waTime}>{m.time}</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnTxt}>← Back to Orchestrator</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:          { flex:1, backgroundColor:'#0A0E1A' },
  container:     { padding:16, paddingBottom:40 },
  statusBanner:  { backgroundColor:'rgba(16,185,129,0.1)', borderRadius:16, padding:24, alignItems:'center', marginBottom:16, borderWidth:1, borderColor:'rgba(16,185,129,0.3)' },
  statusIcon:    { fontSize:40, marginBottom:8 },
  statusTitle:   { color:'#10B981', fontSize:22, fontWeight:'800' },
  statusSub:     { color:'#64748B', fontSize:12, marginTop:4 },
  card:          { backgroundColor:'#161B22', borderRadius:16, padding:16, marginBottom:16, borderWidth:1, borderColor:'#21262D' },
  cardTitle:     { color:'#94A3B8', fontSize:11, fontWeight:'700', letterSpacing:1.5, textTransform:'uppercase', marginBottom:14 },
  row:           { flexDirection:'row', justifyContent:'space-between', paddingVertical:8, borderBottomWidth:1, borderColor:'#21262D' },
  lbl:           { color:'#64748B', fontSize:13 },
  val:           { color:'#E2E8F0', fontSize:13, fontWeight:'600', maxWidth:'60%', textAlign:'right' },
  price:         { color:'#10B981', fontSize:16, fontWeight:'800' },
  waBubble:      { backgroundColor:'#1C2333', borderRadius:12, padding:10, marginBottom:8, maxWidth:'85%', borderTopLeftRadius:2 },
  waBubbleRight: { alignSelf:'flex-end', backgroundColor:'#14532D', borderTopLeftRadius:12, borderTopRightRadius:2 },
  waFrom:        { color:'#6366F1', fontSize:10, fontWeight:'700', marginBottom:3 },
  waMsg:         { color:'#E2E8F0', fontSize:13, lineHeight:18 },
  waTime:        { color:'#64748B', fontSize:10, marginTop:4, textAlign:'right' },
  backBtn:       { backgroundColor:'#161B22', borderRadius:12, paddingVertical:14, alignItems:'center', borderWidth:1, borderColor:'#21262D' },
  backBtnTxt:    { color:'#6366F1', fontWeight:'700', fontSize:14 },
});
