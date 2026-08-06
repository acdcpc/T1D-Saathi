import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList, KeyboardAvoidingView, Platform } from 'react-native';
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

  useEffect(() => {
    const fetchMessages = async () => {
      const { data } = await supabase.from('messages')
        .select('*')
        .or(`sender_id.eq.${user?.id},recipient_id.eq.${user?.id}`)
        .order('timestamp', { ascending: true });
      setMessages(data || []);
    };
    fetchMessages();

    const sub = supabase
      .channel('messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
        setMessages(prev => [...prev, payload.new as Message]);
      })
      .subscribe();

    return () => { sub.unsubscribe(); };
  }, [patientId, user?.id]);

  const send = async () => {
    if (!text.trim() || !user) return;
    await supabase.from('messages').insert({
      sender_id: user.id,
      recipient_id: 'clinician', // simplified — in real app, resolve from care_team
      body: text.trim(),
      timestamp: new Date().toISOString(),
    });
    setText('');
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Text style={styles.title}>{t('messages')}</Text>
      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={[styles.bubble, item.sender_id === user?.id ? styles.myBubble : styles.theirBubble]}>
            <Text style={styles.bubbleText}>{item.body}</Text>
            <Text style={styles.time}>{new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No messages yet. Send a message to your clinician.</Text>}
      />
      <View style={styles.inputRow}>
        <TextInput style={styles.input} value={text} onChangeText={setText} placeholder={t('typeMessage')} />
        <TouchableOpacity style={styles.sendBtn} onPress={send}>
          <Text style={styles.sendText}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F7FF' },
  title: { fontSize: 24, fontWeight: '800', color: '#202124', padding: 20, paddingTop: 60 },
  list: { padding: 16, flexGrow: 1 },
  empty: { textAlign: 'center', color: '#5f6368', fontSize: 14, marginTop: 40 },
  bubble: { maxWidth: '80%', borderRadius: 16, padding: 12, marginBottom: 8 },
  myBubble: { alignSelf: 'flex-end', backgroundColor: '#1a73e8' },
  theirBubble: { alignSelf: 'flex-start', backgroundColor: '#fff', borderWidth: 1, borderColor: '#e8eaed' },
  bubbleText: { fontSize: 15, color: '#202124' },
  time: { fontSize: 10, color: '#5f6368', marginTop: 4, textAlign: 'right' },
  inputRow: { flexDirection: 'row', padding: 12, borderTopWidth: 1, borderColor: '#dadce0', backgroundColor: '#fff', alignItems: 'flex-end' },
  input: { flex: 1, backgroundColor: '#f1f3f4', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, marginRight: 8 },
  sendBtn: { backgroundColor: '#1a73e8', borderRadius: 20, paddingHorizontal: 20, paddingVertical: 10 },
  sendText: { color: '#fff', fontWeight: '600' },
});
