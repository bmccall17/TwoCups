import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase/config';
import { useAuth } from '../context/AuthContext';
import { logAttempt } from '../services/api';
import { Button, TextInput } from '../components/common';
import { colors, spacing, typography, borderRadius } from '../theme';
import { Request } from '../types';

const CATEGORIES = [
  'Words of Affirmation',
  'Acts of Service',
  'Quality Time',
  'Physical Touch',
  'Gifts',
  'Support & Encouragement',
  'Listening & Presence',
  'Shared Activities',
  'Surprises & Thoughtfulness',
];

interface LogAttemptScreenProps {
  onGoBack: () => void;
}

export function LogAttemptScreen({ onGoBack }: LogAttemptScreenProps) {
  const { user, userData, coupleData } = useAuth();
  const [action, setAction] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [partnerRequests, setPartnerRequests] = useState<Request[]>([]);

  const coupleId = userData?.activeCoupleId;
  const myUid = user?.uid;
  const partnerIds = coupleData?.partnerIds ?? [];
  const partnerId = partnerIds.find(id => id !== myUid);

  // Fetch partner's active requests (requests they made for ME to fulfill)
  useEffect(() => {
    if (!coupleId || !myUid) return;

    const requestsRef = collection(db, 'couples', coupleId, 'requests');
    const q = query(
      requestsRef,
      where('forPlayerId', '==', myUid),
      where('status', '==', 'active')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const requests: Request[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() ?? new Date(),
      })) as Request[];
      setPartnerRequests(requests);
    });

    return unsubscribe;
  }, [coupleId, myUid]);

  const handleSelectRequest = (request: Request) => {
    setAction(request.action);
    setDescription(request.description || '');
    setCategory(request.category || null);
  };

  const handleSubmit = async () => {
    if (!action.trim()) {
      Alert.alert('Error', 'Please enter an action');
      return;
    }

    if (!coupleId || !partnerId) {
      Alert.alert('Error', 'No couple found');
      return;
    }

    setLoading(true);
    try {
      const result = await logAttempt({
        coupleId,
        forPlayerId: partnerId,
        action: action.trim(),
        description: description.trim() || undefined,
        category: category || undefined,
      });

      const gemMessage = result.fulfilledRequestId
        ? `+${result.gemsAwarded} gems! 🎉 Request fulfilled!`
        : `+${result.gemsAwarded} gem!`;

      Alert.alert('Success', gemMessage, [
        { text: 'OK', onPress: onGoBack }
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to log attempt');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onGoBack} style={styles.backButton}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Log an Attempt</Text>
          <Text style={styles.subtitle}>What did you do for your partner?</Text>
        </View>

        {/* Partner's Requests */}
        {partnerRequests.length > 0 && (
          <View style={styles.requestsSection}>
            <Text style={styles.sectionTitle}>Partner's Requests</Text>
            <Text style={styles.sectionHint}>Fulfill a request for +2 bonus gems!</Text>
            {partnerRequests.map((request) => (
              <TouchableOpacity
                key={request.id}
                style={styles.requestCard}
                onPress={() => handleSelectRequest(request)}
              >
                <Text style={styles.requestAction}>{request.action}</Text>
                {request.category && (
                  <Text style={styles.requestCategory}>{request.category}</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Action Input */}
        <View style={styles.formSection}>
          <TextInput
            label="Action"
            value={action}
            onChangeText={setAction}
            placeholder="What did you do?"
            multiline
          />

          <TextInput
            label="Description (optional)"
            value={description}
            onChangeText={setDescription}
            placeholder="Add more details..."
            multiline
          />

          {/* Category Picker */}
          <Text style={styles.inputLabel}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.categoryChip,
                  category === cat && styles.categoryChipSelected,
                ]}
                onPress={() => setCategory(category === cat ? null : cat)}
              >
                <Text
                  style={[
                    styles.categoryChipText,
                    category === cat && styles.categoryChipTextSelected,
                  ]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Submit Button */}
        <Button
          title="Log Attempt 💝"
          onPress={handleSubmit}
          loading={loading}
          disabled={!action.trim()}
          style={styles.submitButton}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    padding: spacing.lg,
  },
  header: {
    marginBottom: spacing.xl,
  },
  backButton: {
    marginBottom: spacing.md,
  },
  backText: {
    ...typography.body,
    color: colors.primary,
  },
  title: {
    ...typography.h1,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
  },
  requestsSection: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  sectionHint: {
    ...typography.caption,
    color: colors.success,
    marginBottom: spacing.md,
  },
  requestCard: {
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  requestAction: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  requestCategory: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  formSection: {
    marginBottom: spacing.xl,
  },
  inputLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  categoryScroll: {
    marginBottom: spacing.md,
  },
  categoryChip: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginRight: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  categoryChipText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  categoryChipTextSelected: {
    color: colors.textOnPrimary,
  },
  submitButton: {
    marginTop: 'auto',
  },
});
