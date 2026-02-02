import { Tabs } from 'expo-router';
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const ICONS: Record<string, React.ComponentProps<typeof MaterialCommunityIcons>['name']> = {
  index: 'home',
  products: 'package-variant',
  sales: 'cash-register',
  reports: 'chart-bar',
  settings: 'cog',
};

const LABELS: Record<string, string> = {
  index: 'Home',
  products: 'Products',
  sales: 'Sales',
  reports: 'Reports',
  settings: 'Settings',
};

function CustomTabBar({
  state,
  descriptors,
  navigation,
}: {
  state: { routes: { name: string; key: string }[]; index: number };
  descriptors: Record<string, { options: { title?: string } }>;
  navigation: { navigate: (name: string) => void };
}) {
  const colorScheme = useColorScheme();
  const activeColor = Colors[colorScheme ?? 'light'].tint;
  const inactiveColor = Colors[colorScheme ?? 'light'].tabIconDefault;

  const visibleRoutes = state.routes;
  const focusedRouteKey = state.routes[state.index]?.key;

  return (
    <View style={styles.tabBar}>
      {visibleRoutes.map((route) => {
          const focused = route.key === focusedRouteKey;
          const color = focused ? activeColor : inactiveColor;
          const label = LABELS[route.name] ?? descriptors[route.key]?.options?.title ?? route.name;
          const iconName = ICONS[route.name] ?? 'circle';

          return (
            <Pressable
              key={route.key}
              onPress={() => navigation.navigate(route.name)}
              style={({ pressed }) => [styles.tabItem, pressed && styles.tabItemPressed]}
              accessibilityRole="button"
              accessibilityLabel={label}
            >
              <MaterialCommunityIcons name={iconName} size={24} color={color} />
              <Text style={[styles.tabLabel, { color }]} numberOfLines={1}>
                {label}
              </Text>
            </Pressable>
          );
        })}
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e0e0e0',
    paddingTop: 8,
    paddingBottom: 8,
    minHeight: 56,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  tabItemPressed: {
    opacity: 0.7,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 4,
  },
});

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}>
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="products" options={{ title: 'Products' }} />
      <Tabs.Screen name="sales" options={{ title: 'Sales' }} />
      <Tabs.Screen name="reports" options={{ title: 'Reports' }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
    </Tabs>
  );
}
