import { useCallback, useState } from 'react';
import {
  ImageBackground,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
} from 'react-native';
import { Link, useFocusEffect } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';

import { GlassCardBase } from '../constants/theme';
import { querySql } from '@/db/database';
import { formatCurrency } from '../utils/format';

type Invoice = {
  id: number;
  totalAmount: number;
  createdAt: string;
};

const formatDate = (isoDate: string) => {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return isoDate;
  }
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export default function InvoicesScreen() {
  const insets = useSafeAreaInsets();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadInvoices = useCallback(async () => {
    const rows = (await querySql(
      'SELECT id, totalAmount, createdAt FROM invoices ORDER BY createdAt DESC'
    )) as Invoice[];
    setInvoices(rows);
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadInvoices();
    setRefreshing(false);
  }, [loadInvoices]);

  useFocusEffect(
    useCallback(() => {
      loadInvoices();
    }, [loadInvoices])
  );

  return (
    <ImageBackground
      source={require('../assets/images/omyre1.png')}
      style={styles.background}
      imageStyle={styles.backgroundImage}
      resizeMode="contain"
    >
    <SafeAreaView style={[styles.container, { paddingTop: insets.top + 50 }]}>
      <Text style={styles.title}>Invoices</Text>

      <ScrollView
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {invoices.length === 0 ? (
          <Animated.Text entering={FadeIn} style={styles.emptyText}>
            No invoices yet. Your sales will show here.
          </Animated.Text>
        ) : (
          invoices.map((item, index) => (
            <Link key={item.id} href={`/invoice/${item.id}` as any} asChild>
              <Animated.View entering={FadeInDown.delay(index * 40)} style={styles.card}>
                <Pressable>
                  <Text style={styles.invoiceTitle}>Invoice #{item.id}</Text>
                  <Text style={styles.invoiceDetail}>
                    Date: {formatDate(item.createdAt)}
                  </Text>
                  <Text style={styles.invoiceTotal}>
                    Total: {formatCurrency(item.totalAmount)}
                  </Text>
                </Pressable>
              </Animated.View>
            </Link>
          ))
        )}
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
    // left: '5%',
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
  title: {
    fontFamily: 'Merriweather',
    fontSize: 22,
    fontWeight: '600',
    color: '#222',
    marginBottom: 12,
  },
  listContent: {
    paddingBottom: 16,
  },
  card: {
    ...GlassCardBase,
    padding: 16,
    marginBottom: 12,
  },
  invoiceTitle: {
    fontFamily: 'Merriweather',
    fontSize: 16,
    fontWeight: '600',
    color: '#222',
    marginBottom: 6,
  },
  invoiceDetail: {
    fontSize: 14,
    color: '#555',
    marginBottom: 4,
  },
  invoiceTotal: {
    fontFamily: 'Merriweather',
    fontSize: 15,
    color: '#222',
    fontWeight: '600',
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    marginTop: 32,
  },
});
