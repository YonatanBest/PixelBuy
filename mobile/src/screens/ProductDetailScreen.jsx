import React, { useEffect, useState } from "react";
import { Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { api, resolveMediaUrl } from "../api/apiClient";
import { useAuth } from "../context/AuthContext";
import { useCart } from "../context/CartContext";
import { COLORS, useAppMetrics } from "../theme";

export default function ProductDetailScreen({ id, go }) {
  const metrics = useAppMetrics();
  const [product, setProduct] = useState(null);
  const { user } = useAuth();
  const { add } = useCart();

  useEffect(() => {
    api.product(id).then((res) => setProduct(res.data));
  }, [id]);

  if (!product) return <Text style={styles.loading}>Loading...</Text>;

  const addProduct = async () => {
    if (!user) return go({ name: "login" });
    try {
      await add(product.id);
      go({ name: "cart" });
    } catch (error) {
      Alert.alert("Cart", error.message);
    }
  };

  return (
    <ScrollView style={styles.wrap} contentContainerStyle={[styles.content, { paddingHorizontal: metrics.pagePadding }]}> 
      <View style={[styles.heroCard, { borderRadius: metrics.heroRadius }]}>
        <Image source={{ uri: resolveMediaUrl(product.image_url) }} style={[styles.image, { height: metrics.detailImageHeight, borderRadius: metrics.heroRadius - 2 }]} />
        <View style={styles.badges}>
          <Text style={styles.badge}>{product.brand}</Text>
          <Text style={styles.badgeAccent}>{product.category_name}</Text>
        </View>
      </View>
      <Text style={styles.title}>{product.name}</Text>
      <Text style={styles.rating}>★ {Number(product.rating || 0).toFixed(1)} from {Number(product.rating_count || 0).toLocaleString()} ratings</Text>
      <Text style={styles.description}>{product.description}</Text>
      <View style={styles.buyBox}>
        <View>
          <Text style={styles.price}>${Number(product.price).toFixed(2)}</Text>
          {product.original_price && <Text style={styles.original}>${Number(product.original_price).toFixed(2)}</Text>}
        </View>
        <TouchableOpacity style={styles.primary} onPress={addProduct}><Text style={styles.primaryText}>Add to Cart</Text></TouchableOpacity>
      </View>
      <Text style={styles.section}>Key Features</Text>
      <View style={styles.pillWrap}>
        {(product.highlights || []).map((item) => <Text key={item} style={styles.pill}>{item}</Text>)}
      </View>
      <Text style={styles.section}>Specs</Text>
      {Object.entries(product.specs || {}).map(([key, value]) => <Text key={key} style={styles.spec}>{key}: {value}</Text>)}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: COLORS.bg },
  content: { paddingTop: 16, paddingBottom: 32 },
  loading: { flex: 1, padding: 16, color: COLORS.text, backgroundColor: COLORS.bg },
  heroCard: { position: "relative", overflow: "hidden", borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface, marginBottom: 14 },
  image: { width: "100%" },
  badges: { position: "absolute", left: 12, right: 12, top: 12, flexDirection: "row", flexWrap: "wrap", gap: 8 },
  badge: { color: COLORS.text, backgroundColor: "rgba(18,18,18,0.82)", borderWidth: 1, borderColor: COLORS.border, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, overflow: "hidden", fontSize: 11, fontWeight: "900" },
  badgeAccent: { color: COLORS.text, backgroundColor: "rgba(52,152,219,0.95)", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, overflow: "hidden", fontSize: 11, fontWeight: "900" },
  title: { fontSize: 30, fontWeight: "900", color: COLORS.text, marginTop: 6, marginBottom: 10, lineHeight: 34 },
  description: { fontSize: 15, color: COLORS.textMuted, lineHeight: 24 },
  rating: { color: COLORS.gold, fontWeight: "900", marginBottom: 10 },
  buyBox: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.borderStrong, borderRadius: 18, padding: 14, gap: 12, marginVertical: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  price: { fontSize: 26, fontWeight: "900", color: COLORS.text },
  original: { color: COLORS.textSoft, textDecorationLine: "line-through", marginTop: 2 },
  section: { fontSize: 18, fontWeight: "900", color: COLORS.text, marginTop: 14, marginBottom: 10 },
  pillWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  pill: { color: COLORS.text, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, overflow: "hidden", fontSize: 12, fontWeight: "800" },
  spec: { color: COLORS.text, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: 14, padding: 12, marginBottom: 8, lineHeight: 20 },
  primary: { minHeight: 48, borderRadius: 14, backgroundColor: COLORS.accent, alignItems: "center", justifyContent: "center", paddingHorizontal: 18 },
  primaryText: { color: COLORS.text, fontWeight: "900" },
});
