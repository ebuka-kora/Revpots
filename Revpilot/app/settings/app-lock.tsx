import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  ImageBackground,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { GlassCardBase } from '../../constants/theme';
import { useAppLock, PIN_LENGTH } from '@/context/app-lock-context';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('screen');
const allowDigitsOnly = (value: string): string => value.replace(/\D/g, '').slice(0, PIN_LENGTH);

export default function AppLockScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const {
    hasPin,
    useBiometric,
    setPin,
    removePin,
    setUseBiometric,
    lock,
    biometricSupported,
  } = useAppLock();

  const [step, setStep] = useState<'main' | 'set' | 'confirm' | 'change' | 'changeConfirm'>('main');
  const [pinValue, setPinValue] = useState('');
  const [confirmValue, setConfirmValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSetPin = useCallback(async () => {
    if (pinValue.length !== PIN_LENGTH) return;
    setStep('confirm');
    setConfirmValue('');
  }, [pinValue]);

  const handleConfirmSetPin = useCallback(async () => {
    if (confirmValue.length !== PIN_LENGTH || pinValue !== confirmValue) {
      Alert.alert('PINs don\'t match', 'Please enter the same PIN twice.');
      return;
    }
    setIsSaving(true);
    try {
      await setPin(pinValue);
      setPinValue('');
      setConfirmValue('');
      setStep('main');
      router.back();
    } finally {
      setIsSaving(false);
    }
  }, [pinValue, confirmValue, setPin, router]);

  const handleChangePin = useCallback(async () => {
    if (pinValue.length !== PIN_LENGTH) return;
    setStep('changeConfirm');
    setConfirmValue('');
  }, [pinValue]);

  const handleConfirmChangePin = useCallback(async () => {
    if (confirmValue.length !== PIN_LENGTH || pinValue !== confirmValue) {
      Alert.alert('PINs don\'t match', 'Please enter the same PIN twice.');
      return;
    }
    setIsSaving(true);
    try {
      await setPin(pinValue);
      setPinValue('');
      setConfirmValue('');
      setStep('main');
    } finally {
      setIsSaving(false);
    }
  }, [pinValue, confirmValue, setPin]);

  const handleRemovePin = useCallback(() => {
    Alert.alert(
      'Remove PIN?',
      'The app will no longer be locked. You can set a new PIN anytime.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: async () => {
          await removePin();
          router.back();
        }},
      ]
    );
  }, [removePin, router]);

  const handleLockNow = useCallback(() => {
    lock();
    router.back();
  }, [lock, router]);

  const handleBiometricToggle = useCallback(async (value: boolean) => {
    await setUseBiometric(value);
  }, [setUseBiometric]);

  if (step === 'set' || step === 'confirm') {
    return (
      <View style={styles.screenWrap}>
        <View style={styles.backgroundLayer}>
          <ImageBackground
            source={require('../../assets/images/omyre1.png')}
            style={styles.background}
            imageStyle={styles.backgroundImage}
            resizeMode="contain"
          />
        </View>
        <SafeAreaView style={[styles.container, { paddingTop: insets.top + 50 }]}>
          <View style={styles.headerRow}>
            <Pressable onPress={() => { setStep('main'); setPinValue(''); setConfirmValue(''); }} style={styles.backButton}>
              <MaterialCommunityIcons name="chevron-left" size={22} color="#2f2f3a" />
            </Pressable>
            <Text style={styles.title}>{step === 'set' ? 'Set PIN' : 'Confirm PIN'}</Text>
            <View style={styles.headerSpacer} />
          </View>
          <ScrollView contentContainerStyle={styles.content}>
            <Text style={styles.label}>
              {step === 'set' ? `Enter ${PIN_LENGTH}-digit PIN` : 'Enter PIN again'}
            </Text>
            <TextInput
              style={styles.input}
              value={step === 'confirm' ? confirmValue : pinValue}
              onChangeText={step === 'confirm' ? (v) => setConfirmValue(allowDigitsOnly(v)) : (v) => setPinValue(allowDigitsOnly(v))}
              keyboardType="number-pad"
              maxLength={PIN_LENGTH}
              secureTextEntry
              placeholder="••••"
              placeholderTextColor="#9a9aaa"
            />
            <Pressable
              onPress={step === 'set' ? handleSetPin : handleConfirmSetPin}
              disabled={(step === 'set' ? pinValue : confirmValue).length !== PIN_LENGTH || isSaving}
              style={[styles.primaryBtn, isSaving && styles.primaryBtnDisabled]}
            >
              {isSaving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.primaryBtnText}>Continue</Text>}
            </Pressable>
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  }

  if (step === 'change' || step === 'changeConfirm') {
    return (
      <View style={styles.screenWrap}>
        <View style={styles.backgroundLayer}>
          <ImageBackground
            source={require('../../assets/images/omyre1.png')}
            style={styles.background}
            imageStyle={styles.backgroundImage}
            resizeMode="contain"
          />
        </View>
        <SafeAreaView style={[styles.container, { paddingTop: insets.top + 50 }]}>
          <View style={styles.headerRow}>
            <Pressable onPress={() => { setStep('main'); setPinValue(''); setConfirmValue(''); }} style={styles.backButton}>
              <MaterialCommunityIcons name="chevron-left" size={22} color="#2f2f3a" />
            </Pressable>
            <Text style={styles.title}>{step === 'change' ? 'New PIN' : 'Confirm new PIN'}</Text>
            <View style={styles.headerSpacer} />
          </View>
          <ScrollView contentContainerStyle={styles.content}>
            <Text style={styles.label}>
              {step === 'change' ? `Enter new ${PIN_LENGTH}-digit PIN` : 'Enter new PIN again'}
            </Text>
            <TextInput
              style={styles.input}
              value={step === 'changeConfirm' ? confirmValue : pinValue}
              onChangeText={step === 'changeConfirm' ? (v) => setConfirmValue(allowDigitsOnly(v)) : (v) => setPinValue(allowDigitsOnly(v))}
              keyboardType="number-pad"
              maxLength={PIN_LENGTH}
              secureTextEntry
              placeholder="••••"
              placeholderTextColor="#9a9aaa"
            />
            <Pressable
              onPress={step === 'change' ? handleChangePin : handleConfirmChangePin}
              disabled={(step === 'change' ? pinValue : confirmValue).length !== PIN_LENGTH || isSaving}
              style={[styles.primaryBtn, isSaving && styles.primaryBtnDisabled]}
            >
              {isSaving ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.primaryBtnText}>Change PIN</Text>}
            </Pressable>
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.screenWrap}>
      <View style={styles.backgroundLayer}>
        <ImageBackground
          source={require('../../assets/images/omyre1.png')}
          style={styles.background}
          imageStyle={styles.backgroundImage}
          resizeMode="contain"
        />
      </View>
      <SafeAreaView style={[styles.container, { paddingTop: insets.top + 50 }]}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <MaterialCommunityIcons name="chevron-left" size={22} color="#2f2f3a" />
          </Pressable>
          <Text style={styles.title}>App Lock</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          {!hasPin ? (
            <Animated.View entering={FadeInDown.delay(40)} style={styles.section}>
              <Text style={styles.sectionTitle}>Set up PIN</Text>
              <Pressable style={styles.row} onPress={() => setStep('set')}>
                <View style={styles.rowLeft}>
                  <MaterialCommunityIcons name="lock-plus-outline" size={20} color="#6f7aa6" />
                  <Text style={styles.rowText}>Set PIN</Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={20} color="#b0b0c0" />
              </Pressable>
              <Text style={styles.hint}>Use a 4-digit PIN to lock the app. You can unlock with PIN or Face ID.</Text>
            </Animated.View>
          ) : (
            <>
              <Animated.View entering={FadeInDown.delay(40)} style={styles.section}>
                <Text style={styles.sectionTitle}>PIN</Text>
                <Pressable style={styles.row} onPress={() => setStep('change')}>
                  <View style={styles.rowLeft}>
                    <MaterialCommunityIcons name="lock-reset" size={20} color="#6f7aa6" />
                    <Text style={styles.rowText}>Change PIN</Text>
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={20} color="#b0b0c0" />
                </Pressable>
              </Animated.View>

              {biometricSupported && (
                <Animated.View entering={FadeInDown.delay(60)} style={styles.section}>
                  <Text style={styles.sectionTitle}>Biometric</Text>
                  <View style={styles.row}>
                    <View style={styles.rowLeft}>
                      <MaterialCommunityIcons name="face-recognition" size={20} color="#6f7aa6" />
                      <Text style={styles.rowText}>Use Face ID to unlock</Text>
                    </View>
                    <Switch
                      value={useBiometric}
                      onValueChange={handleBiometricToggle}
                      trackColor={{ false: '#ccc', true: '#C695B9' }}
                      thumbColor="#fff"
                    />
                  </View>
                </Animated.View>
              )}

              <Animated.View entering={FadeInDown.delay(80)} style={styles.section}>
                <Text style={styles.sectionTitle}>Actions</Text>
                <Pressable style={styles.row} onPress={handleLockNow}>
                  <View style={styles.rowLeft}>
                    <MaterialCommunityIcons name="lock-outline" size={20} color="#6f7aa6" />
                    <Text style={styles.rowText}>Lock app now</Text>
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={20} color="#b0b0c0" />
                </Pressable>
                <Pressable style={[styles.row, styles.rowDanger]} onPress={handleRemovePin}>
                  <View style={styles.rowLeft}>
                    <MaterialCommunityIcons name="lock-open-remove-outline" size={20} color="#8b1e3f" />
                    <Text style={styles.rowTextDanger}>Remove PIN</Text>
                  </View>
                </Pressable>
              </Animated.View>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screenWrap: { flex: 1, overflow: 'hidden' },
  backgroundLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  background: { flex: 1, backgroundColor: '#f6b9fa', width: '100%', height: '100%' },
  backgroundImage: { opacity: 0.8, position: 'absolute', bottom: 0, right: '5%', width: '105%', height: '110%', alignSelf: 'center' },
  container: { flex: 1, backgroundColor: 'transparent', paddingHorizontal: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  backButton: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.7)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)',
    alignItems: 'center', justifyContent: 'center',
  },
  title: { fontFamily: 'Merriweather', fontSize: 24, fontWeight: '600', color: '#2f2f3a' },
  headerSpacer: { width: 40 },
  content: { paddingBottom: 32 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 13, color: '#7a7a8a', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  row: {
    ...GlassCardBase,
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
    borderColor: 'rgba(255, 255, 255, 0.5)',
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowText: { fontFamily: 'Merriweather', fontSize: 16, color: '#2f2f3a' },
  rowDanger: { borderColor: 'rgba(234, 118, 118, 0.5)' },
  rowTextDanger: { fontFamily: 'Merriweather', fontSize: 16, color: '#8b1e3f' },
  hint: { fontSize: 13, color: '#6a6a7a', marginTop: 8, lineHeight: 20 },
  label: { fontSize: 16, color: '#555', marginBottom: 8 },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 24,
    letterSpacing: 8,
    textAlign: 'center',
    color: '#222',
    marginBottom: 24,
  },
  primaryBtn: {
    ...GlassCardBase,
    backgroundColor: 'rgba(108, 148, 214, 0.66)',
    borderColor: 'rgba(108, 148, 214, 0.95)',
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryBtnDisabled: { opacity: 0.6 },
  primaryBtnText: { fontFamily: 'Merriweather', fontSize: 16, fontWeight: '600', color: '#fff' },
});
