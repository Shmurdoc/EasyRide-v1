import React, { useState, useEffect, useRef } from 'react';
import {
  View, TextInput, FlatList, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, StatusBar, Text,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth, useSocket, COLORS, SPACING, RADIUS, SHADOWS } from '@easyryde/shared';
import { Typography, GradientText, GlassCard } from '@easyryde/shared';
import type { ChatMessage } from '@easyryde/shared';
import type { RiderNav, RiderRoute } from '@easyryde/shared';

const QUICK_REPLIES = [
  { id: 'here', label: "I'm here", icon: 'location-outline' as const },
  { id: 'ontheway', label: 'On my way', icon: 'navigate-outline' as const },
  { id: '5mins', label: '5 minutes away', icon: 'time-outline' as const },
];

function formatTime(timestamp: string): string {
  const d = new Date(timestamp);
  return d.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' });
}

export default function ChatScreen({ route, navigation }: { route: RiderRoute<'Chat'>; navigation: RiderNav }) {
  const { rideId, receiverId } = route.params;
  const { user, token } = useAuth();
  const { isConnected, isReconnecting, reconnectAttempt, emit, on, joinRoom, leaveRoom } = useSocket({ token: token || '' });
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => { joinRoom(`ride:${rideId}`); return () => leaveRoom(`ride:${rideId}`); }, [rideId]);

  useEffect(() => {
    if (!isConnected) return;
    const unsubs = [
      on('chat:message', (msg: any) => {
        setMessages((prev) => [...prev, msg as ChatMessage]);
        setIsTyping(false);
      }),
      on('chat:history', (data: any) => setMessages(data.messages || [])),
      on('chat:typing', (data: any) => {
        if (data.senderId !== user?.id) setIsTyping(true);
      }),
    ];
    return () => { unsubs.forEach(u => u()); };
  }, [isConnected]);

  useEffect(() => {
    if (isTyping) {
      const timer = setTimeout(() => setIsTyping(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isTyping]);

  const sendMessage = (text?: string) => {
    const msg = text || input.trim();
    if (!msg || !user) return;
    emit('chat:send', { rideId, message: msg, receiverId });
    setMessages((prev) => [
      ...prev,
      {
        id: `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        rideId,
        senderId: user.id,
        receiverId,
        message: msg,
        timestamp: new Date().toISOString(),
      },
    ]);
    setInput('');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Typography variant="h4" color={COLORS.text}>Chat</Typography>
          {isReconnecting && (
            <Typography variant="small" color={COLORS.warning}>Reconnecting...</Typography>
          )}
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Ionicons name="chatbubbles-outline" size={48} color={COLORS.textDim} />
            <Typography variant="bodySmall" color={COLORS.textDim} style={{ marginTop: SPACING.md }}>
              Start a conversation
            </Typography>
          </View>
        }
        renderItem={({ item }) => {
          const isMe = item.senderId === user?.id;
          return (
            <View style={[styles.bubbleRow, isMe ? styles.bubbleRowMe : styles.bubbleRowThem]}>
              {!isMe && (
                <View style={styles.senderAvatar}>
                  <Ionicons name="person" size={14} color={COLORS.textMuted} />
                </View>
              )}
              <View style={[styles.bubble, isMe ? styles.bubbleMe : styles.bubbleThem]}>
                <Text style={[styles.bubbleText, isMe ? styles.bubbleTextMe : styles.bubbleTextThem]}>
                  {item.message}
                </Text>
                <Text style={[styles.bubbleTime, isMe ? styles.bubbleTimeMe : styles.bubbleTimeThem]}>
                  {formatTime(item.timestamp)}
                </Text>
              </View>
            </View>
          );
        }}
      />

      {/* Typing Indicator */}
      {isTyping && (
        <View style={styles.typingRow}>
          <View style={styles.typingDots}>
            <View style={[styles.typingDot, { animationDelay: '0ms' }]} />
            <View style={[styles.typingDot, { animationDelay: '200ms' }]} />
            <View style={[styles.typingDot, { animationDelay: '400ms' }]} />
          </View>
          <Typography variant="small" color={COLORS.textDim}>typing...</Typography>
        </View>
      )}

      {/* Quick Replies */}
      <View style={styles.quickReplies}>
        {QUICK_REPLIES.map((qr) => (
          <TouchableOpacity
            key={qr.id}
            style={styles.quickReplyBtn}
            onPress={() => sendMessage(qr.label)}
            activeOpacity={0.7}
          >
            <Ionicons name={qr.icon} size={14} color={COLORS.primary} />
            <Text style={styles.quickReplyText}>{qr.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Input Bar */}
      <View style={styles.inputBar}>
        <View style={styles.inputWrap}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Type a message..."
            placeholderTextColor={COLORS.textDim}
            multiline
          />
        </View>
        <TouchableOpacity
          style={[styles.sendButton, !input.trim() && styles.sendButtonDisabled]}
          onPress={() => sendMessage()}
          disabled={!input.trim()}
          activeOpacity={0.7}
        >
          <Ionicons name="send" size={20} color={input.trim() ? COLORS.bg : COLORS.textDim} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.base, paddingTop: 56, paddingBottom: SPACING.sm,
    backgroundColor: COLORS.bg, borderBottomWidth: 1, borderBottomColor: COLORS.surfaceBorder,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.surface,
    justifyContent: 'center', alignItems: 'center',
  },
  headerInfo: { flex: 1, alignItems: 'center' },
  messagesList: { padding: SPACING.base, paddingBottom: SPACING.sm },
  emptyWrap: { alignItems: 'center', paddingVertical: SPACING['3xl'] },
  bubbleRow: { flexDirection: 'row', marginBottom: SPACING.md, alignItems: 'flex-end' },
  bubbleRowMe: { justifyContent: 'flex-end' },
  bubbleRowThem: { justifyContent: 'flex-start' },
  senderAvatar: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: COLORS.surfaceElevated,
    justifyContent: 'center', alignItems: 'center',
    marginRight: SPACING.sm,
  },
  bubble: {
    maxWidth: '75%', borderRadius: RADIUS.lg,
    padding: SPACING.md, paddingBottom: SPACING.sm,
  },
  bubbleMe: {
    backgroundColor: COLORS.primary,
    borderBottomRightRadius: RADIUS.xs,
  },
  bubbleThem: {
    backgroundColor: COLORS.surface,
    borderBottomLeftRadius: RADIUS.xs,
  },
  bubbleText: { fontSize: 15, lineHeight: 21 },
  bubbleTextMe: { color: COLORS.bg },
  bubbleTextThem: { color: COLORS.text },
  bubbleTime: { fontSize: 10, marginTop: 4 },
  bubbleTimeMe: { color: 'rgba(18,18,18,0.5)', textAlign: 'right' },
  bubbleTimeThem: { color: COLORS.textDim, textAlign: 'left' },
  typingRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    paddingHorizontal: SPACING.base, paddingBottom: SPACING.xs,
  },
  typingDots: { flexDirection: 'row', gap: 3 },
  typingDot: {
    width: 5, height: 5, borderRadius: 2.5,
    backgroundColor: COLORS.textDim,
  },
  quickReplies: {
    flexDirection: 'row', gap: SPACING.sm,
    paddingHorizontal: SPACING.base, paddingBottom: SPACING.sm,
  },
  quickReplyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    borderWidth: 1, borderColor: COLORS.surfaceBorder,
  },
  quickReplyText: { color: COLORS.primary, fontSize: 12, fontWeight: '600' },
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end',
    padding: SPACING.md, paddingBottom: Platform.OS === 'ios' ? 36 : SPACING.md,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1, borderTopColor: COLORS.surfaceBorder,
    gap: SPACING.sm,
  },
  inputWrap: { flex: 1 },
  input: {
    borderWidth: 1, borderColor: COLORS.surfaceBorder,
    borderRadius: RADIUS.lg, backgroundColor: COLORS.surfaceElevated,
    paddingHorizontal: SPACING.base, paddingVertical: SPACING.sm + 2,
    fontSize: 15, maxHeight: 100, color: COLORS.text,
  },
  sendButton: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: COLORS.primary,
    justifyContent: 'center', alignItems: 'center',
  },
  sendButtonDisabled: { backgroundColor: COLORS.surfaceElevated },
});
