import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export function ChatBubble({ message }) {
  const isUser = message.sender === 'user';
  return (
    <View style={[styles.row, isUser && styles.rowRight]}>
      {!isUser && <View style={styles.avatar}><Text style={styles.avatarText}>AI</Text></View>}
      <View style={[styles.bubble, isUser ? styles.userBubble : styles.agentBubble]}>
        {message.isAlert && <Text style={styles.alertBadge}>⚡ SYSTEM ALERT</Text>}
        <Text style={isUser ? styles.userText : styles.agentText}>{message.text}</Text>
        <Text style={styles.time}>{message.time}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row:         { flexDirection:'row', marginVertical:4, paddingHorizontal:12, alignItems:'flex-end' },
  rowRight:    { flexDirection:'row-reverse' },
  avatar:      { width:28, height:28, borderRadius:14, backgroundColor:'#6366F1', alignItems:'center', justifyContent:'center', marginRight:6, marginBottom:2 },
  avatarText:  { color:'#FFF', fontSize:9, fontWeight:'800' },
  bubble:      { maxWidth:'78%', padding:12, borderRadius:16, elevation:1 },
  userBubble:  { backgroundColor:'#6366F1', borderBottomRightRadius:4 },
  agentBubble: { backgroundColor:'#1C2333', borderBottomLeftRadius:4, borderWidth:1, borderColor:'#2D3748' },
  alertBadge:  { color:'#F97316', fontSize:10, fontWeight:'700', marginBottom:4 },
  userText:    { color:'#FFF', fontSize:14, lineHeight:20 },
  agentText:   { color:'#E2E8F0', fontSize:14, lineHeight:20 },
  time:        { color:'rgba(255,255,255,0.45)', fontSize:10, marginTop:4, textAlign:'right' },
});
