import { ImageBackground, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { GlassCardBase } from '../../constants/theme';

const APP_NAME = 'Revpilot';
const APP_DESCRIPTION = 'Smart sales book for tracking products, sales, and invoices.';

export default function AboutScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const version = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <ImageBackground
      source={require('../../assets/images/omyre1.png')}
      style={styles.background}
      imageStyle={styles.backgroundImage}
      resizeMode="contain"
    >
      <SafeAreaView style={[styles.container, { paddingTop: insets.top + 50 }]}>
        <View style={styles.headerRow}>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <MaterialCommunityIcons name="chevron-left" size={22} color="#2f2f3a" />
          </Pressable>
          <Text style={styles.title}>About</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <Animated.View entering={FadeInDown.delay(40)} style={styles.card}>
            <View style={styles.iconWrap}>
              <MaterialCommunityIcons name="information-outline" size={48} color="#AF80A1" />
            </View>
            <Text style={styles.appName}>{APP_NAME}</Text>
            <Text style={styles.version}>Version {version}</Text>
            <Text style={styles.description}>{APP_DESCRIPTION}</Text>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: '#f6b9fa',
    width: '100%',
    height: '100%',
  },
  backgroundImage: {
    opacity: 0.8,
    position: 'absolute',
    bottom: 0,
    right: '5%',
    width: '105%',
    height: '110%',
    alignSelf: 'center',
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
    paddingHorizontal: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: 'Merriweather',
    fontSize: 24,
    fontWeight: '600',
    color: '#2f2f3a',
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    paddingBottom: 32,
  },
  card: {
    ...GlassCardBase,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderColor: 'rgba(198, 149, 185, 0.4)',
    padding: 24,
    alignItems: 'center',
  },
  iconWrap: {
    marginBottom: 16,
  },
  appName: {
    fontFamily: 'Merriweather',
    fontSize: 26,
    fontWeight: '700',
    color: '#2f2f3a',
    marginBottom: 4,
  },
  version: {
    fontSize: 14,
    color: '#6a6a7a',
    marginBottom: 16,
  },
  description: {
    fontSize: 15,
    color: '#5a5a6a',
    textAlign: 'center',
    lineHeight: 22,
  },
});
