// Caregiver community feed — share tips and support with other T1D families.
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList, ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { supabase } from '../lib/supabase';
import { FONT, T, card } from '../theme';
import EmptyState from '../components/EmptyState';

interface Post {
  id: string;
  author_name: string;
  content: string;
  created_at: string;
}

export default function CommunityScreen({ navigation }: any) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isNe = language === 'ne';
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [draft, setDraft] = useState('');
  const [posting, setPosting] = useState(false);

  const fetchPosts = useCallback(async () => {
    const { data } = await supabase
      .from('community_posts')
      .select('id, author_name, content, created_at')
      .order('created_at', { ascending: false })
      .limit(50);
    setPosts(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchPosts(); }, [fetchPosts]);

  const onRefresh = async () => { setRefreshing(true); await fetchPosts(); setRefreshing(false); };

  const post = async () => {
    const content = draft.trim();
    if (!content) return;
    setPosting(true);
    await supabase.from('community_posts').insert({
      author_name: user?.email?.split('@')[0] || 'Caregiver',
      content,
    });
    setDraft('');
    setPosting(false);
    await fetchPosts();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12} style={{ padding: 8 }}>
          <Ionicons name="arrow-back" size={22} color={T.text} />
        </TouchableOpacity>
        <Text style={styles.title}>{isNe ? 'समुदाय' : 'Community'}</Text>
        <View style={{ width: 30 }} />
      </View>

      <View style={styles.composer}>
        <TextInput
          style={styles.input}
          value={draft}
          onChangeText={setDraft}
          placeholder={isNe ? 'आफ्नो अनुभव वा सुझाव लेख्नुहोस्…' : 'Share a tip or experience…'}
          placeholderTextColor={T.muted}
          multiline
        />
        <TouchableOpacity style={[styles.sendBtn, !draft.trim() && { opacity: 0.5 }]} onPress={post} disabled={posting || !draft.trim()}>
          {posting ? <ActivityIndicator color="#fff" /> : <Ionicons name="send" size={18} color="#fff" />}
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centered}><ActivityIndicator size="large" color={T.blue} /></View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(p) => p.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.blue} colors={[T.blue]} />}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <EmptyState
              icon="family"
              title={isNe ? 'अझै कुनै पोस्ट छैन' : 'No posts yet'}
              message={isNe ? 'पहिलो सन्देश लेखेर सुरु गर्नुहोस्।' : 'Be the first to share a message of support.'}
            />
          }
          renderItem={({ item }) => (
            <View style={styles.postCard}>
              <View style={styles.postHeader}>
                <Ionicons name="person-circle-outline" size={28} color={T.blue} />
                <Text style={styles.author}>{item.author_name}</Text>
                <Text style={styles.time}>{new Date(item.created_at).toLocaleDateString()}</Text>
              </View>
              <Text style={styles.content}>{item.content}</Text>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 8 },
  title: { fontSize: 18, fontFamily: FONT.bold, fontWeight: '700', color: T.text },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: 16, paddingVertical: 10 },
  input: { flex: 1, borderRadius: 18, borderWidth: 1, borderColor: T.border, backgroundColor: T.surface, padding: 12, fontSize: 14, fontFamily: FONT.regular, color: T.text, maxHeight: 100 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: T.blue, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 12, gap: 10, flexGrow: 1 },
  postCard: { ...card, marginBottom: 0 },
  postHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  author: { flex: 1, fontSize: 14, fontFamily: FONT.bold, fontWeight: '700', color: T.text },
  time: { fontSize: 11, fontFamily: FONT.regular, color: T.muted },
  content: { fontSize: 14, fontFamily: FONT.regular, color: T.text, lineHeight: 20 },
});
