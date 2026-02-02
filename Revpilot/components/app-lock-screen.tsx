import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { useAppLock, PIN_LENGTH } from '@/context/app-lock-context';

export function AppLockScreen() {
  const { checkPin, unlock, useBiometric, biometricSupported } = useAppLock();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [biometricError, setBiometricError] = useState('');

  const handleUnlockWithPin = useCallback(async () => {
    if (pin.length !== PIN_LENGTH) {
      setError(`Enter ${PIN_LENGTH} digits`);
      return;
    }
    setError('');
    setIsVerifying(true);
    try {
      const ok = await checkPin(pin);
      if (ok) {
        setPin('');
        unlock();
      } else {
        setError('Wrong PIN');
        setPin('');
      }
    } finally {
      setIsVerifying(false);
    }
  }, [pin, checkPin, unlock]);

  const handleBiometric = useCallback(async () => {
    setBiometricError('');
    setIsVerifying(true);
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock Revpilot',
        fallbackLabel: 'Use PIN',
      });
      if (result.success) {
        unlock();
      } else {
        setBiometricError(result.error === 'user_cancel' ? '' : 'Biometric failed');
      }
    } catch {
      setBiometricError('Not available');
    } finally {
      setIsVerifying(false);
    }
  }, [unlock]);

  const onPinChange = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, PIN_LENGTH);
    setPin(digits);
    setError('');
    if (digits.length === PIN_LENGTH) {
      setIsVerifying(true);
      checkPin(digits).then((ok) => {
        if (ok) {
          setPin('');
          unlock();
        } else {
          setError('Wrong PIN');
          setPin('');
        }
        setIsVerifying(false);
      });
    }
  };

  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('screen');

  return (
    <View style={styles.container}>
      <View style={[styles.backgroundLayer, { width: SCREEN_WIDTH, height: SCREEN_HEIGHT }]} pointerEvents="none">
        <LinearGradient
          colors={['#FFCBDA', '#C695B9', '#AF80A1']}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
      </View>
      <KeyboardAvoidingView
        style={styles.inner}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Animated.View entering={FadeInDown.duration(400)} style={styles.card}>
          <View style={styles.iconWrap}>
            <MaterialCommunityIcons name="lock-outline" size={56} color="#AF80A1" />
          </View>
          <Text style={styles.title}>App Locked</Text>
          <Text style={styles.subtitle}>Enter your PIN or use Face ID</Text>

          <TextInput
            style={styles.pinInput}
            value={pin}
            onChangeText={onPinChange}
            keyboardType="number-pad"
            maxLength={PIN_LENGTH}
            secureTextEntry
            placeholder="••••"
            placeholderTextColor="#9a9aaa"
            editable={!isVerifying}
            autoFocus
          />
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          {biometricError ? <Text style={styles.errorText}>{biometricError}</Text> : null}

          {isVerifying ? (
            <ActivityIndicator size="small" color="#AF80A1" style={styles.spinner} />
          ) : (
            <>
              <Pressable
                onPress={handleUnlockWithPin}
                style={({ pressed }) => [styles.unlockBtn, pressed && styles.unlockBtnPressed]}
                accessibilityRole="button"
                accessibilityLabel="Unlock with PIN"
              >
                <LinearGradient
                  colors={['#C695B9', '#AF80A1']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.unlockBtnGradient}
                >
                  <Text style={styles.unlockBtnText}>Unlock</Text>
                </LinearGradient>
              </Pressable>

              {useBiometric && biometricSupported && (
                <Pressable
                  onPress={handleBiometric}
                  style={({ pressed }) => [styles.bioBtn, pressed && styles.bioBtnPressed]}
                  accessibilityRole="button"
                  accessibilityLabel="Unlock with Face ID"
                >
                  <MaterialCommunityIcons name="face-recognition" size={28} color="#AF80A1" />
                  <Text style={styles.bioBtnText}>Use Face ID</Text>
                </Pressable>
              )}
            </>
          )}
        </Animated.View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    overflow: 'hidden',
  },
  backgroundLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 24,
    padding: 32,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
  },
  iconWrap: {
    marginBottom: 16,
  },
  title: {
    fontFamily: 'Merriweather',
    fontSize: 24,
    fontWeight: '700',
    color: '#2f2f3a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#6a6a7a',
    marginBottom: 24,
  },
  pinInput: {
    width: '100%',
    borderWidth: 2,
    borderColor: 'rgba(198, 149, 185, 0.5)',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 24,
    textAlign: 'center',
    letterSpacing: 8,
    color: '#2f2f3a',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 13,
    color: '#c55',
    marginBottom: 8,
  },
  spinner: {
    marginVertical: 16,
  },
  unlockBtn: {
    alignSelf: 'stretch',
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 8,
  },
  unlockBtnPressed: {
    opacity: 0.9,
  },
  unlockBtnGradient: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  unlockBtnText: {
    fontFamily: 'Merriweather',
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  bioBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  bioBtnPressed: {
    opacity: 0.8,
  },
  bioBtnText: {
    fontSize: 16,
    color: '#AF80A1',
    fontWeight: '600',
  },
});
