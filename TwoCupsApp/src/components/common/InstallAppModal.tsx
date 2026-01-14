import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from 'react-native';
import { colors, spacing, typography, borderRadius } from '../../theme';
import { Button } from './Button';

interface InstallAppModalProps {
  visible: boolean;
  isIOS: boolean;
  onInstall: () => void;
  onDismiss: () => void;
}

export function InstallAppModal({
  visible,
  isIOS,
  onInstall,
  onDismiss,
}: InstallAppModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <TouchableWithoutFeedback onPress={onDismiss}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.modal}>
              <View style={styles.iconContainer}>
                <Text style={styles.icon}>💜</Text>
              </View>

              <Text style={styles.title}>Install Two Cups</Text>
              <Text style={styles.subtitle}>
                Add to your home screen for the best experience
              </Text>

              {isIOS ? (
                <View style={styles.instructionsContainer}>
                  <Text style={styles.instructionsTitle}>How to install:</Text>

                  <View style={styles.step}>
                    <View style={styles.stepNumber}>
                      <Text style={styles.stepNumberText}>1</Text>
                    </View>
                    <Text style={styles.stepText}>
                      Tap the <Text style={styles.bold}>Share</Text> button{' '}
                      <Text style={styles.shareIcon}>⬆</Text> at the bottom of your screen
                    </Text>
                  </View>

                  <View style={styles.step}>
                    <View style={styles.stepNumber}>
                      <Text style={styles.stepNumberText}>2</Text>
                    </View>
                    <Text style={styles.stepText}>
                      Scroll down and tap{' '}
                      <Text style={styles.bold}>"Add to Home Screen"</Text>
                    </Text>
                  </View>

                  <View style={styles.step}>
                    <View style={styles.stepNumber}>
                      <Text style={styles.stepNumberText}>3</Text>
                    </View>
                    <Text style={styles.stepText}>
                      Tap <Text style={styles.bold}>"Add"</Text> in the top right corner
                    </Text>
                  </View>

                  <Button
                    title="Got it!"
                    onPress={onDismiss}
                    style={styles.button}
                  />
                </View>
              ) : (
                <View style={styles.androidContainer}>
                  <Text style={styles.benefitsList}>
                    • Quick access from your home screen{'\n'}
                    • Works offline{'\n'}
                    • Full screen experience{'\n'}
                    • Faster loading
                  </Text>

                  <Button
                    title="Install App"
                    onPress={onInstall}
                    style={styles.button}
                  />

                  <TouchableOpacity onPress={onDismiss} style={styles.laterButton}>
                    <Text style={styles.laterText}>Maybe later</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modal: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  icon: {
    fontSize: 36,
  },
  title: {
    ...typography.h2,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  instructionsContainer: {
    width: '100%',
  },
  instructionsTitle: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    fontWeight: '600',
  },
  step: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
    flexShrink: 0,
  },
  stepNumberText: {
    ...typography.caption,
    color: colors.textOnPrimary,
    fontWeight: '700',
  },
  stepText: {
    ...typography.body,
    color: colors.textPrimary,
    flex: 1,
    lineHeight: 22,
  },
  bold: {
    fontWeight: '700',
    color: colors.primary,
  },
  shareIcon: {
    fontSize: 14,
  },
  androidContainer: {
    width: '100%',
    alignItems: 'center',
  },
  benefitsList: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 26,
    marginBottom: spacing.lg,
    alignSelf: 'flex-start',
  },
  button: {
    width: '100%',
    marginTop: spacing.sm,
  },
  laterButton: {
    marginTop: spacing.md,
    padding: spacing.sm,
  },
  laterText: {
    ...typography.body,
    color: colors.textSecondary,
  },
});
