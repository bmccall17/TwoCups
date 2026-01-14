import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { createRequest, getActiveRequestsInfo } from '../services/api';
import type { ActiveRequestsInfo } from '../services/api';
import { Button, TextInput } from '../components/common';
import { colors, spacing, typography, borderRadius } from '../theme';

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

interface MakeRequestScreenProps {
  onGoBack: () => void;
}

export function MakeRequestScreen({ onGoBack }: MakeRequestScreenProps) {
  const { user, userData, coupleData } = useAuth();
  const { showSuccess, showError } = useToast();
  const [action, setAction] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [requestsInfo, setRequestsInfo] = useState<ActiveRequestsInfo | null>(null);

  const coupleId = userData?.activeCoupleId;
  const myUid = user?.uid;
  const partnerIds = coupleData?.partnerIds ?? [];
  const partnerId = partnerIds.find(id => id !== myUid);

  const loadRequestsInfo = useCallback(async () => {
    if (!coupleId) return;
    try {
      const info = await getActiveRequestsInfo(coupleId);
      setRequestsInfo(info);
    } catch (error) {
      console.error('Failed to load active requests info:', error);
    }
  }, [coupleId]);

  useEffect(() => {
    loadRequestsInfo();
  }, [loadRequestsInfo]);

  const atLimit = requestsInfo !== null && requestsInfo.remaining <= 0;

  const handleSubmit = async () => {
    if (!action.trim()) {
      showError('Please enter what you would like');
      return;
    }

    if (!coupleId || !partnerId) {
      showError('No couple found');
      return;
    }

    setLoading(true);
    try {
      await createRequest({
        coupleId,
        forPlayerId: partnerId,
        action: action.trim(),
        description: description.trim() || undefined,
        category: category || undefined,
      });

      await loadRequestsInfo();
      showSuccess(`Request sent! (${requestsInfo ? requestsInfo.count + 1 : 1}/${requestsInfo?.limit || 5} active)`);
      setTimeout(() => onGoBack(), 1500);
    } catch (error: any) {
      showError(error.message || 'Failed to create request');
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
          <Text style={styles.title}>Make a Request</Text>
          <Text style={styles.subtitle}>Ask your partner for something specific</Text>
          
          {/* Active Requests Counter */}
          {requestsInfo && (
            <View style={[styles.counterContainer, atLimit && styles.counterContainerLimit]}>
              <Text style={[styles.counterText, atLimit && styles.counterTextLimit]}>
                {atLimit 
                  ? `⚠️ Limit reached (${requestsInfo.count}/${requestsInfo.limit} active requests)`
                  : `📋 ${requestsInfo.count}/${requestsInfo.limit} active requests`}
              </Text>
            </View>
          )}
        </View>

        {/* Form */}
        <View style={styles.formSection}>
          <TextInput
            label="What would you like?"
            value={action}
            onChangeText={setAction}
            placeholder="e.g., Make me coffee in the morning"
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

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            Your request will appear in your partner's Log Attempt screen. When they fulfill it, you both get bonus gems!
          </Text>
        </View>

        {/* Submit Button */}
        <Button
          title={atLimit ? "Request Limit Reached" : "Send Request 💌"}
          onPress={handleSubmit}
          loading={loading}
          disabled={!action.trim() || atLimit}
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
  counterContainer: {
    marginTop: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    alignSelf: 'flex-start',
  },
  counterContainerLimit: {
    backgroundColor: colors.error + '20',
  },
  counterText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  counterTextLimit: {
    color: colors.error,
    fontWeight: '600',
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
  infoBox: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.xl,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  infoText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  submitButton: {
    marginTop: 'auto',
  },
});
