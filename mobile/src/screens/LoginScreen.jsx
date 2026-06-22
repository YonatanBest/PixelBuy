import React, { useState } from "react";
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useAuth } from "../context/AuthContext";
import { COLORS, useAppMetrics } from "../theme";

export default function LoginScreen({ go }) {
  const metrics = useAppMetrics();
  const { login, register } = useAuth();
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("student@smartshop.test");
  const [password, setPassword] = useState("password123");

  const submit = async () => {
    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await register(name, email, password);
      }
      go({ name: "products" });
    } catch (error) {
      Alert.alert("Account error", error.message);
    }
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>PixelBuy account</Text>
        <Text style={[styles.title, { fontSize: metrics.titleSize }]}>{mode === "login" ? "Welcome back." : "Create your account."}</Text>
        <Text style={styles.subtitle}>Sign in to sync your cart, keep shopping, and use Pixie AI on any device.</Text>
      </View>
      <View style={styles.card}>
        <View style={styles.toggleRow}>
          <TouchableOpacity style={[styles.toggle, mode === "login" && styles.toggleActive]} onPress={() => setMode("login")}><Text style={styles.toggleText}>Login</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.toggle, mode === "register" && styles.toggleActive]} onPress={() => setMode("register")}><Text style={styles.toggleText}>Register</Text></TouchableOpacity>
        </View>
        {mode === "register" && <TextInput style={[styles.input, { minHeight: metrics.inputHeight }]} value={name} onChangeText={setName} placeholder="Name" placeholderTextColor={COLORS.textSoft} />}
        <TextInput style={[styles.input, { minHeight: metrics.inputHeight }]} value={email} onChangeText={setEmail} autoCapitalize="none" placeholder="Email" placeholderTextColor={COLORS.textSoft} />
        <TextInput style={[styles.input, { minHeight: metrics.inputHeight }]} value={password} onChangeText={setPassword} secureTextEntry placeholder="Password" placeholderTextColor={COLORS.textSoft} />
        <TouchableOpacity style={[styles.primary, { minHeight: metrics.buttonHeight }]} onPress={submit}><Text style={styles.primaryText}>{mode === "login" ? "Login" : "Register"}</Text></TouchableOpacity>
        <TouchableOpacity onPress={() => setMode(mode === "login" ? "register" : "login")}><Text style={styles.link}>{mode === "login" ? "Create account" : "Use existing account"}</Text></TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: 16, justifyContent: "center", backgroundColor: COLORS.bg },
  hero: { marginBottom: 14 },
  eyebrow: { color: COLORS.accent, fontSize: 12, fontWeight: "900", textTransform: "uppercase", marginBottom: 8, letterSpacing: 1.1 },
  title: { fontWeight: "900", color: COLORS.text, lineHeight: 38 },
  subtitle: { color: COLORS.textMuted, marginTop: 8, lineHeight: 21 },
  card: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 22, padding: 16, gap: 12, shadowColor: "#000", shadowOpacity: 0.16, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 3 },
  toggleRow: { flexDirection: "row", gap: 10, marginBottom: 6 },
  toggle: { flex: 1, minHeight: 42, alignItems: "center", justifyContent: "center", borderRadius: 999, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border },
  toggleActive: { borderColor: COLORS.borderStrong, backgroundColor: "rgba(52,152,219,0.16)" },
  toggleText: { color: COLORS.text, fontWeight: "900" },
  input: { color: COLORS.text, backgroundColor: COLORS.surfaceAlt, borderWidth: 1, borderColor: COLORS.border, borderRadius: 16, paddingHorizontal: 14 },
  primary: { borderRadius: 16, backgroundColor: COLORS.accent, alignItems: "center", justifyContent: "center" },
  primaryText: { color: COLORS.text, fontWeight: "900" },
  link: { color: COLORS.accent, fontWeight: "800", textAlign: "center", paddingTop: 4 },
});
