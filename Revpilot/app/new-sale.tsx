import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ImageBackground,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { GlassCardBase } from '../constants/theme';
import { openDatabase, querySql } from '@/db/database';
import { formatCurrency } from '../utils/format';

type Product = {
  id: number;
  name: string;
  sellingPrice: number;
  quantity: number;
};

type SelectedItem = {
  productId: number;
  quantity: string;
};

export default function NewSaleScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [selected, setSelected] = useState<Record<number, SelectedItem>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successTotal, setSuccessTotal] = useState(0);

  useEffect(() => {
    let isMounted = true;
    const loadProducts = async () => {
      const rows = (await querySql(
        'SELECT id, name, sellingPrice, quantity FROM products WHERE quantity > 0 ORDER BY name ASC'
      )) as Product[];
      if (isMounted) {
        setProducts(rows);
      }
    };
    loadProducts();
    return () => {
      isMounted = false;
    };
  }, []);

  const searchLower = searchQuery.trim().toLowerCase();
  const filteredProducts = useMemo(
    () =>
      searchLower
        ? products.filter((p) => p.name.toLowerCase().includes(searchLower))
        : products,
    [products, searchLower]
  );

  const totals = useMemo(() => {
    let totalItems = 0;
    let totalAmount = 0;
    for (const item of Object.values(selected)) {
      const product = products.find((p) => p.id === item.productId);
      const quantity = Number(item.quantity);
      if (!product || Number.isNaN(quantity)) {
        continue;
      }
      totalItems += quantity;
      totalAmount += quantity * product.sellingPrice;
    }
    return { totalItems, totalAmount };
  }, [products, selected]);

  const toggleProduct = (productId: number) => {
    setSelected((prev) => {
      if (prev[productId]) {
        const next = { ...prev };
        delete next[productId];
        return next;
      }
      return { ...prev, [productId]: { productId, quantity: '1' } };
    });
  };

  const updateQuantity = (product: Product, value: string) => {
    const numeric = Number(value);
    if (value === '') {
      setSelected((prev) => ({
        ...prev,
        [product.id]: { productId: product.id, quantity: value },
      }));
      return;
    }

    if (Number.isNaN(numeric) || numeric < 0) {
      return;
    }

    const capped = Math.min(numeric, product.quantity);
    setSelected((prev) => ({
      ...prev,
      [product.id]: { productId: product.id, quantity: String(capped) },
    }));
  };

  const saveSale = async () => {
    const parsedItems = Object.values(selected)
      .map((item) => ({
        ...item,
        quantityNumber: Number(item.quantity),
      }))
      .filter((item) => !Number.isNaN(item.quantityNumber));

    const selectedItems = parsedItems.filter((item) => item.quantityNumber > 0);

    if (selectedItems.length === 0) {
      Alert.alert('Nothing selected', 'Pick at least one product to sell.');
      return;
    }

    let totalItems = 0;
    let totalAmount = 0;

    for (const item of selectedItems) {
      const product = products.find((p) => p.id === item.productId);
      if (!product) {
        Alert.alert('Missing product', 'Please choose a valid product.');
        return;
      }
      if (item.quantityNumber <= 0) {
        Alert.alert('Invalid quantity', 'Quantity must be at least 1.');
        return;
      }
      if (item.quantityNumber > product.quantity) {
        Alert.alert(
          'Stock too low',
          `Only ${product.quantity} left for ${product.name}.`
        );
        return;
      }
      if (product.sellingPrice <= 0) {
        Alert.alert(
          'Price needed',
          `Add a selling price for ${product.name} first.`
        );
        return;
      }
      totalItems += item.quantityNumber;
      totalAmount += item.quantityNumber * product.sellingPrice;
    }

    setIsSaving(true);
    try {
      const createdAt = new Date().toISOString();
      const db = await openDatabase();
      await db.withTransactionAsync(async () => {
        // 1) Insert the invoice and get its ID.
        const invoiceResult = await db.runAsync(
          `INSERT INTO invoices (totalAmount, totalItems, createdAt)
           VALUES (?, ?, ?)`,
          [totalAmount, totalItems, createdAt]
        );
        const invoiceId = invoiceResult.lastInsertRowId;

        // 2) Insert invoice items and update product quantities.
        for (const item of selectedItems) {
          const product = products.find((p) => p.id === item.productId);
          if (!product) {
            continue;
          }
          await db.runAsync(
            `INSERT INTO invoice_items (invoiceId, productId, quantity, price)
             VALUES (?, ?, ?, ?)`,
            [invoiceId, product.id, item.quantityNumber, product.sellingPrice]
          );
          const newQuantity = product.quantity - item.quantityNumber;
          await db.runAsync(
            'UPDATE products SET quantity = ? WHERE id = ?',
            [newQuantity, product.id]
          );
        }
      });

      setSelected({});
      setSuccessTotal(totalAmount);
      setShowSuccessModal(true);
    } catch {
      Alert.alert('Couldn’t save', 'Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSuccessOk = () => {
    setShowSuccessModal(false);
    router.push('/sales' as any);
  };

  return (
    <ImageBackground
      source={require('../assets/images/omyre1.png')}
      style={styles.background}
      imageStyle={styles.backgroundImage}
      resizeMode="contain"
    >
    <Modal
      visible={showSuccessModal}
      transparent
      animationType="fade"
      onRequestClose={handleSuccessOk}
    >
      <Pressable style={styles.modalOverlay} onPress={handleSuccessOk}>
        <Animated.View
          entering={FadeInDown.duration(400)}
          style={styles.successCardWrapper}
        >
          <LinearGradient
            colors={['#FFCBDA', '#C695B9', '#AF80A1']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.successCardGradient}
          >
            <Pressable style={styles.successCard} onPress={(e) => e.stopPropagation()}>
              <View style={styles.successIconWrap}>
                <View style={styles.successIconBg}>
                  <MaterialCommunityIcons name="check-circle" size={56} color="#AF80A1" />
                </View>
              </View>
              <Text style={styles.successTitle}>Successful</Text>
              <Text style={styles.successSubtitle}>Your sale has been saved.</Text>
              <LinearGradient
                colors={['rgba(255,203,218,0.4)', 'rgba(198,149,185,0.3)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.successTotalWrap}
              >
                <Text style={styles.successTotalLabel}>Total</Text>
                <Text style={styles.successTotalAmount}>{formatCurrency(successTotal)}</Text>
              </LinearGradient>
              <Pressable
                onPress={handleSuccessOk}
                style={({ pressed }) => [styles.successOkButton, pressed && styles.successOkPressed]}
                accessibilityRole="button"
                accessibilityLabel="OK"
              >
                <LinearGradient
                  colors={['#C695B9', '#AF80A1']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.successOkGradient}
                >
                  <Text style={styles.successOkText}>OK</Text>
                </LinearGradient>
              </Pressable>
            </Pressable>
          </LinearGradient>
        </Animated.View>
      </Pressable>
    </Modal>
    <SafeAreaView style={[styles.container, { paddingTop: insets.top + 50 }]}>
      <View style={styles.headerRow}>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <MaterialCommunityIcons name="chevron-left" size={22} color="#2f2f3a" />
        </Pressable>
        <Text style={styles.title}>New Sale</Text>
        <View style={styles.headerSpacer} />
      </View>
      <View style={styles.searchWrap}>
        <MaterialCommunityIcons name="magnify" size={20} color="#6b6b7a" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search products..."
          placeholderTextColor="#9a9aaa"
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
      </View>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content}>

        {filteredProducts.map((product) => {
          const isSelected = Boolean(selected[product.id]);
          const selectedItem = selected[product.id];
          return (
            <View
              key={product.id}
              style={[styles.card, isSelected && styles.cardSelected]}
            >
              <Pressable onPress={() => toggleProduct(product.id)}>
                <Text style={styles.productName}>{product.name}</Text>
                <Text style={styles.productDetail}>
                  Selling price: ₦{product.sellingPrice}
                </Text>
                <Text style={styles.productDetail}>
                  Available quantity: {product.quantity}
                </Text>
                <Text style={styles.selectHint}>
                  {isSelected ? 'Tap to remove' : 'Tap to add'}
                </Text>
              </Pressable>

              {isSelected ? (
                <View style={styles.quantityRow}>
                  <Text style={styles.quantityLabel}>Quantity</Text>
                  <TextInput
                    style={styles.quantityInput}
                    keyboardType="number-pad"
                    value={selectedItem.quantity}
                    onChangeText={(value) => updateQuantity(product, value)}
                  />
                </View>
              ) : null}
            </View>
          );
        })}

        </ScrollView>
      </KeyboardAvoidingView>
      <View style={[styles.fixedFooterContainer, { paddingBottom: insets.bottom }]}>
        <View style={styles.summary}>
          <Text style={styles.summaryText}>
            Total items: {totals.totalItems}
          </Text>
          <Text style={styles.summaryText}>
            Total amount: {formatCurrency(totals.totalAmount)}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={saveSale}
          style={({ pressed }) => [
            styles.saveButton,
            pressed && styles.saveButtonPressed,
            isSaving && styles.saveButtonDisabled,
          ]}
          disabled={isSaving}
        >
          {isSaving ? (
            <View style={styles.saveButtonContent}>
              <ActivityIndicator size="small" color="#fff" style={styles.saveButtonSpinner} />
              <Text style={styles.saveButtonText}>Saving...</Text>
            </View>
          ) : (
            <Text style={styles.saveButtonText}>Save Sale</Text>
          )}
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
  flex: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 200, // Increased padding to accommodate fixed footer
    paddingTop: 8, // Adjusted padding to account for fixed header
  },
  title: {
    fontFamily: 'Merriweather',
    fontSize: 30,
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
    marginBottom: 16,
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
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(198,149,185,0.4)',
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#222',
    paddingVertical: Platform.OS === 'web' ? 4 : 0,
  },
  card: {
    ...GlassCardBase,
    backgroundColor: 'rgba(108, 148, 214, 0.29)',
    borderColor: 'rgba(108, 148, 214, 0.95)',
    padding: 16,
    marginBottom: 12,
  },
  cardSelected: {
      ...GlassCardBase,
      backgroundColor: 'rgba(108, 148, 214, 0.29)',
      borderColor: 'rgba(108, 148, 214, 0.95)',
  },
  productName: {
    fontFamily: 'Merriweather',
    fontSize: 18,
    fontWeight: '600',
    color: '#222',
  },
  productDetail: {
    fontSize: 16,
    color: '#444',
    marginTop: 4,
  },
  selectHint: {
    fontSize: 12,
    color: '#666',
    marginTop: 6,
  },
  quantityRow: {
    marginTop: 12,
  },
  quantityLabel: {
    fontSize: 14,
    color: '#444',
    marginBottom: 6,
  },
  quantityInput: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    color: '#222',
  },
  summary: {
    ...GlassCardBase,
    backgroundColor: 'rgba(108, 148, 214, 0.29)',
    borderColor: 'rgba(108, 148, 214, 0.95)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    marginTop: 8,
    marginBottom: 12,
  },
  summaryText: {
    fontSize: 18,
    color: '#222',
    marginBottom: 6,
  },
  saveButton: {
    marginTop: 8,
    ...GlassCardBase,
    backgroundColor: 'rgba(214, 108, 120, 0.66)',
    borderColor: 'rgba(214, 108, 120, 0.95)',
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: 'center',
    bottom: 15,
  },
  saveButtonPressed: {
    opacity: 0.85,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonSpinner: {
    marginRight: 8,
  },
  saveButtonText: {
    fontFamily: 'Merriweather',
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  successCardWrapper: {
    width: '100%',
    maxWidth: 340,
  },
  successCardGradient: {
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
  successCard: {
    backgroundColor: 'rgba(255,255,255,0.98)',
    borderRadius: 22,
    padding: 28,
    alignItems: 'center',
  },
  successIconWrap: {
    marginBottom: 16,
  },
  successIconBg: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(255,203,218,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: {
    fontFamily: 'Merriweather',
    fontSize: 28,
    fontWeight: '700',
    color: '#AF80A1',
    marginBottom: 6,
  },
  successSubtitle: {
    fontSize: 16,
    color: '#5a5a5a',
    marginBottom: 20,
  },
  successTotalWrap: {
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 28,
    marginBottom: 24,
    alignSelf: 'stretch',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#C695B9',
  },
  successTotalLabel: {
    fontSize: 12,
    color: '#AF80A1',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: '600',
  },
  successTotalAmount: {
    fontFamily: 'Merriweather',
    fontSize: 32,
    fontWeight: '700',
    color: '#AF80A1',
  },
  successOkButton: {
    alignSelf: 'stretch',
    borderRadius: 14,
    overflow: 'hidden',
  },
  successOkGradient: {
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successOkPressed: {
    opacity: 0.9,
  },
  successOkText: {
    fontFamily: 'Merriweather',
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  fixedFooterContainer: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    ...GlassCardBase,
    backgroundColor: '#f6b9fa',
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.4)',
  },
});
