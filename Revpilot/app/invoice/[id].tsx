import { useCallback, useMemo, useState } from 'react';
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
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { openDatabase, querySql } from '../../db/database';
import { generateReceipt } from '../../utils/receipt';
import { formatCurrency } from '../../utils/format';

type Invoice = {
  id: number;
  totalAmount: number;
  createdAt: string;
};

type InvoiceItem = {
  id: number;
  productId: number;
  quantity: number;
  price: number;
  productName: string;
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

export default function InvoiceDetailsScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const invoiceId = Number(id);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadInvoice = useCallback(async () => {
    if (!invoiceId || Number.isNaN(invoiceId)) {
      return;
    }
    const invoiceRows = (await querySql(
      'SELECT id, totalAmount, createdAt FROM invoices WHERE id = ? LIMIT 1',
      [invoiceId]
    )) as Invoice[];
    const itemRows = (await querySql(
      `SELECT invoice_items.id,
              invoice_items.productId,
              invoice_items.quantity,
              invoice_items.price,
              products.name as productName
       FROM invoice_items
       JOIN products ON products.id = invoice_items.productId
       WHERE invoice_items.invoiceId = ?
       ORDER BY invoice_items.id ASC`,
      [invoiceId]
    )) as InvoiceItem[];
    setInvoice(invoiceRows[0] ?? null);
    setItems(itemRows);
  }, [invoiceId]);

  useFocusEffect(
    useCallback(() => {
      loadInvoice();
    }, [loadInvoice])
  );

  const totalAmount = useMemo(() => {
    if (invoice) {
      return invoice.totalAmount;
    }
    return items.reduce((sum, item) => sum + item.quantity * item.price, 0);
  }, [invoice, items]);

  const handleGenerateReceipt = async () => {
    if (!invoice) {
      return;
    }
    setIsGenerating(true);
    try {
      await generateReceipt(
        {
          id: invoice.id,
          createdAt: invoice.createdAt,
          totalAmount,
        },
        items.map((item) => ({
          productName: item.productName,
          quantity: item.quantity,
          price: item.price,
        }))
      );
    } catch (err) {
      // Keep message friendly if sharing fails or is unavailable.
      console.warn('Failed to generate receipt', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const confirmDeleteInvoice = () => {
    if (!invoice) {
      return;
    }
    Alert.alert(
      'Delete invoice?',
      'This will remove the invoice and its items.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteInvoice(),
        },
      ]
    );
  };

  const deleteInvoice = async () => {
    if (!invoice) {
      return;
    }
    setIsDeleting(true);
    try {
      const db = await openDatabase();
      await db.withTransactionAsync(async () => {
        await db.runAsync('DELETE FROM invoice_items WHERE invoiceId = ?', [
          invoice.id,
        ]);
        await db.runAsync('DELETE FROM invoices WHERE id = ?', [invoice.id]);
      });
      Alert.alert('Deleted', 'Invoice removed.');
      router.push('/sales' as any);
    } catch {
      Alert.alert('Couldn’t delete', 'Please try again.');
    } finally {
      setIsDeleting(false);
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
        <Text style={styles.title}>Invoice Details</Text>
        <View style={styles.headerSpacer} />
      </View>
      <ScrollView contentContainerStyle={styles.content}>

      {invoice ? (
        <View style={styles.headerCard}>
          <Text style={styles.invoiceNumber}>Invoice #{invoice.id}</Text>
          <Text style={styles.invoiceDate}>
            Date: {formatDate(invoice.createdAt)}
          </Text>
        </View>
      ) : (
        <Text style={styles.emptyText}>We couldn’t find that invoice.</Text>
      )}

      <Text style={styles.sectionTitle}>Items Purchased</Text>
      {items.length === 0 ? (
        <Text style={styles.emptyText}>No items on this invoice.</Text>
      ) : (
        <View style={styles.itemsContainer}>
          {items.map((item, index) => {
            const subtotal = item.quantity * item.price;
            return (
              <View key={item.id} style={styles.itemCard}>
                <View style={styles.itemHeader}>
                  <Text style={styles.itemNumber}>{index + 1}.</Text>
                  <Text style={styles.itemName}>{item.productName}</Text>
                </View>
                <View style={styles.itemDetailsRow}>
                  <View style={styles.itemDetailColumn}>
                    <Text style={styles.itemDetailLabel}>Quantity</Text>
                    <Text style={styles.itemDetailValue}>{item.quantity}</Text>
                  </View>
                  <View style={styles.itemDetailColumn}>
                    <Text style={styles.itemDetailLabel}>Unit Price</Text>
                    <Text style={styles.itemDetailValue}>{formatCurrency(item.price)}</Text>
                  </View>
                  <View style={styles.itemDetailColumn}>
                    <Text style={styles.itemDetailLabel}>Subtotal</Text>
                    <Text style={styles.itemSubtotal}>{formatCurrency(subtotal)}</Text>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      )}
      </ScrollView>
      <View style={[styles.fixedFooterContainer, { paddingBottom: insets.bottom }]}>
        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>Total Amount</Text>
          <Text style={styles.totalValue}>{formatCurrency(totalAmount)}</Text>
        </View>

        <Pressable
          accessibilityRole="button"
          style={[styles.button, isGenerating && styles.buttonDisabled]}
          onPress={handleGenerateReceipt}
          disabled={isGenerating}
        >
          {isGenerating ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color="#fff" />
              <Text style={styles.buttonText}>Generating...</Text>
            </View>
          ) : (
            <Text style={styles.buttonText}>Generate Receipt</Text>
          )}
        </Pressable>

        <Pressable
          accessibilityRole="button"
          style={[styles.deleteButton, isDeleting && styles.buttonDisabled]}
          onPress={confirmDeleteInvoice}
          disabled={isDeleting}
        >
          <Text style={styles.deleteButtonText}>
            {isDeleting ? 'Deleting...' : 'Delete Invoice'}
          </Text>
        </Pressable>
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
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 200, // Increased padding to accommodate fixed footer
    paddingTop: 8, // Adjusted padding to account for fixed header and new header margin
  },
  title: {
    fontFamily: 'Merriweather',
    fontSize: 24,
    fontWeight: '600',
    color: '#222',
    textAlign: 'center',
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 16, // Increased margin bottom
  },
  headerSpacer: {
    width: 60,
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
  headerCard: {
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  invoiceNumber: {
    fontFamily: 'Merriweather',
    fontSize: 20, // Increased font size
    fontWeight: '600',
    color: '#222',
  },
  invoiceDate: {
    fontSize: 16, // Increased font size
    color: '#555',
    marginTop: 8, // Increased margin top
  },
  sectionTitle: {
    fontFamily: 'Merriweather',
    fontSize: 18, // Increased font size
    fontWeight: '600',
    color: '#222',
    marginBottom: 12, // Increased margin bottom
  },
  itemsContainer: {
    marginBottom: 16,
  },
  itemCard: {
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  itemNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6c94d6',
    marginRight: 8,
    minWidth: 24,
  },
  itemName: {
    fontFamily: 'Merriweather',
    fontSize: 18, // Increased font size
    fontWeight: '600',
    color: '#222',
    flex: 1,
  },
  itemDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  itemDetailColumn: {
    flex: 1,
  },
  itemDetailLabel: {
    fontSize: 13, // Slightly increased font size
    color: '#666',
    marginBottom: 6, // Increased margin bottom
  },
  itemDetailValue: {
    fontSize: 16, // Increased font size
    color: '#222',
    fontWeight: '500',
  },
  itemSubtotal: {
    fontSize: 17, // Increased font size
    fontWeight: '600',
    color: '#222',
  },
  totalCard: {
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  totalLabel: {
    fontSize: 16, // Increased font size
    color: '#555',
    marginBottom: 8, // Increased margin bottom
  },
  totalValue: {
    fontFamily: 'Merriweather',
    fontSize: 26, // Significantly increased font size
    fontWeight: '700',
    color: '#222',
  },
  button: {
    backgroundColor: '#111',
    paddingVertical: 16, // Increased padding
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  deleteButton: {
    backgroundColor: '#fdecee',
    paddingVertical: 16, // Increased padding
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    fontFamily: 'Merriweather',
    color: '#fff',
    fontSize: 18, // Increased font size
    fontWeight: '600',
  },
  deleteButtonText: {
    fontFamily: 'Merriweather',
    color: '#8b1e3f',
    fontSize: 18, // Increased font size
    fontWeight: '600',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    marginBottom: 12,
  },
  fixedFooterContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255,255,255,0.78)',
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.4)',
  },
});
