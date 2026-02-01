import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ImageBackground,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { GlassCardBase } from '../../constants/theme';
import {
  checkServerConnection,
  fullSync,
  pullFromServer,
  pushToServer,
} from '../../utils/sync';

export default function SyncScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [connectionOk, setConnectionOk] = useState<boolean | null>(null);

  const handleCheckConnection = async () => {
    setStatus(null);
    setConnectionOk(null);
    try {
      const ok = await checkServerConnection();
      setConnectionOk(ok);
      setStatus(ok ? 'Server is reachable.' : 'Could not reach server.');
    } catch (e) {
      setConnectionOk(false);
      setStatus(
        e instanceof Error ? e.message : 'Failed to check connection.'
      );
    }
  };

  const handlePull = async () => {
    setSyncing(true);
    setStatus('Pulling from server...');
    setConnectionOk(null);
    try {
      const result = await pullFromServer();
      const count =
        (result.products?.length ?? 0) + (result.invoices?.length ?? 0);
      setStatus(`Pulled ${count} records from server.`);
    } catch (e) {
      setStatus(
        e instanceof Error ? e.message : 'Pull failed.'
      );
      Alert.alert('Sync error', e instanceof Error ? e.message : 'Pull failed.');
    } finally {
      setSyncing(false);
    }
  };

  const handlePush = async () => {
    setSyncing(true);
    setStatus('Pushing to server...');
    setConnectionOk(null);
    try {
      await pushToServer();
      setStatus('Data pushed to server.');
    } catch (e) {
      setStatus(
        e instanceof Error ? e.message : 'Push failed.'
      );
      Alert.alert('Sync error', e instanceof Error ? e.message : 'Push failed.');
    } finally {
      setSyncing(false);
    }
  };

  const handleFullSync = async () => {
    setSyncing(true);
    setStatus('Syncing...');
    setConnectionOk(null);
    try {
      const result = await fullSync();
      setStatus(
        `Sync complete. Pulled ${(result.pulled ?? 0)} record(s).`
      );
    } catch (e) {
      setStatus(
        e instanceof Error ? e.message : 'Sync failed.'
      );
      Alert.alert('Sync error', e instanceof Error ? e.message : 'Sync failed.');
    } finally {
      setSyncing(false);
    }
  };

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
          <Text style={styles.title}>Sync with Server</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {status !== null && (
            <Animated.View entering={FadeInDown} style={styles.statusCard}>
              <Text style={styles.statusText}>{status}</Text>
              {connectionOk === true && (
                <MaterialCommunityIcons name="check-circle" size={20} color="#4a7c59" />
              )}
              {connectionOk === false && (
                <MaterialCommunityIcons name="alert-circle" size={20} color="#b5535a" />
              )}
            </Animated.View>
          )}

          {/* Sync actions: check connection, pull, push, full sync */}
          <Animated.View entering={FadeInDown.delay(40)} style={styles.section}>
            <Text style={styles.sectionTitle}>Actions</Text>

            <Pressable
              accessibilityRole="button"
              onPress={handleCheckConnection}
              disabled={syncing}
              style={styles.row}
            >
              <View style={styles.rowLeft}>
                <MaterialCommunityIcons name="lan-connect" size={20} color="#6f7aa6" />
                <Text style={styles.rowText}>Check connection</Text>
              </View>
              {syncing ? (
                <ActivityIndicator size="small" color="#6f7aa6" />
              ) : (
                <MaterialCommunityIcons name="chevron-right" size={20} color="#b0b0c0" />
              )}
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={handlePull}
              disabled={syncing}
              style={styles.row}
            >
              <View style={styles.rowLeft}>
                <MaterialCommunityIcons name="cloud-download-outline" size={20} color="#6f7aa6" />
                <Text style={styles.rowText}>Pull from server</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={20} color="#b0b0c0" />
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={handlePush}
              disabled={syncing}
              style={styles.row}
            >
              <View style={styles.rowLeft}>
                <MaterialCommunityIcons name="cloud-upload-outline" size={20} color="#6f7aa6" />
                <Text style={styles.rowText}>Push to server</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={20} color="#b0b0c0" />
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={handleFullSync}
              disabled={syncing}
              style={[styles.row, styles.primaryRow]}
            >
              <View style={styles.rowLeft}>
                <MaterialCommunityIcons name="cloud-sync" size={20} color="#fff" />
                <Text style={styles.primaryRowText}>Full sync (pull + push)</Text>
              </View>
              {syncing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <MaterialCommunityIcons name="chevron-right" size={20} color="rgba(255,255,255,0.8)" />
              )}
            </Pressable>
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
    marginBottom: 20,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  title: {
    flex: 1,
    fontFamily: 'Merriweather',
    fontSize: 20,
    fontWeight: '600',
    color: '#2f2f3a',
    textAlign: 'center',
  },
  headerSpacer: {
    width: 38,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  statusCard: {
    ...GlassCardBase,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    marginBottom: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderColor: 'rgba(255, 255, 255, 0.6)',
  },
  statusText: {
    fontFamily: 'Merriweather',
    fontSize: 14,
    color: '#2f2f3a',
    flex: 1,
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
  primaryRow: {
    backgroundColor: 'rgba(108, 148, 214, 0.66)',
    borderColor: 'rgba(108, 148, 214, 0.95)',
    marginTop: 4,
  },
  primaryRowText: {
    fontFamily: 'Merriweather',
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
