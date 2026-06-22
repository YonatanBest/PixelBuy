import React from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { resolveMediaUrl } from "../api/apiClient";
import { COLORS, useAppMetrics } from "../theme";

export default function ProductCard({ product, onPress }) {
  const metrics = useAppMetrics();
  const stock = Number(product.stock || 0);
  const outOfStock = stock <= 0;
  const discount = product.original_price && Number(product.original_price) > Number(product.price)
    ? Math.round((1 - Number(product.price) / Number(product.original_price)) * 100)
    : 0;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress}>
      <View style={styles.imageWrap}>
        <Image source={{ uri: resolveMediaUrl(product.image_url) }} style={[styles.image, { height: metrics.imageHeight }]} />
        <View style={styles.badgeRow}>
          <Text style={styles.badge}>{product.brand}</Text>
          {discount > 0 && <Text style={styles.badgeAccent}>{discount}% off</Text>}
          {outOfStock && <Text style={styles.badgeDanger}>Out of stock</Text>}
        </View>
      </View>
      <View style={styles.body}>
        <View style={styles.metaRow}>
          <Text style={styles.category}>{product.category_name}</Text>
          <Text style={styles.stock}>{outOfStock ? "Sold out" : `${stock} in stock`}</Text>
        </View>
        <Text style={styles.name} numberOfLines={2}>{product.name}</Text>
        <Text style={styles.description} numberOfLines={2}>{product.description}</Text>
        <View style={styles.ratingRow}>
          <Text style={styles.rating}>★ {Number(product.rating || 0).toFixed(1)}</Text>
          <Text style={styles.count}>({Number(product.rating_count || 0).toLocaleString()})</Text>
        </View>
        <View style={styles.footer}>
          <View>
            <Text style={styles.price}>${Number(product.price).toFixed(2)}</Text>
            {product.original_price && <Text style={styles.original}>${Number(product.original_price).toFixed(2)}</Text>}
          </View>
          <Text style={styles.viewCta}>View details</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: COLORS.card, borderRadius: 18, overflow: "hidden", marginBottom: 14, borderWidth: 1, borderColor: COLORS.border, shadowColor: "#000", shadowOpacity: 0.14, shadowRadius: 16, shadowOffset: { width: 0, height: 10 }, elevation: 3 },
  imageWrap: { position: "relative" },
  image: { width: "100%" },
  badgeRow: { position: "absolute", left: 12, right: 12, top: 12, flexDirection: "row", flexWrap: "wrap", gap: 8 },
  badge: { color: COLORS.text, backgroundColor: "rgba(18,18,18,0.82)", borderWidth: 1, borderColor: COLORS.border, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, overflow: "hidden", fontSize: 11, fontWeight: "900" },
  badgeAccent: { color: COLORS.text, backgroundColor: "rgba(52,152,219,0.9)", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, overflow: "hidden", fontSize: 11, fontWeight: "900" },
  badgeDanger: { color: COLORS.text, backgroundColor: "rgba(255,77,77,0.9)", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, overflow: "hidden", fontSize: 11, fontWeight: "900" },
  body: { padding: 14, gap: 8 },
  metaRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 },
  category: { color: COLORS.accent, fontWeight: "900", textTransform: "uppercase", fontSize: 11, flex: 1 },
  stock: { color: COLORS.textSoft, fontWeight: "800", fontSize: 11 },
  name: { fontSize: 18, fontWeight: "900", color: COLORS.text, lineHeight: 22 },
  description: { color: COLORS.textMuted, lineHeight: 19, fontSize: 13 },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  rating: { color: COLORS.gold, fontWeight: "900" },
  count: { color: COLORS.textSoft, fontWeight: "700" },
  footer: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", gap: 10, marginTop: 2 },
  price: { fontSize: 18, fontWeight: "900", color: COLORS.text },
  original: { color: COLORS.textSoft, textDecorationLine: "line-through", fontSize: 12, marginTop: 2 },
  viewCta: { color: COLORS.accent, fontWeight: "900", fontSize: 12 },
});
