import { useCallback, useState } from 'react';
import {
  Alert,
  ImageBackground,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Link, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
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
  const tabBarHeight = useBottomTabBarHeight();
  const router = useRouter();
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  const [products, setProducts] = useState<Product[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState<TabType>('active');
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
    Alert.alert(
      'Delete product?',
      `Do you want to remove ${product.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteProduct(product),
        },
      ]
    );
  };

  const deleteProduct = async (product: Product) => {
    await executeSql('DELETE FROM products WHERE id = ?', [product.id]);
    await loadProducts();
    Alert.alert('Removed', `${product.name} has been removed.`);
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

  const filteredProducts = getFilteredProducts();

  return (
    <ImageBackground
      source={require('../assets/images/omyre1.png')}
      style={styles.background}
      imageStyle={styles.backgroundImage}
      resizeMode="contain"
    >
    <SafeAreaView style={[styles.container, { paddingTop: insets.top + 50 }]}>
      <Text style={styles.title}>Products</Text>

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
        contentContainerStyle={[styles.listContent, { paddingBottom: 30 + tabBarHeight }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        style={styles.scrollView}
      >
        {filteredProducts.length === 0 ? (
          <Animated.Text entering={FadeIn} style={styles.emptyText}>
            {products.length === 0
              ? 'No products yet. Tap "Add Product" to get started.'
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

      <View style={[styles.fixedButtonContainer, { paddingBottom: insets.bottom, bottom: tabBarHeight }]}>
        <Link href={addProductHref} asChild>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add product"
            style={styles.addButton}
          >
            <Text style={styles.addButtonText}>Add Product</Text>
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
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 10,
    color: '#2f2f3a',
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
    left: 0,
    right: 0,
    // backgroundColor: 'rgba(255,255,255,0.78)',
    paddingHorizontal: 16,
  
  },
  addButton: {
    ...GlassCardBase,
    backgroundColor: 'rgba(108, 148, 214, 0.66)',
    borderColor: 'rgba(108, 148, 214, 0.95)',
    paddingVertical: 12,
    alignItems: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
});