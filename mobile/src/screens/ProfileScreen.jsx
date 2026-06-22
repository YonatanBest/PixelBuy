import React from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { COLORS, useAppMetrics } from "../theme";

export default function ProfileScreen({ go }) {
  const metrics = useAppMetrics();
  const { user, logout } = useAuth();
  const { cart } = useCart();

  const handleLogout = async () => {
    try {
      await logout();
      go({ name: "products" });
    } catch (error) {
      Alert.alert("Logout", error.message);
    }
  };

  if (!user) {
    return (
      <View style={styles.wrap}>
        <View style={styles.card}>
          <Text style={styles.title}>Login required</Text>
          <Text style={styles.subtitle}>Sign in to see your orders, cart, and account actions.</Text>
          <Pressable style={styles.primary} onPress={() => go({ name: "login" })}>
            <Text style={styles.primaryText}>Login</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>Account</Text>
        <Text style={[styles.title, { fontSize: metrics.titleSize }]}>{user.name}</Text>
        <Text style={styles.subtitle}>{user.email}</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Role</Text>
          <Text style={styles.detailValue}>{user.role === "admin" ? "Administrator" : "Customer"}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Cart</Text>
          <Text style={styles.detailValue}>{Number(cart?.item_count || 0)} items</Text>
        </View>
      </View>

      <View style={styles.actions}>
        <Pressable style={styles.actionCard} onPress={() => go({ name: "orders" })}>
          <Text style={styles.actionTitle}>Orders</Text>
          <Text style={styles.actionText}>See products you bought</Text>
        </Pressable>
        <Pressable style={styles.actionCard} onPress={() => go({ name: "cart" })}>
          <Text style={styles.actionTitle}>Cart</Text>
          <Text style={styles.actionText}>{Number(cart?.item_count || 0)} item(s) waiting</Text>
        </Pressable>
        <Pressable style={[styles.actionCard, styles.actionDanger]} onPress={handleLogout}>
          <Text style={styles.actionTitle}>Logout</Text>
          <Text style={styles.actionText}>End this session on the device</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: 16, backgroundColor: COLORS.bg, gap: 14 },
  hero: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 22, padding: 18 },
  eyebrow: { color: COLORS.accent, fontSize: 12, fontWeight: "900", textTransform: "uppercase", letterSpacing: 1.1, marginBottom: 8 },
  title: { color: COLORS.text, fontWeight: "900", lineHeight: 36 },
  subtitle: { color: COLORS.textMuted, marginTop: 6, lineHeight: 20 },
  card: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 20, padding: 16, gap: 12 },
  detailRow: { flexDirection: "row", justifyContent: "space-between", gap: 10 },
  detailLabel: { color: COLORS.textSoft, fontWeight: "700" },
  detailValue: { color: COLORS.text, fontWeight: "900" },
  actions: { gap: 10 },
  actionCard: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: 18, padding: 16 },
  actionDanger: { borderColor: "rgba(255,77,77,0.35)" },
  actionTitle: { color: COLORS.text, fontSize: 16, fontWeight: "900", marginBottom: 4 },
  actionText: { color: COLORS.textMuted, lineHeight: 19 },
  primary: { minHeight: 46, borderRadius: 16, backgroundColor: COLORS.accent, alignItems: "center", justifyContent: "center" },
  primaryText: { color: COLORS.text, fontWeight: "900" },
});