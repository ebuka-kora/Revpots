import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ImageBackground,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';

import { GlassCardBase } from '../../constants/theme';
import { getMonthlyReport } from '../../db/reports';
import { formatCurrency } from '../../utils/format';

type ReportData = {
  totalSales: number;
  totalProfit: number;
  totalInvoices: number;
};

const months = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const TAB_BAR_HEIGHT = 56;

export default function MonthlyReportScreen() {
  const insets = useSafeAreaInsets();
  const today = useMemo(() => new Date(), []);
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [year, setYear] = useState(today.getFullYear());
  const [report, setReport] = useState<ReportData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const monthLabel = months[month - 1] ?? `Month ${month}`;

  const loadReport = useCallback(
    async (selectedMonth: number, selectedYear: number) => {
      setIsLoading(true);
      try {
        const data = await getMonthlyReport(selectedMonth, selectedYear);
        setReport(data);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    loadReport(month, year);
  }, [month, year, loadReport]);

  useFocusEffect(
    useCallback(() => {
      loadReport(month, year);
    }, [loadReport, month, year])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadReport(month, year);
    setRefreshing(false);
  }, [loadReport, month, year]);

  const handlePrevMonth = () => {
    setReport(null);
    if (month === 1) {
      setMonth(12);
      setYear((prev) => prev - 1);
    } else {
      setMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    setReport(null);
    if (month === 12) {
      setMonth(1);
      setYear((prev) => prev + 1);
    } else {
      setMonth((prev) => prev + 1);
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
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 24 + TAB_BAR_HEIGHT + insets.bottom }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <Text style={styles.title}>Monthly Report</Text>

        <Animated.View entering={FadeInDown.delay(40)} style={styles.selectorCard}>
          <Pressable style={styles.selectorButton} onPress={handlePrevMonth}>
            <Text style={styles.selectorButtonText}>‹</Text>
          </Pressable>
          <View style={styles.selectorCenter}>
            <Text style={styles.selectorLabel}>{monthLabel}</Text>
            <Text style={styles.selectorYear}>{year}</Text>
          </View>
          <Pressable style={styles.selectorButton} onPress={handleNextMonth}>
            <Text style={styles.selectorButtonText}>›</Text>
          </Pressable>
        </Animated.View>

        {isLoading || !report ? (
          <Animated.Text entering={FadeIn} style={styles.loadingText}>
            Loading report...
          </Animated.Text>
        ) : report.totalInvoices === 0 ? (
          <Animated.Text entering={FadeIn} style={styles.emptyText}>
            No sales recorded for {monthLabel} {year}.
          </Animated.Text>
        ) : (
          <View style={styles.cards}>
            <Animated.View entering={FadeInDown.delay(80)} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Total Sales</Text>
                <View style={[styles.iconBadge, styles.iconBadgePeach]}>
                  <MaterialCommunityIcons name="cash" size={18} color="#c45a59" />
                </View>
              </View>
              <Text style={styles.cardValue}>{formatCurrency(report.totalSales)}</Text>
            </Animated.View>
            <Animated.View entering={FadeInDown.delay(120)} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Total Profit</Text>
                <View style={[styles.iconBadge, styles.iconBadgeBlue]}>
                  <MaterialCommunityIcons name="trending-up" size={18} color="#5476b4" />
                </View>
              </View>
              <Text style={styles.cardValue}>{formatCurrency(report.totalProfit)}</Text>
            </Animated.View>
            <Animated.View entering={FadeInDown.delay(160)} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Total Invoices</Text>
                <View style={[styles.iconBadge, styles.iconBadgePink]}>
                  <MaterialCommunityIcons name="receipt" size={18} color="#d16a9d" />
                </View>
              </View>
              <Text style={styles.cardValue}>{report.totalInvoices}</Text>
            </Animated.View>
          </View>
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
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  title: {
    fontFamily: 'Merriweather',
    fontSize: 24,
    fontWeight: '600',
    color: '#2f2f3a',
    marginBottom: 16,
  },
  selectorCard: {
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  selectorButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f5f2f4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectorButtonText: {
    fontSize: 18,
    color: '#7a6f7a',
    fontWeight: '600',
  },
  selectorCenter: {
    alignItems: 'center',
  },
  selectorLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2f2f3a',
    textAlign: 'center',
  },
  selectorYear: {
    fontSize: 14,
    color: '#7a7a8a',
    textAlign: 'center',
  },
  cards: {
    gap: 12,
  },
  card: {
    ...GlassCardBase,
    padding: 16,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  cardTitle: {
    fontFamily: 'Merriweather',
    fontSize: 14,
    color: '#555',
  },
  cardValue: {
    fontSize: 22,
    fontWeight: '600',
    color: '#222',
  },
  iconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f0f0',
  },
  iconBadgePeach: {
    backgroundColor: 'rgba(252,232,217,0.9)',
  },
  iconBadgeBlue: {
    backgroundColor: 'rgba(224,234,247,0.9)',
  },
  iconBadgePink: {
    backgroundColor: 'rgba(247,224,237,0.9)',
  },
  loadingText: {
    textAlign: 'center',
    color: '#666',
    marginTop: 24,
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    marginTop: 24,
  },
});
