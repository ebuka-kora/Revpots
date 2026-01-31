import { ImageBackground, Pressable, StyleSheet, Text, View } from 'react-native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { GlassCardBase } from '../../constants/theme';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const router = useRouter();

  return (
    <ImageBackground
      source={require('../../assets/images/omyre1.png')}
      style={styles.background}
      imageStyle={styles.backgroundImage}
      resizeMode="contain"
    >
    <SafeAreaView style={[styles.container, { paddingTop: insets.top + 50, paddingBottom: 16 + tabBarHeight }]}>
      <Text style={styles.title}>Settings</Text>

      {/* Cloud Sync section */}
      <Animated.View entering={FadeInDown.delay(40)} style={styles.section}>
        <Text style={styles.sectionTitle}>Cloud Sync</Text>
        <Pressable
          accessibilityRole="button"
          style={styles.row}
          onPress={() => router.push('/settings/sync')}
        >
          <View style={styles.rowLeft}>
            <MaterialCommunityIcons name="cloud-sync" size={20} color="#6f7aa6" />
            <Text style={styles.rowText}>Sync with Server</Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={20} color="#b0b0c0" />
        </Pressable>
      </Animated.View>

      {/* More section */}
      <Animated.View entering={FadeInDown.delay(60)} style={styles.section}>
        <Text style={styles.sectionTitle}>More</Text>
        <Pressable style={[styles.row, styles.rowDisabled]}>
          <View style={styles.rowLeft}>
            <MaterialCommunityIcons name="lock-outline" size={20} color="#9a9aa8" />
            <Text style={styles.rowText}>App Lock</Text>
          </View>
          <Text style={styles.rowHint}>Coming soon</Text>
        </Pressable>

        <Pressable style={styles.row}>
          <View style={styles.rowLeft}>
            <MaterialCommunityIcons name="information-outline" size={20} color="#9a9aa8" />
            <Text style={styles.rowText}>About</Text>
          </View>
          <Text style={styles.rowHint}>Offline Sales Book</Text>
        </Pressable>
      </Animated.View>
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
    // left: '5%',
    right: '5%',
    width: '105%',
    height: '110%',
    alignSelf: 'center',
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
    padding: 16,
  },
  title: {
    fontFamily: 'Merriweather',
    fontSize: 20,
    fontWeight: '600',
    color: '#2f2f3a',
    marginBottom: 12,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 13,
    color: '#7a7a8a',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
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
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rowText: {
    fontFamily: 'Merriweather',
    fontSize: 16,
    color: '#2f2f3a',
  },
  rowHint: {
    fontSize: 12,
    color: '#9a9aa8',
  },
  rowDisabled: {
    opacity: 0.6,
  },
});
