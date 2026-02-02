import { useCallback, useMemo, useState } from 'react';
import {
  ImageBackground,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Link, useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSafeBottomTabBarHeight } from '@/hooks/use-safe-bottom-tab-bar-height';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { GlassCardBase } from '../../constants/theme';
import { querySql } from '@/db/database';
import { formatCurrency } from '../../utils/format';

type Invoice = {
  id: number;
  totalAmount: number;
  createdAt: string;
};

type MonthlyGroup = {
  month: number;
  year: number;
  monthLabel: string;
  totalSales: number;
  invoiceCount: number;
};

const months = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function SalesScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useSafeBottomTabBarHeight();
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadInvoices = useCallback(async () => {
    const rows = (await querySql(
      'SELECT id, totalAmount, createdAt FROM invoices ORDER BY createdAt DESC'
    )) as Invoice[];
    setInvoices(rows);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadInvoices();
    }, [loadInvoices])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadInvoices();
    setRefreshing(false);
  }, [loadInvoices]);

  const monthlyGroups = useMemo(() => {
    const groups = new Map<string, MonthlyGroup>();

    invoices.forEach((invoice) => {
      const date = new Date(invoice.createdAt);
      const month = date.getMonth() + 1;
      const year = date.getFullYear();
      const key = `${year}-${month}`;

      if (!groups.has(key)) {
        groups.set(key, {
          month,
          year,
          monthLabel: months[month - 1] ?? `Month ${month}`,
          totalSales: 0,
          invoiceCount: 0,
        });
      }

      const group = groups.get(key)!;
      group.totalSales += invoice.totalAmount;
      group.invoiceCount += 1;
    });

    return Array.from(groups.values()).sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.month - a.month;
    });
  }, [invoices]);

  const handleMonthClick = (month: number, year: number) => {
    router.push(`/sales/monthly?month=${month}&year=${year}` as any);
  };

  return (
    <ImageBackground
      source={require('../../assets/images/omyre1.png')}
      style={styles.background}
      imageStyle={styles.backgroundImage}
      resizeMode="contain"
    >
    <SafeAreaView style={[styles.container, { paddingTop: insets.top + 50 }]}>
      <Text style={styles.title}>Sales</Text>

      <ScrollView
        contentContainerStyle={[styles.listContent, { paddingBottom: 80 + tabBarHeight }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        style={styles.scrollView}
      >
        {monthlyGroups.length === 0 ? (
          <Animated.Text entering={FadeIn} style={styles.emptyText}>
            No sales yet. Tap New Sale to get started.
          </Animated.Text>
        ) : (
          monthlyGroups.map((group, index) => (
            <Pressable
              key={`${group.year}-${group.month}`}
              onPress={() => handleMonthClick(group.month, group.year)}
            >
              <Animated.View entering={FadeInDown.delay(index * 40)} style={styles.monthCard}>
                <View style={styles.monthCardHeader}>
                  <View>
                    <Text style={styles.monthLabel}>{group.monthLabel}</Text>
                    <Text style={styles.monthYear}>{group.year}</Text>
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={20} color="#6b6b7b" />
                </View>
                <View style={styles.monthCardStats}>
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Total Sales</Text>
                    <Text style={styles.statValue}>{formatCurrency(group.totalSales)}</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Invoices</Text>
                    <Text style={styles.statValue}>{group.invoiceCount}</Text>
                  </View>
                </View>
              </Animated.View>
            </Pressable>
          ))
        )}
      </ScrollView>

      <View style={[styles.fixedButtonContainer, { paddingBottom: insets.bottom, bottom: tabBarHeight - 50 }]}>
        <Link href="/new-sale" asChild>
          <Pressable accessibilityRole="button" style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>New Sale</Text>
          </Pressable>
        </Link>
      </View>
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
    fontSize: 30,
    fontWeight: '900',
    color: '#2f2f3a',
    marginBottom: 16,
  },
  primaryButton: {
    ...GlassCardBase,
    backgroundColor: 'rgba(214, 108, 120, 0.66)',
    borderColor: 'rgba(214, 108, 120, 0.95)',
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontFamily: 'Merriweather',
    color: '#fff',
    fontSize: 20,
    fontWeight: '900',
  },
  listContent: {
    paddingBottom: 80, // Space for the fixed button
  },
  scrollView: {
    flex: 1,
  },
  monthCard: {
    ...GlassCardBase,
    ...GlassCardBase,
    backgroundColor: 'rgba(108, 148, 214, 0.29)',
    borderColor: 'rgba(108, 148, 214, 0.95)',
    padding: 16,
    marginBottom: 12,
  },
  monthCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  monthLabel: {
    fontFamily: 'Merriweather',
    fontSize: 22,
    fontWeight: '900',
    color: '#2f2f3a',
  },
  monthYear: {
    fontSize: 14,
    color: '#6b6b7b',
    marginTop: 2,
  },
  monthCardStats: {
    flexDirection: 'row',
    gap: 16,
  },
  statItem: {
    flex: 1,
  },
  statLabel: {
    fontSize: 13,
    color: '#6b6b7b',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '900',
    color: '#2f2f3a',
  },
  fixedButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    // backgroundColor: 'rgba(255,255,255,0.78)',
    paddingHorizontal: 16,
    // paddingTop: 12,
    // borderTopWidth: 1,
    // borderTopColor: 'rgba(255,255,255,0.4)',
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    marginTop: 24,
  },
});
