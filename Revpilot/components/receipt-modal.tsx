import { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { formatCurrency } from '@/utils/format';
import type { ReceiptInvoice, ReceiptItem } from '@/utils/receipt';
import { formatReceiptDate, shareReceipt } from '@/utils/receipt';

type ReceiptModalProps = {
  visible: boolean;
  onClose: () => void;
  invoice: ReceiptInvoice;
  items: ReceiptItem[];
};

export function ReceiptModal({
  visible,
  onClose,
  invoice,
  items,
}: ReceiptModalProps) {
  const [isSharing, setIsSharing] = useState(false);

  const handleShare = async () => {
    setIsSharing(true);
    try {
      await shareReceipt(invoice, items);
    } catch {
      // Error logged in receipt.ts
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <View style={styles.card}>
          <LinearGradient
            colors={['#FFCBDA', '#C695B9', '#AF80A1']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradientBorder}
          >
            <Pressable style={styles.cardInner} onPress={(e) => e.stopPropagation()}>
              <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.header}>
                  <Text style={styles.brand}>Omyre</Text>
                  <Text style={styles.title}>Sales Receipt</Text>
                </View>

                <View style={styles.metaContainer}>
                  <View style={styles.metaItem}>
                    <Text style={styles.metaLabel}>Invoice:</Text>
                    <Text style={styles.metaValue}>#{invoice.id}</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Text style={styles.metaLabel}>Date:</Text>
                    <Text style={styles.metaValue}>{formatReceiptDate(invoice.createdAt)}</Text>
                  </View>
                </View>

                <View style={styles.table}>
                  <LinearGradient
                    colors={['#C695B9', '#AF80A1']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.tableHeader}
                  >
                    <Text style={[styles.th, styles.colProduct]}>Product</Text>
                    <Text style={[styles.th, styles.colQty]}>Qty</Text>
                    <Text style={[styles.th, styles.colPrice]}>Price</Text>
                    <Text style={[styles.th, styles.colSubtotal]}>Subtotal</Text>
                  </LinearGradient>
                  {items.map((item, index) => {
                    const subtotal = item.quantity * item.price;
                    return (
                      <View key={index} style={styles.tableRow}>
                        <Text style={[styles.td, styles.colProduct]} numberOfLines={2}>
                          {item.productName}
                        </Text>
                        <Text style={[styles.td, styles.colQty]}>{item.quantity}</Text>
                        <Text style={[styles.td, styles.colPrice]}>{formatCurrency(item.price)}</Text>
                        <Text style={[styles.td, styles.colSubtotal]}>{formatCurrency(subtotal)}</Text>
                      </View>
                    );
                  })}
                </View>

                <LinearGradient
                  colors={['rgba(255,203,218,0.3)', 'rgba(198,149,185,0.3)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.totalSection}
                >
                  <Text style={styles.totalLabel}>Total</Text>
                  <Text style={styles.totalAmount}>{formatCurrency(invoice.totalAmount)}</Text>
                </LinearGradient>

                <Text style={styles.footer}>Thank you for your business!</Text>
              </ScrollView>

              <View style={styles.buttonRow}>
                <Pressable
                  accessibilityRole="button"
                  onPress={handleShare}
                  disabled={isSharing}
                  style={({ pressed }) => [
                    styles.shareButton,
                    pressed && styles.buttonPressed,
                    isSharing && styles.buttonDisabled,
                  ]}
                >
                  <LinearGradient
                    colors={['#C695B9', '#AF80A1']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.buttonGradient}
                  >
                    {isSharing ? (
                      <>
                        <ActivityIndicator size="small" color="#fff" style={styles.spinner} />
                        <Text style={styles.shareButtonText}>Sharing...</Text>
                      </>
                    ) : (
                      <Text style={styles.shareButtonText}>Share</Text>
                    )}
                  </LinearGradient>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  onPress={onClose}
                  style={({ pressed }) => [styles.doneButton, pressed && styles.buttonPressed]}
                >
                  <Text style={styles.doneButtonText}>Done</Text>
                </Pressable>
              </View>
            </Pressable>
          </LinearGradient>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '85%',
    borderRadius: 20,
    overflow: 'hidden',
  },
  gradientBorder: {
    padding: 2,
    borderRadius: 20,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0px 8px 32px 0px rgba(175, 128, 161, 0.3)' }
      : {
          shadowColor: '#AF80A1',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.3,
          shadowRadius: 16,
          elevation: 12,
        }),
  },
  cardInner: {
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderRadius: 18,
    overflow: 'hidden',
    flex: 1,
  },
  scroll: { flex: 1 },
  scrollContent: { padding: 24, paddingBottom: 12 },
  header: {
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#FFCBDA',
  },
  brand: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#AF80A1',
    marginBottom: 4,
    letterSpacing: 1,
    ...(Platform.OS === 'web'
      ? { textShadow: '2px 2px 4px rgba(175, 128, 161, 0.3)' }
      : {
          textShadowColor: 'rgba(175, 128, 161, 0.3)',
          textShadowOffset: { width: 2, height: 2 },
          textShadowRadius: 4,
        }),
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#C695B9',
  },
  metaContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    padding: 12,
    backgroundColor: 'rgba(255, 203, 218, 0.15)',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#C695B9',
  },
  metaItem: {
    flexDirection: 'row',
    gap: 6,
  },
  metaLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#AF80A1',
  },
  metaValue: {
    fontSize: 13,
    color: '#5a5a5a',
  },
  table: {
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(198, 149, 185, 0.2)',
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 10,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(198, 149, 185, 0.15)',
    backgroundColor: '#fff',
  },
  th: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  td: {
    fontSize: 13,
    color: '#333',
  },
  colProduct: { flex: 2 },
  colQty: { flex: 0.6, textAlign: 'center' },
  colPrice: { flex: 1, textAlign: 'right' },
  colSubtotal: { flex: 1, textAlign: 'right' },
  totalSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#C695B9',
    marginBottom: 12,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#AF80A1',
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#AF80A1',
    ...(Platform.OS === 'web'
      ? { textShadow: '1px 1px 2px rgba(175, 128, 161, 0.2)' }
      : {
          textShadowColor: 'rgba(175, 128, 161, 0.2)',
          textShadowOffset: { width: 1, height: 1 },
          textShadowRadius: 2,
        }),
  },
  footer: {
    textAlign: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 2,
    borderTopColor: '#FFCBDA',
    fontSize: 12,
    color: '#888',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginHorizontal: 20,
    marginBottom: 20,
    marginTop: 8,
  },
  shareButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  doneButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(200, 200, 200, 0.3)',
    borderWidth: 1,
    borderColor: 'rgba(150, 150, 150, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPressed: { opacity: 0.85 },
  buttonDisabled: { opacity: 0.7 },
  spinner: { marginRight: 8 },
  shareButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  doneButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#5a5a5a',
  },
});
