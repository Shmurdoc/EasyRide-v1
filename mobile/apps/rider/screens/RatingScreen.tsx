import { useTheme } from '@easyryde/shared';
import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Animated,
  StatusBar,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import {
  COLORS,
  GRADIENTS,
  SPACING,
  RADIUS,
  SHADOWS,
} from '@easyryde/shared';
import {
  GlowButton,
  GlassCard,
  GradientText,
  Typography,
  Avatar,
} from '@easyryde/shared';
import { rides } from '@easyryde/shared';
import type { RiderNav, RiderRoute } from '@easyryde/shared';

const FEEDBACK_TAGS = [
  'Clean car',
  'Good driving',
  'Friendly',
  'Great music',
  'Safe driving',
];

const TIP_AMOUNTS = [10, 20, 50];

type Props = {
  navigation: RiderNav;
  route: RiderRoute<'Rating'>;
};

export default function RatingScreen({ navigation, route }: Props) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const { rideId, driverName, driverAvatar } = route.params;

  const [rating, setRating] = useState(0);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [feedback, setFeedback] = useState('');
  const [selectedTip, setSelectedTip] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const starAnims = useRef(
    [1, 2, 3, 4, 5].map(() => new Animated.Value(1)),
  ).current;

  const handleStarPress = useCallback(
    (star: number) => {
      setRating(star);
      starAnims.forEach((anim, i) => {
        Animated.spring(anim, {
          toValue: i < star ? 1.2 : 1,
          useNativeDriver: true,
          speed: 50,
          bounciness: 8,
        }).start(() => {
          Animated.spring(anim, {
            toValue: i < star ? 1.05 : 1,
            useNativeDriver: true,
            speed: 50,
            bounciness: 4,
          }).start();
        });
      });
    },
    [starAnims],
  );

  const toggleTag = useCallback((tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  }, []);

  const handleSubmit = useCallback(async () => {
    if (rating === 0) {
      Alert.alert('Rating Required', 'Please select a star rating');
      return;
    }
    setSubmitting(true);
    try {
      const commentParts: string[] = [];
      if (selectedTags.length > 0) commentParts.push(`Tags: ${selectedTags.join(', ')}`);
      if (feedback.trim()) commentParts.push(feedback.trim());
      if (selectedTip) commentParts.push(`Tip: R${selectedTip}`);
      const comment = commentParts.length > 0 ? commentParts.join(' | ') : undefined;

      await rides.rate(rideId, rating, comment);
      Alert.alert('Thank You!', 'Your feedback has been submitted', [
        { text: 'OK', onPress: () => navigation.navigate('Main') },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to submit rating');
    } finally {
      setSubmitting(false);
    }
  }, [rating, selectedTags, feedback, selectedTip, rideId, navigation]);

  const RATING_LABELS: Record<number, string> = {
    1: 'Poor',
    2: 'Fair',
    3: 'Good',
    4: 'Great!',
    5: 'Excellent!',
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <LinearGradient
        colors={GRADIENTS.background as unknown as string[]}
        style={styles.container}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.backBtn}
            >
              <Ionicons name="arrow-back" size={24} color={COLORS.text} />
            </TouchableOpacity>
            <GradientText
              colors={GRADIENTS.primary}
              style={{ fontSize: 22, fontWeight: '700' }}
            >
              Rate Your Ride
            </GradientText>
            <View style={{ width: 40 }} />
          </View>

          {/* Driver Info */}
          <View style={styles.driverSection}>
            <Avatar name={driverName || ''} size={72} />
            <Typography
              variant="h3"
              color={COLORS.text}
              style={{ marginTop: SPACING.md, fontWeight: '700' }}
            >
              {driverName || 'Driver'}
            </Typography>
            <Typography variant="body" color={COLORS.textMuted}>
              How was your trip?
            </Typography>
          </View>

          {/* Star Rating */}
          <GlassCard padding={SPACING.lg} style={styles.card}>
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => handleStarPress(star)}
                  activeOpacity={0.6}
                >
                  <Animated.View
                    style={{
                      transform: [{ scale: starAnims[star - 1] }],
                      marginHorizontal: 6,
                    }}
                  >
                    <Ionicons
                      name={star <= rating ? 'star' : 'star-outline'}
                      size={44}
                      color={star <= rating ? COLORS.warning : COLORS.textDim}
                    />
                  </Animated.View>
                </TouchableOpacity>
              ))}
            </View>
            {rating > 0 && (
              <Typography
                variant="h4"
                color={COLORS.primary}
                style={{ textAlign: 'center', marginTop: SPACING.md }}
              >
                {RATING_LABELS[rating]}
              </Typography>
            )}
          </GlassCard>

          {/* Quick Feedback Tags */}
          <View style={styles.section}>
            <Typography
              variant="label"
              color={COLORS.textMuted}
              style={styles.sectionLabel}
            >
              QUICK FEEDBACK
            </Typography>
            <View style={styles.tagsRow}>
              {FEEDBACK_TAGS.map((tag) => {
                const isSelected = selectedTags.includes(tag);
                return (
                  <TouchableOpacity
                    key={tag}
                    onPress={() => toggleTag(tag)}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.tag,
                        isSelected && styles.tagSelected,
                      ]}
                    >
                      <Ionicons
                        name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
                        size={16}
                        color={isSelected ? COLORS.primary : COLORS.textMuted}
                      />
                      <Text
                        style={[
                          styles.tagText,
                          isSelected && styles.tagTextSelected,
                        ]}
                      >
                        {tag}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Text Feedback */}
          <View style={styles.section}>
            <Typography
              variant="label"
              color={COLORS.textMuted}
              style={styles.sectionLabel}
            >
              ADD A COMMENT (OPTIONAL)
            </Typography>
            <View style={styles.textInputContainer}>
              <TextInput
                style={styles.textInput}
                placeholder="Tell us more about your experience..."
                placeholderTextColor={COLORS.textDim}
                value={feedback}
                onChangeText={setFeedback}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
          </View>

          {/* Tip Section */}
          <View style={styles.section}>
            <Typography
              variant="label"
              color={COLORS.textMuted}
              style={styles.sectionLabel}
            >
              ADD A TIP (OPTIONAL)
            </Typography>
            <View style={styles.tipRow}>
              {TIP_AMOUNTS.map((amount) => {
                const isSelected = selectedTip === amount;
                return (
                  <TouchableOpacity
                    key={amount}
                    onPress={() => setSelectedTip(isSelected ? null : amount)}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.tipCard,
                        isSelected && styles.tipCardSelected,
                      ]}
                    >
                      <Typography
                        variant="h4"
                        color={isSelected ? COLORS.bg : COLORS.primary}
                        style={{ fontWeight: '700' }}
                      >
                        R{amount}
                      </Typography>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Submit */}
          <GlowButton
            title={submitting ? 'Submitting...' : 'Submit Rating'}
            onPress={handleSubmit}
            disabled={submitting || rating === 0}
            size="lg"
            style={styles.submitBtn}
          />

          <TouchableOpacity
            onPress={() => navigation.navigate('Main')}
            style={styles.skipBtn}
          >
            <Typography variant="body" color={COLORS.textMuted}>
              Skip for now
            </Typography>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.base,
    paddingBottom: 48,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 56 : 44,
    paddingBottom: SPACING.base,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  driverSection: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  card: {
    marginBottom: SPACING.lg,
  },
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    marginBottom: SPACING.lg,
  },
  sectionLabel: {
    marginBottom: SPACING.md,
    letterSpacing: 0.8,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  tagSelected: {
    backgroundColor: 'rgba(255, 173, 122, 0.12)',
    borderColor: COLORS.primary,
  },
  tagText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textMuted,
  },
  tagTextSelected: {
    color: COLORS.primary,
  },
  textInputContainer: {
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    padding: SPACING.md,
  },
  textInput: {
    fontSize: 15,
    color: COLORS.text,
    minHeight: 100,
    lineHeight: 22,
  },
  tipRow: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  tipCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.base,
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: RADIUS.lg,
    borderWidth: 1.5,
    borderColor: COLORS.surfaceBorder,
  },
  tipCardSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  submitBtn: {
    marginBottom: SPACING.md,
  },
  skipBtn: {
    alignItems: 'center',
    paddingVertical: SPACING.md,
  },
});
