import React, { useEffect, useState } from "react";
import { Alert, FlatList, ImageBackground, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { api } from "../api/apiClient";
import ProductCard from "../components/ProductCard";
import { COLORS, useAppMetrics } from "../theme";

export default function ProductListScreen({ go }) {
  const metrics = useAppMetrics();
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");

  const load = async (term = "") => {
    try {
      const res = await api.products(term);
      setProducts(res.data);
    } catch (error) {
      Alert.alert("Products", error.message);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <FlatList
      data={products}
      keyExtractor={(item) => String(item.id)}
      renderItem={({ item }) => <ProductCard product={item} onPress={() => go({ name: "detail", id: item.id })} />}
      contentContainerStyle={[styles.content, { paddingHorizontal: metrics.pagePadding }]}
      ListHeaderComponent={
        <>
          <ImageBackground
            source={{ uri: "https://images.unsplash.com/photo-1550009158-9ebf69173e03?auto=format&fit=crop&w=1600&q=85" }}
            style={[styles.hero, { borderRadius: metrics.heroRadius }]}
            imageStyle={{ borderRadius: metrics.heroRadius }}
          >
            <View style={styles.heroOverlay} />
            <View style={styles.heroContent}>
              <Text style={styles.eyebrow}>PixelBuy live tech store</Text>
              <Text style={[styles.title, { fontSize: metrics.heroTitleSize }]}>Real devices. Smarter buys.</Text>
              <Text style={[styles.subtitle, { fontSize: metrics.subtitleSize }]}>Shop phones, laptops, gaming gear, audio, cameras, and smart-home tech with Pixie, your live AI buying assistant.</Text>
              <View style={styles.statsRow}>
                <View style={styles.statCard}><Text style={styles.statValue}>{products.length || 24}+</Text><Text style={styles.statLabel}>Devices</Text></View>
                <View style={styles.statCard}><Text style={styles.statValue}>AI</Text><Text style={styles.statLabel}>Shopping help</Text></View>
                <View style={styles.statCard}><Text style={styles.statValue}>Live</Text><Text style={styles.statLabel}>Backend sync</Text></View>
              </View>
              <View style={styles.heroChips}>
                <Text style={styles.heroChip}>Pixie AI</Text>
                <Text style={styles.heroChip}>Real specs</Text>
                <Text style={styles.heroChip}>Demo checkout</Text>
              </View>
            </View>
          </ImageBackground>

          <View style={styles.searchCard}>
            <TextInput
              style={[styles.searchInput, { minHeight: metrics.inputHeight }]}
              value={search}
              onChangeText={setSearch}
              placeholder="Search laptops, phones, audio..."
              placeholderTextColor={COLORS.textSoft}
            />
            <TouchableOpacity style={[styles.button, { minHeight: metrics.buttonHeight }]} onPress={() => load(search)}>
              <Text style={styles.buttonText}>Search</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.quickRow}>
            {["gaming laptop", "headphones", "phone"].map((term) => (
              <TouchableOpacity key={term} style={styles.quickButton} onPress={() => { setSearch(term); load(term); }}>
                <Text style={styles.quickText}>{term}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.sectionTitle}>Featured products</Text>
        </>
      }
    />
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 24, backgroundColor: COLORS.bg },
  hero: { minHeight: 420, overflow: "hidden", marginTop: 6, marginBottom: 16, borderWidth: 1, borderColor: COLORS.border, justifyContent: "flex-end" },
  heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(18,18,18,0.7)" },
  heroContent: { padding: 18 },
  eyebrow: { color: COLORS.accent, fontSize: 12, fontWeight: "900", textTransform: "uppercase", marginBottom: 8, letterSpacing: 1.2 },
  title: { fontWeight: "900", marginBottom: 10, color: COLORS.text, lineHeight: 40 },
  subtitle: { color: COLORS.textMuted, marginBottom: 12, fontWeight: "700", lineHeight: 21 },
  statsRow: { flexDirection: "row", gap: 8, marginBottom: 12, flexWrap: "wrap" },
  statCard: { minWidth: 92, flex: 1, backgroundColor: "rgba(18,18,18,0.72)", borderWidth: 1, borderColor: COLORS.border, borderRadius: 16, padding: 12 },
  statValue: { color: COLORS.text, fontWeight: "900", fontSize: 16 },
  statLabel: { color: COLORS.textSoft, fontSize: 11, marginTop: 4, fontWeight: "700" },
  heroChips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 6 },
  heroChip: { color: COLORS.text, backgroundColor: COLORS.cardStrong, borderWidth: 1, borderColor: COLORS.border, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, overflow: "hidden", fontSize: 12, fontWeight: "900" },
  searchCard: { flexDirection: "row", gap: 10, marginBottom: 12, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 18, padding: 10 },
  searchInput: { flex: 1, color: COLORS.text, backgroundColor: COLORS.surfaceAlt, borderWidth: 1, borderColor: COLORS.border, borderRadius: 14, paddingHorizontal: 14 },
  button: { backgroundColor: COLORS.accent, borderRadius: 14, paddingHorizontal: 16, justifyContent: "center" },
  buttonText: { color: COLORS.text, fontWeight: "900" },
  quickRow: { flexDirection: "row", gap: 8, marginBottom: 16, flexWrap: "wrap" },
  quickButton: { flexGrow: 1, minHeight: 40, borderRadius: 999, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: 14, alignItems: "center", justifyContent: "center" },
  quickText: { color: COLORS.textMuted, fontSize: 12, fontWeight: "900", textTransform: "capitalize" },
  sectionTitle: { color: COLORS.text, fontSize: 18, fontWeight: "900", marginBottom: 12 },
});
