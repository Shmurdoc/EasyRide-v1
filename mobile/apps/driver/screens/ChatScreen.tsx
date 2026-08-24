import React, { useState, useEffect, useRef } from 'react';
import { View, TextInput, FlatList, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth, useSocket, COLORS, SPACING, RADIUS } from '@easyryde/shared';
import type { ChatMessage, DriverRoute } from '@easyryde/shared';

export default function ChatScreen({ route }: { route: DriverRoute<'Chat'> }) {
  const { rideId, receiverId } = route.params;
  const { user, token } = useAuth();
  const { isConnected, emit, on, joinRoom, leaveRoom } = useSocket({ token: token || '' });
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => { joinRoom(`ride:${rideId}`); return () => leaveRoom(`ride:${rideId}`); }, [rideId]);

  useEffect(() => {
    if (!isConnected) return;
    const unsubs = [
      on('chat:message', (msg: any) => setMessages((prev) => [...prev, msg as ChatMessage])),
      on('chat:history', (data: any) => setMessages(data.messages || [])),
    ];
    return () => { unsubs.forEach(u => u()); };
  }, [isConnected, on]);

  const sendMessage = () => {
    if (!input.trim() || !user) return;
    emit('chat:send', { rideId, message: input.trim(), receiverId });
    setMessages((prev) => [...prev, {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      rideId, senderId: user.id, receiverId,
      message: input.trim(), timestamp: new Date().toISOString(),
    }]);
    setInput('');
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
      <LinearGradient colors={[COLORS.brand, COLORS.brandDark]} style={styles.header}>
        <Text style={styles.headerTitle}>Chat</Text>
      </LinearGradient>

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: SPACING.base, paddingBottom: SPACING.sm }}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
        renderItem={({ item }) => {
          const isMe = item.senderId === user?.id;
          return (
            <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
              <Text style={[styles.bubbleText, isMe && styles.bubbleTextMe]}>{item.message}</Text>
            </View>
          );
        }}
      />

      <View style={styles.inputBar}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Type a message..."
          placeholderTextColor="#666"
          multiline
        />
        <TouchableOpacity style={[styles.sendButton, !input.trim() && styles.sendButtonDisabled]} onPress={sendMessage} disabled={!input.trim()}>
          <Ionicons name="send" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1c1c1e' },
  header: {
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16,
    borderBottomLeftRadius: 16, borderBottomRightRadius: 16,
  },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#fff' },
  bubble: { maxWidth: '75%', borderRadius: 16, padding: 12, marginBottom: 8 },
  bubbleMe: { alignSelf: 'flex-end', backgroundColor: COLORS.brand },
  bubbleThem: { alignSelf: 'flex-start', backgroundColor: '#242426', borderWidth: 1, borderColor: '#3a3a3c' },
  bubbleText: { fontSize: 15, color: '#fff' },
  bubbleTextMe: { color: '#fff' },
  inputBar: {
    flexDirection: 'row', padding: 12, paddingBottom: 32,
    borderTopWidth: 1, borderTopColor: '#3a3a3c',
    backgroundColor: '#242426',
  },
  input: {
    flex: 1, borderWidth: 1, borderColor: '#3a3a3c', backgroundColor: '#1c1c1e',
    borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10,
    fontSize: 15, maxHeight: 100, color: '#fff',
  },
  sendButton: {
    backgroundColor: COLORS.brand, borderRadius: 20,
    width: 40, height: 40, justifyContent: 'center', alignItems: 'center',
    marginLeft: 8,
  },
  sendButtonDisabled: { opacity: 0.5 },
});
