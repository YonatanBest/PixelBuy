import React, { useEffect } from "react";
import { Alert, FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { api, resolveMediaUrl } from "../api/apiClient";
import { useCart } from "../context/CartContext";
import { COLORS, useAppMetrics } from "../theme";

export default function CartScreen() {
  const metrics = useAppMetrics();
  const { cart, loadCart, setCart } = useCart();

  useEffect(() => {
    loadCart().catch((error) => Alert.alert("Cart", error.message));
  }, []);

  const checkout = async () => {
    try {
      const res = await api.checkout({
        customer_name: "Mobile Demo User",
        email: "mobile.demo@smartshop.test",
        phone: "+1 555 0199",
        address: "500 Mobile App Lane",
        city: "Austin",
        state: "TX",
        zip: "73301",
        payment_method: "Demo Visa",
        card_number: "4242 4242 4242 4242",
        delivery_method: "Express delivery",
        notes: "Mobile dummy checkout",
      });
      setCart({ items: [], total: 0 });
      Alert.alert("Checkout complete", `Order #${res.data.id} placed.`);
    } catch (error) {
      Alert.alert("Checkout", error.message);
    }
  };

  return (
    <View style={styles.wrap}>
      <Text style={[styles.title, { fontSize: metrics.titleSize }]}>Cart</Text>
      <Text style={styles.subtitle}>Review your items before placing the dummy order.</Text>
      <FlatList
        data={cart.items}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Image source={{ uri: resolveMediaUrl(item.image_url) }} style={styles.image} />
            <View style={styles.info}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.meta}>{item.quantity} x ${Number(item.price).toFixed(2)}</Text>
            </View>
          </View>
        )}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyText}>Your cart is empty.</Text></View>}
      />
      <View style={styles.summary}>
        <Text style={styles.totalLabel}>Order total</Text>
        <Text style={styles.total}>${Number(cart.total || 0).toFixed(2)}</Text>
        <TouchableOpacity style={[styles.primary, { minHeight: metrics.buttonHeight }]} onPress={checkout}><Text style={styles.primaryText}>Place Dummy Order</Text></TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: 16, backgroundColor: COLORS.bg },
  title: { fontWeight: "900", marginBottom: 6, color: COLORS.text },
  subtitle: { color: COLORS.textMuted, marginBottom: 14 },
  list: { gap: 10, paddingBottom: 14 },
  row: { flexDirection: "row", gap: 12, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: 18, padding: 12 },
  image: { width: 76, height: 76, borderRadius: 14, backgroundColor: COLORS.surfaceAlt },
  info: { flex: 1, justifyContent: "center" },
  name: { fontWeight: "900", fontSize: 16, color: COLORS.text },
  meta: { color: COLORS.textMuted, marginTop: 4 },
  empty: { paddingVertical: 28, alignItems: "center" },
  emptyText: { color: COLORS.textSoft, fontWeight: "800" },
  summary: { marginTop: 12, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.borderStrong, borderRadius: 18, padding: 14, gap: 12 },
  totalLabel: { color: COLORS.textSoft, fontWeight: "800" },
  total: { fontSize: 24, fontWeight: "900", color: COLORS.text },
  primary: { borderRadius: 16, backgroundColor: COLORS.accent, alignItems: "center", justifyContent: "center" },
  primaryText: { color: COLORS.text, fontWeight: "900" },
});
