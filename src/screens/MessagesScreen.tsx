import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { supabase } from '../lib/supabase';
import type { Message } from '../types';

export default function MessagesScreen({ route }: any) {
  const { patientId } = route.params;
  const { user } = useAuth();
  const { t } = useLanguage();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [recipientId, setRecipientId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let active = true;
    const fetchConversation = async () => {
      if (!user || !patientId) return;
      setLoading(true);
      const [{ data: patient }, { data: assignment }] = await Promise.all([
        supabase.from('patients').select('user_id').eq('id', patientId).single(),
        supabase.from('care_team').select('clinician_id').eq('patient_id', patientId).order('role', { ascending: true }).limit(1).maybeSingle(),
      ]);

      const resolvedRecipient = user.id === patient?.user_id ? assignment?.clinician_id : patient?.user_id;
      if (active) setRecipientId(resolvedRecipient || null);

      const { data, error } = await supabase.from('messages')
        .select('*')
        .eq('patient_id', patientId)
        .order('timestamp', { ascending: true });
      if (active) {
        if (error) Alert.alert('Messages unavailable', 'We could not load this conversation. Please try again.');
        setMessages((data || []) as Message[]);
        setLoading(false);
      }
    };
    fetchConversation();

    const sub = supabase
      .channel(`messages:${patientId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `patient_id=eq.${patientId}` }, (payload) => {
        if (active) setMessages(prev => [...prev, payload.new as Message]);
      })
      .subscribe();

    return () => { active = false; sub.unsubscribe(); };
  }, [patientId, user?.id]);

  const send = async () => {
    const body = text.trim();
    if (!body || !user || !recipientId || sending) return;
    if (body.length > 4000) {
      Alert.alert('Message too long', 'Please keep messages under 4,000 characters.');
      return;
    }
    setSending(true);
    const { error } = await supabase.from('messages').insert({
      patient_id: patientId,
      sender_id: user.id,
      recipient_id: recipientId,
      body,
      timestamp: new Date().toISOString(),
    });
    setSending(false);
    if (error) {
      Alert.alert('Message not sent', 'No active care-team recipient was found or the message could not be saved.');
      return;
    }
    setText('');
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Text style={styles.title}>{t('messages')}</Text>
      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshing={loading}
        renderItem={({ item }) => (
          <View style={[styles.bubble, item.sender_id === user?.id ? styles.myBubble : styles.theirBubble]}>
            <Text style={[styles.bubbleText, item.sender_id === user?.id && styles.myBubbleText]}>{item.body}</Text>
            <Text style={[styles.time, item.sender_id === user?.id && styles.myBubbleText]}>{new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>{recipientId ? 'No messages yet. Start a conversation with the care team.' : 'No active care-team conversation is configured.'}</Text>}
      />
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={setText}
          placeholder={t('typeMessage')}
          maxLength={4000}
          multiline
          accessibilityLabel={t('typeMessage')}
        />
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Send message" style={[styles.sendBtn, (!recipientId || sending) && styles.disabled]} onPress={send} disabled={!recipientId || sending}>
          <Text style={styles.sendText}>{sending ? '…' : 'Send'}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F1EB' },
  title: { fontSize: 24, fontWeight: '800', color: '#1A1A2E', padding: 20, paddingTop: 60 },
  list: { padding: 16, flexGrow: 1 },
  empty: { textAlign: 'center', color: '#7A6E65', fontSize: 14, marginTop: 40 },
  bubble: { maxWidth: '80%', borderRadius: 16, padding: 12, marginBottom: 8 },
  myBubble: { alignSelf: 'flex-end', backgroundColor: '#1a73e8' },
  theirBubble: { alignSelf: 'flex-start', backgroundColor: '#fff', borderWidth: 1, borderColor: '#D9CEC4' },
  bubbleText: { fontSize: 15, color: '#1A1A2E' },
  myBubbleText: { color: '#fff' },
  time: { fontSize: 10, color: '#7A6E65', marginTop: 4, textAlign: 'right' },
  inputRow: { flexDirection: 'row', padding: 12, borderTopWidth: 1, borderColor: '#D9CEC4', backgroundColor: '#fff', alignItems: 'flex-end' },
  input: { flex: 1, backgroundColor: '#F7F1EB', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, marginRight: 8, maxHeight: 120 },
  sendBtn: { backgroundColor: '#1a73e8', borderRadius: 20, paddingHorizontal: 20, paddingVertical: 10 },
  disabled: { opacity: 0.45 },
  sendText: { color: '#fff', fontWeight: '600' },
});
