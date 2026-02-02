import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ImageBackground,
  KeyboardAvoidingView,
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
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { GlassCardBase } from '../constants/theme';
import { executeSql, querySql } from '@/db/database';

const getLowStockLevel = (stockQuantity: number) => {
  if (stockQuantity > 10) return 5;
  if (stockQuantity > 4) return 2;
  return 0;
};

export default function AddProductScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [name, setName] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const resetForm = () => {
    setName('');
    setCostPrice('');
    setSellingPrice('');
    setQuantity('');
  };

  const saveProduct = async () => {
    if (!name || !costPrice || !sellingPrice || !quantity) {
      Alert.alert('Missing info', 'Please fill in all the fields.');
      return;
    }

    const parsedCostPrice = Number(costPrice);
    const parsedSellingPrice = Number(sellingPrice);
    const parsedQuantity = Number(quantity);
    const hasNegative =
      parsedCostPrice < 0 ||
      parsedSellingPrice < 0 ||
      parsedQuantity < 0;

    if (
      Number.isNaN(parsedCostPrice) ||
      Number.isNaN(parsedSellingPrice) ||
      Number.isNaN(parsedQuantity)
    ) {
      Alert.alert('Invalid numbers', 'Please enter numbers only.');
      return;
    }

    if (hasNegative) {
      Alert.alert('Invalid numbers', 'Values must be 0 or more.');
      return;
    }

    const trimmedName = name.trim();
    const existing = (await querySql(
      'SELECT id FROM products WHERE LOWER(TRIM(name)) = LOWER(?) LIMIT 1',
      [trimmedName]
    )) as { id: number }[];
    if (existing.length > 0) {
      Alert.alert(
        'Product already added',
        "The product is already added. Use a different name or update the existing product's quantity.",
        [{ text: 'OK', onPress: () => router.push('/(tabs)/products' as any) }]
      );
      return;
    }

    setIsSaving(true);
    try {
      const createdAt = new Date().toISOString();
      const computedLowStockLevel = getLowStockLevel(parsedQuantity);
      await executeSql(
        `INSERT INTO products (name, costPrice, sellingPrice, quantity, lowStockLevel, createdAt)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          trimmedName,
          parsedCostPrice,
          parsedSellingPrice,
          parsedQuantity,
          computedLowStockLevel,
          createdAt,
        ],
      );
      resetForm();
      router.push('/(tabs)/products' as any);
    } catch {
      Alert.alert('Couldn’t save', 'Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ImageBackground
      source={require('../assets/images/omyre1.png')}
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
        <Text style={styles.title}>Add Product</Text>
        <View style={styles.headerSpacer} />
      </View>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content}>

        <View style={styles.field}>
          <Text style={styles.label}>Product Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="e.g. Rice"
            placeholderTextColor="#999"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Cost Price</Text>
          <TextInput
            style={styles.input}
            value={costPrice}
            onChangeText={setCostPrice}
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColor="#999"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Selling Price</Text>
          <TextInput
            style={styles.input}
            value={sellingPrice}
            onChangeText={setSellingPrice}
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColor="#999"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Quantity in Stock</Text>
          <TextInput
            style={styles.input}
            value={quantity}
            onChangeText={setQuantity}
            keyboardType="number-pad"
            placeholder="0"
            placeholderTextColor="#999"
          />
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={saveProduct}
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
            <Text style={styles.saveButtonText}>Save</Text>
          )}
        </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
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
    paddingBottom: 32,
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
  field: {
    marginBottom: 12,
  },
  label: {
    fontSize: 16,
    color: '#555',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 18,
    color: '#222',
  },
  saveButton: {
    marginTop: 16,
    ...GlassCardBase,
    backgroundColor: 'rgba(108, 148, 214, 0.66)',
    borderColor: 'rgba(108, 148, 214, 0.95)',
    paddingVertical: 16,
    alignItems: 'center',
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
});
