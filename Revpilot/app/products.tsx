import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  ImageBackground,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Link, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSafeBottomTabBarHeight } from '@/hooks/use-safe-bottom-tab-bar-height';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';

import { GlassCardBase } from '../constants/theme';
import { executeSql, querySql } from '@/db/database';
import { formatCurrency } from '../utils/format';

type Product = {
  id: number;
  name: string;
  sellingPrice: number;
  quantity: number;
  lowStockLevel: number;
};

type TabType = 'active' | 'inactive' | 'all';

export default function ProductsScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useSafeBottomTabBarHeight();
  const router = useRouter();
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  const [products, setProducts] = useState<Product[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState<TabType>('active');
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showRemovedModal, setShowRemovedModal] = useState(false);
  const [removedProductName, setRemovedProductName] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const addProductHref = '/add-product' as any;

  // Set initial tab from query parameter
  useFocusEffect(
    useCallback(() => {
      if (tab === 'inactive' || tab === 'active' || tab === 'all') {
        setSelectedTab(tab as TabType);
      }
    }, [tab])
  );

  const loadProducts = useCallback(async () => {
    const rows = (await querySql(
      'SELECT id, name, sellingPrice, quantity, lowStockLevel FROM products ORDER BY name COLLATE NOCASE ASC'
    )) as Product[];
    setProducts(rows);
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadProducts();
    setRefreshing(false);
  }, [loadProducts]);

  useFocusEffect(
    useCallback(() => {
      loadProducts();
    }, [loadProducts])
  );

  const confirmDelete = (product: Product) => {
    setProductToDelete(product);
    setShowDeleteModal(true);
  };

  const deleteProduct = async (product: Product) => {
    await executeSql('DELETE FROM products WHERE id = ?', [product.id]);
    await loadProducts();
  };

  const handleConfirmDelete = async () => {
    if (!productToDelete) return;
    setIsDeleting(true);
    await deleteProduct(productToDelete);
    setRemovedProductName(productToDelete.name);
    setProductToDelete(null);
    setShowDeleteModal(false);
    setIsDeleting(false);
    setShowRemovedModal(true);
  };

  const activeProducts = products.filter(
    (item) => item.quantity > item.lowStockLevel
  );
  const inactiveProducts = products.filter(
    (item) => item.quantity <= item.lowStockLevel
  );

  const getFilteredProducts = () => {
    if (selectedTab === 'active') return activeProducts;
    if (selectedTab === 'inactive') return inactiveProducts;
    return products;
  };

  const tabFiltered = getFilteredProducts();
  const searchLower = searchQuery.trim().toLowerCase();
  const filteredProducts = searchLower
    ? tabFiltered.filter((p) => p.name.toLowerCase().includes(searchLower))
    : tabFiltered;

  return (
    <ImageBackground
      source={require('../assets/images/omyre1.png')}
      style={styles.background}
      imageStyle={styles.backgroundImage}
      resizeMode="contain"
    >
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
              <Text style={styles.deleteModalTitle}>Delete product?</Text>
              <Text style={styles.deleteModalSubtitle}>
                {productToDelete
                  ? `Do you want to remove ${productToDelete.name}?`
                  : 'This product will be removed.'}
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
                  onPress={handleConfirmDelete}
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
      visible={showRemovedModal}
      transparent
      animationType="fade"
      onRequestClose={() => setShowRemovedModal(false)}
    >
      <Pressable style={styles.deleteModalOverlay} onPress={() => setShowRemovedModal(false)}>
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
              <Text style={styles.deletedModalTitle}>Product removed</Text>
              <Text style={styles.deletedModalSubtitle}>
                {removedProductName ? `${removedProductName} has been removed.` : 'The product has been removed.'}
              </Text>
              <Pressable
                onPress={() => setShowRemovedModal(false)}
                style={({ pressed }) => [styles.deleteModalOkBtn, pressed && styles.deleteModalBtnPressed]}
                accessibilityRole="button"
                accessibilityLabel="OK"
              >
                <LinearGradient
                  colors={['#C695B9', '#AF80A1']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.deleteModalOkGradient}
                >
                  <Text style={styles.deleteModalOkText}>OK</Text>
                </LinearGradient>
              </Pressable>
            </Pressable>
          </LinearGradient>
        </Animated.View>
      </Pressable>
    </Modal>

    <SafeAreaView style={[styles.container, { paddingTop: insets.top + 50 }]}>
      <Text style={styles.title}>Products</Text>

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

      <View style={styles.tabsContainer}>
        <Pressable
          onPress={() => setSelectedTab('active')}
          style={styles.tab}
        >
          <Text style={[styles.tabText, selectedTab === 'active' && styles.tabTextActive]}>
            Active ({activeProducts.length})
          </Text>
          {selectedTab === 'active' && <View style={styles.tabUnderline} />}
        </Pressable>
        <Pressable
          onPress={() => setSelectedTab('inactive')}
          style={styles.tab}
        >
          <Text style={[styles.tabText, selectedTab === 'inactive' && styles.tabTextActive]}>
            Out of stock ({inactiveProducts.length})
          </Text>
          {selectedTab === 'inactive' && <View style={styles.tabUnderline} />}
        </Pressable>
        <Pressable
          onPress={() => setSelectedTab('all')}
          style={styles.tab}
        >
          <Text style={[styles.tabText, selectedTab === 'all' && styles.tabTextActive]}>
            All ({products.length})
          </Text>
          {selectedTab === 'all' && <View style={styles.tabUnderline} />}
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[styles.listContent, { paddingBottom: 59 + tabBarHeight }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        style={styles.scrollView}
      >
        {filteredProducts.length === 0 ? (
          <Animated.Text entering={FadeIn} style={styles.emptyText}>
            {products.length === 0
              ? 'No products yet. Tap "Add Product" to get started.'
              : searchLower
                ? 'No products match your search.'
                : `No ${selectedTab} products.`}
          </Animated.Text>
        ) : (
          filteredProducts.map((item, index) => {
            const isLowStock = item.quantity <= item.lowStockLevel;
            return (
              <Animated.View
                key={item.id}
                entering={FadeInDown.delay(index * 40)}
                style={[styles.card, isLowStock && styles.cardLowStock]}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.productRow}>
                    <View style={styles.iconBadge}>
                      <MaterialCommunityIcons name="shopping" size={18} color="#5b6b8a" />
                    </View>
                    <View>
                      <Text style={styles.productName}>{item.name}</Text>
                      <Text style={styles.priceText}>{formatCurrency(item.sellingPrice)}</Text>
                    </View>
                  </View>
                  {isLowStock ? (
                    <View style={styles.lowStockBadge}>
                      <MaterialCommunityIcons name="alert-circle-outline" size={14} color="#b5535a" />
                      <Text style={styles.lowStockText}>
                        Low stock
                      </Text>
                    </View>
                  ) : null}
                </View>
                <View style={styles.footerRow}>
                  <Text style={styles.quantityText}>
                    In stock: {item.quantity}
                  </Text>
                  <View style={styles.actionRow}>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => router.push(`/edit-product/${item.id}` as any)}
                      style={styles.editButton}
                    >
                      <MaterialCommunityIcons name="pencil-outline" size={14} color="#3b4c73" />
                      <Text style={styles.editButtonText}>Edit</Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => confirmDelete(item)}
                      style={styles.deleteButton}
                    >
                      <MaterialCommunityIcons name="trash-can-outline" size={14} color="#8b1e3f" />
                      <Text style={styles.deleteButtonText}>Delete</Text>
                    </Pressable>
                  </View>
                </View>
              </Animated.View>
            );
          })
        )}
      </ScrollView>

      <View style={[styles.fixedButtonContainer, { paddingBottom: insets.bottom, paddingRight: 16, bottom: tabBarHeight - 40 }]}>
        <View style={styles.addButtonBg}>
          <Link href={addProductHref} asChild>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Add product"
              style={({ pressed }) => [styles.addButton, pressed && styles.addButtonPressed]}
            >
              <MaterialCommunityIcons name="plus" size={28} color="#fff" />
            </Pressable>
          </Link>
        </View>
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
    fontWeight: '600',
    marginBottom: 10,
    color: '#2f2f3a',
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(198,149,185,0.4)',
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
  scrollView: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 30,
  },
  fixedButtonContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    left: 0,
    alignItems: 'flex-end',
  },
  addButtonBg: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgb(108, 117, 214)',
    alignItems: 'center',
    justifyContent: 'center',},
  addButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(108, 148, 214, 0.95)',
    borderWidth: 1.5,
    borderColor: 'rgba(108, 148, 214, 1)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    ...(Platform.OS === 'web'
      ? { boxShadow: '0px 4px 12px rgba(108, 148, 214, 0.45)' }
      : {
          shadowColor: '#6c94d6',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.4,
          shadowRadius: 8,
          elevation: 8,
        }),
  },
  addButtonPressed: {
    opacity: 0.9,
  },
  card: {
    ...GlassCardBase,
    padding: 16,
    marginBottom: 12,
  },
  cardLowStock: {
    backgroundColor: 'rgba(234, 118, 118, 0.56)',
    borderColor: 'rgba(234, 118, 118, 0.95)',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#eef1f7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  productName: {
    fontFamily: 'Merriweather',
    fontSize: 16,
    fontWeight: '600',
    color: '#2f2f3a',
  },
  lowStockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fde7e8',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  lowStockText: {
    fontSize: 12,
    color: '#b5535a',
    fontWeight: '600',
  },
  priceText: {
    fontSize: 14,
    color: '#6b6b7b',
    marginTop: 2,
  },
  quantityText: {
    fontSize: 14,
    color: '#6b6b7b',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    ...GlassCardBase,
    backgroundColor: 'rgba(231, 237, 246, 0.9)',
    borderColor: 'rgba(223, 230, 243, 0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  editButtonText: {
    fontSize: 12,
    color: '#3b4c73',
    fontWeight: '600',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    ...GlassCardBase,
    backgroundColor: 'rgba(253, 236, 238, 0.9)',
    borderColor: 'rgba(248, 200, 205, 0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  deleteButtonText: {
    fontSize: 12,
    color: '#8b1e3f',
    fontWeight: '600',
  },
  emptyText: {
    textAlign: 'center',
    color: '#7a7a8a',
    marginTop: 24,
  },
  tabsContainer: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 24,
  },
  tab: {
    paddingBottom: 8,
  },
  tabText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#6c94d6',
    fontWeight: '600',
  },
  tabUnderline: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: '#6c94d6',
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
  deleteModalOkBtn: {
    alignSelf: 'stretch',
    borderRadius: 14,
    overflow: 'hidden',
  },
  deleteModalOkGradient: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteModalOkText: {
    fontFamily: 'Merriweather',
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});