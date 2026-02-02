import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ImageBackground,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ReceiptModal } from '@/components/receipt-modal';
import { openDatabase, querySql } from '@/db/database';
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
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDeletedModal, setShowDeletedModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadInvoice = useCallback(async () => {
    if (!invoiceId || Number.isNaN(invoiceId)) {
      return;
    }
    try {
      const invoiceRows = (await querySql(
        'SELECT id, totalAmount, createdAt FROM invoices WHERE id = ? LIMIT 1',
        [invoiceId]
      )) as Invoice[];
      const inv = invoiceRows[0] ?? null;
      setInvoice(inv);

      if (!inv) {
        setItems([]);
        return;
      }

      const idToUse = inv.id != null ? Number(inv.id) : invoiceId;

      const itemRows = (await querySql(
        'SELECT id, productId, quantity, price FROM invoice_items WHERE invoiceId = ? ORDER BY id ASC',
        [idToUse]
      )) as Record<string, unknown>[];

      const rawItems = Array.isArray(itemRows) ? itemRows : [];
      if (rawItems.length === 0) {
        setItems([]);
        return;
      }

      const productIds = [...new Set(rawItems.map((r) => Number(r.productId ?? r.productid ?? 0)).filter(Boolean))];
      const nameByProductId: Record<number, string> = {};
      if (productIds.length > 0) {
        const placeholders = productIds.map(() => '?').join(',');
        const nameRows = (await querySql(
          `SELECT id, name FROM products WHERE id IN (${placeholders})`,
          productIds
        )) as Record<string, unknown>[];
        for (const r of nameRows || []) {
          const pid = Number(r.id ?? r.ID ?? 0);
          const n = r.name ?? r.Name ?? '';
          if (pid) nameByProductId[pid] = String(n);
        }
      }

      setItems(
        rawItems.map((row) => {
          const productId = Number(row.productId ?? row.productid ?? 0);
          return {
            id: Number(row.id ?? row.ID ?? 0),
            productId,
            quantity: Number(row.quantity ?? 0),
            price: Number(row.price ?? 0),
            productName: nameByProductId[productId] ?? '',
          };
        })
      );
    } catch (e) {
      console.warn('Failed to load invoice or items', e);
      setItems([]);
    }
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

  const openReceipt = () => {
    if (!invoice) return;
    setShowReceiptModal(true);
  };

  const confirmDeleteInvoice = () => {
    if (!invoice) return;
    setShowDeleteModal(true);
  };

  const deleteInvoice = async () => {
    if (!invoice) return;
    setShowDeleteModal(false);
    setIsDeleting(true);
    try {
      const db = await openDatabase();

      const rawRows = (await db.getAllAsync(
        'SELECT productId, quantity FROM invoice_items WHERE invoiceId = ?',
        [invoice.id]
      )) as Record<string, unknown>[];

      const itemRows = rawRows.map((r) => ({
        productId: Number(r.productId ?? r.productid ?? 0),
        quantity: Number(r.quantity ?? 0),
      }));

      await db.withTransactionAsync(async () => {
        await db.runAsync('DELETE FROM invoice_items WHERE invoiceId = ?', [
          invoice.id,
        ]);
        for (const item of itemRows) {
          if (item.productId && item.quantity) {
            await db.runAsync(
              'UPDATE products SET quantity = quantity + ? WHERE id = ?',
              [item.quantity, item.productId]
            );
          }
        }
        await db.runAsync('DELETE FROM invoices WHERE id = ?', [invoice.id]);
      });
      setShowDeletedModal(true);
    } catch (e) {
      console.warn('Delete invoice failed:', e);
      Alert.alert('Couldn’t delete', 'Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
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
          style={styles.button}
          onPress={openReceipt}
        >
          <Text style={styles.buttonText}>Generate Receipt</Text>
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
    {invoice && (
      <ReceiptModal
        visible={showReceiptModal}
        onClose={() => setShowReceiptModal(false)}
        invoice={{
          id: invoice.id,
          createdAt: invoice.createdAt,
          totalAmount,
        }}
        items={items.map((i) => ({
          productName: i.productName,
          quantity: i.quantity,
          price: i.price,
        }))}
      />
    )}

    <Modal
      visible={showDeleteModal}
      transparent
      animationType="fade"
      onRequestClose={() => setShowDeleteModal(false)}
    >
      <Pressable style={styles.deleteModalOverlay} onPress={() => setShowDeleteModal(false)}>
        <Animated.View entering={FadeInDown.duration(400)} style={styles.deleteModalWrapper}>
          <LinearGradient
            colors={['#FFCBDA', '#C695B9', '#AF80A1']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.deleteModalGradient}
          >
            <Pressable style={styles.deleteModalCard} onPress={(e) => e.stopPropagation()}>
              <View style={styles.deleteModalIconWrap}>
                <View style={styles.deleteModalIconBg}>
                  <MaterialCommunityIcons name="delete-outline" size={48} color="#AF80A1" />
                </View>
              </View>
              <Text style={styles.deleteModalTitle}>Delete invoice?</Text>
              <Text style={styles.deleteModalSubtitle}>
                This will remove the invoice and its items. Product quantities will be restored.
              </Text>
              <View style={styles.deleteModalButtons}>
                <Pressable
                  onPress={() => setShowDeleteModal(false)}
                  style={({ pressed }) => [styles.deleteModalCancelBtn, pressed && styles.deleteModalBtnPressed]}
                  accessibilityRole="button"
                  accessibilityLabel="Cancel"
                >
                  <Text style={styles.deleteModalCancelText}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={deleteInvoice}
                  disabled={isDeleting}
                  style={({ pressed }) => [
                    styles.deleteModalConfirmBtn,
                    pressed && styles.deleteModalBtnPressed,
                    isDeleting && styles.deleteModalBtnDisabled,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="Delete"
                >
                  <LinearGradient
                    colors={['#C695B9', '#AF80A1']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.deleteModalConfirmGradient}
                  >
                    {isDeleting ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.deleteModalConfirmText}>Delete</Text>
                    )}
                  </LinearGradient>
                </Pressable>
              </View>
            </Pressable>
          </LinearGradient>
        </Animated.View>
      </Pressable>
    </Modal>

    <Modal
      visible={showDeletedModal}
      transparent
      animationType="fade"
      onRequestClose={() => {
        setShowDeletedModal(false);
        router.replace('/(tabs)/sales' as any);
      }}
    >
      <Pressable
        style={styles.deleteModalOverlay}
        onPress={() => {
          setShowDeletedModal(false);
          router.replace('/(tabs)/sales' as any);
        }}
      >
        <Animated.View entering={FadeInDown.duration(400)} style={styles.deleteModalWrapper}>
          <LinearGradient
            colors={['#FFCBDA', '#C695B9', '#AF80A1']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.deleteModalGradient}
          >
            <Pressable
              style={styles.deleteModalCard}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={styles.deletedIconWrap}>
                <View style={styles.deletedIconBg}>
                  <MaterialCommunityIcons name="check-circle" size={56} color="#AF80A1" />
                </View>
              </View>
              <Text style={styles.deletedModalTitle}>Invoice removed</Text>
              <Text style={styles.deletedModalSubtitle}>
                The invoice and its items have been deleted. Product quantities have been restored.
              </Text>
              <Pressable
                onPress={() => {
                  setShowDeletedModal(false);
                  router.replace('/(tabs)/sales' as any);
                }}
                style={({ pressed }) => [styles.deletedOkButton, pressed && styles.deleteModalBtnPressed]}
                accessibilityRole="button"
                accessibilityLabel="OK"
              >
                <LinearGradient
                  colors={['#C695B9', '#AF80A1']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.deletedOkGradient}
                >
                  <Text style={styles.deletedOkText}>OK</Text>
                </LinearGradient>
              </Pressable>
            </Pressable>
          </LinearGradient>
        </Animated.View>
      </Pressable>
    </Modal>
    </>
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
    fontSize: 25,
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
  deleteModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  deleteModalWrapper: {
    width: '100%',
    maxWidth: 340,
  },
  deleteModalGradient: {
    padding: 2,
    borderRadius: 24,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0px 12px 32px 0px rgba(175, 128, 161, 0.35)' }
      : {
          shadowColor: '#AF80A1',
          shadowOffset: { width: 0, height: 12 },
          shadowOpacity: 0.35,
          shadowRadius: 24,
          elevation: 16,
        }),
  },
  deleteModalCard: {
    backgroundColor: 'rgba(255,255,255,0.98)',
    borderRadius: 22,
    padding: 28,
    alignItems: 'center',
  },
  deleteModalIconWrap: {
    marginBottom: 16,
  },
  deleteModalIconBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,203,218,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteModalTitle: {
    fontFamily: 'Merriweather',
    fontSize: 24,
    fontWeight: '700',
    color: '#AF80A1',
    marginBottom: 10,
    textAlign: 'center',
  },
  deleteModalSubtitle: {
    fontSize: 15,
    color: '#5a5a5a',
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 22,
  },
  deleteModalButtons: {
    flexDirection: 'row',
    gap: 12,
    alignSelf: 'stretch',
  },
  deleteModalCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(200,200,200,0.3)',
    borderWidth: 1,
    borderColor: 'rgba(150,150,150,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteModalConfirmBtn: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
  },
  deleteModalConfirmGradient: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteModalBtnPressed: {
    opacity: 0.9,
  },
  deleteModalBtnDisabled: {
    opacity: 0.7,
  },
  deleteModalCancelText: {
    fontFamily: 'Merriweather',
    fontSize: 16,
    fontWeight: '600',
    color: '#5a5a5a',
  },
  deleteModalConfirmText: {
    fontFamily: 'Merriweather',
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  deletedIconWrap: {
    marginBottom: 16,
  },
  deletedIconBg: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(255,203,218,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deletedModalTitle: {
    fontFamily: 'Merriweather',
    fontSize: 26,
    fontWeight: '700',
    color: '#AF80A1',
    marginBottom: 10,
    textAlign: 'center',
  },
  deletedModalSubtitle: {
    fontSize: 15,
    color: '#5a5a5a',
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 22,
  },
  deletedOkButton: {
    alignSelf: 'stretch',
    borderRadius: 14,
    overflow: 'hidden',
  },
  deletedOkGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deletedOkText: {
    fontFamily: 'Merriweather',
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
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
