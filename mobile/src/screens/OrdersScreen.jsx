import React, { useEffect, useState } from "react";
import { Alert, FlatList, StyleSheet, Text, View } from "react-native";
import { api } from "../api/apiClient";
import { COLORS, useAppMetrics } from "../theme";

export default function OrdersScreen() {
  const metrics = useAppMetrics();
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    api.orders()
      .then((res) => setOrders(res.data || []))
      .catch((error) => Alert.alert("Orders", error.message));
  }, []);

  return (
    <View style={styles.wrap}>
      <Text style={[styles.title, { fontSize: metrics.titleSize }]}>Orders</Text>
      <FlatList
        data={orders}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyText}>No orders yet.</Text></View>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.orderId}>Order #{item.id}</Text>
              <Text style={styles.status}>{item.status}</Text>
            </View>
            <Text style={styles.meta}>{new Date(item.created_at).toLocaleString()}</Text>
            <Text style={styles.total}>${Number(item.total || 0).toFixed(2)}</Text>
            <Text style={styles.meta}>{Number(item.items?.length || 0)} item(s)</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: 16, backgroundColor: COLORS.bg },
  title: { color: COLORS.text, fontWeight: "900", marginBottom: 14 },
  list: { gap: 10, paddingBottom: 16 },
  card: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 18, padding: 14, gap: 8 },
  row: { flexDirection: "row", justifyContent: "space-between", gap: 10 },
  orderId: { color: COLORS.text, fontWeight: "900" },
  status: { color: COLORS.accent, fontWeight: "900", textTransform: "capitalize" },
  meta: { color: COLORS.textMuted },
  total: { color: COLORS.text, fontSize: 20, fontWeight: "900" },
  empty: { paddingVertical: 28, alignItems: "center" },
  emptyText: { color: COLORS.textSoft, fontWeight: "800" },
});