import React, { useState } from "react";
import { SafeAreaView, StatusBar, StyleSheet, TouchableOpacity, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AuthProvider, useAuth } from "./src/context/AuthContext";
import { CartProvider } from "./src/context/CartContext";
import LoginScreen from "./src/screens/LoginScreen";
import ProductListScreen from "./src/screens/ProductListScreen";
import ProductDetailScreen from "./src/screens/ProductDetailScreen";
import CartScreen from "./src/screens/CartScreen";
import ProfileScreen from "./src/screens/ProfileScreen";
import OrdersScreen from "./src/screens/OrdersScreen";
import AiAssistantScreen from "./src/screens/AiAssistantScreen";
import { COLORS, useAppMetrics } from "./src/theme";

function Shell() {
  const [route, setRoute] = useState({ name: "products" });
  const { user } = useAuth();
  const metrics = useAppMetrics();

  const screen = {
    login: <LoginScreen go={setRoute} />,
    products: <ProductListScreen go={setRoute} />,
    detail: <ProductDetailScreen id={route.id} go={setRoute} />,
    cart: <CartScreen go={setRoute} />,
    profile: <ProfileScreen go={setRoute} />,
    orders: <OrdersScreen go={setRoute} />,
    ai: <AiAssistantScreen />,
  }[route.name];

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.surface} />
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>PixelBuy<Text style={styles.dot}>.</Text></Text>
          <Text style={styles.subtitle}>Smart shopping, live AI, real devices</Text>
        </View>
        <View style={styles.nav}>
          <TouchableOpacity style={[styles.navButton, { width: metrics.navSize, height: metrics.navSize }]} onPress={() => setRoute({ name: "products" })}><Ionicons name="storefront-outline" color={COLORS.textMuted} size={20} /></TouchableOpacity>
          <TouchableOpacity style={[styles.navButton, { width: metrics.navSize, height: metrics.navSize }]} onPress={() => setRoute({ name: user ? "cart" : "login" })}><Ionicons name="cart-outline" color={COLORS.textMuted} size={20} /></TouchableOpacity>
          <TouchableOpacity style={[styles.navButton, styles.navPrimary, { width: metrics.navSize, height: metrics.navSize }]} onPress={() => setRoute({ name: "ai" })}><Ionicons name="sparkles-outline" color={COLORS.accent} size={20} /></TouchableOpacity>
          <TouchableOpacity style={[styles.navButton, { width: metrics.navSize, height: metrics.navSize }]} onPress={() => setRoute({ name: user ? "profile" : "login" })}><Ionicons name={user ? "person" : "person-circle-outline"} color={COLORS.textMuted} size={20} /></TouchableOpacity>
        </View>
      </View>
      {screen}
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <Shell />
      </CartProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.bg },
  header: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface, flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 },
  title: { fontSize: 24, fontWeight: "900", color: COLORS.text, letterSpacing: 1.5 },
  subtitle: { color: COLORS.textSoft, fontSize: 11, fontWeight: "700", marginTop: 2 },
  dot: { color: COLORS.accent },
  nav: { flexDirection: "row", gap: 8 },
  navButton: { borderRadius: 10, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border },
  navPrimary: { backgroundColor: "rgba(52,152,219,0.14)", borderColor: COLORS.borderStrong },
});
