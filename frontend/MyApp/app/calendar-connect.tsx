import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { useAppState } from "../context/app-state";

type AuthMode = "signup" | "login";

export default function CalendarConnectScreen() {
  const router = useRouter();
  const { registerLocalAccount, loginLocalAccount } = useAppState();
  const [mode, setMode] = useState<AuthMode>("signup");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = () => {
    const result =
      mode === "signup"
        ? registerLocalAccount(fullName, email, password)
        : loginLocalAccount(email, password);

    if (!result.ok) {
      setErrorMessage(result.message ?? "Unable to continue.");
      return;
    }

    setErrorMessage(null);
    router.replace("/(tabs)/navigation");
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Pressable style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backText}>Back</Text>
      </Pressable>

      <Text style={styles.title}>Create Account Or Log In</Text>
      <Text style={styles.subtitle}>
        Use a simple email and password to save a personal class schedule, then add, edit, or delete
        classes directly inside the app.
      </Text>

      <View style={styles.toggleRow}>
        <Pressable
          style={[styles.toggleButton, mode === "signup" && styles.toggleButtonActive]}
          onPress={() => setMode("signup")}>
          <Text style={mode === "signup" ? styles.toggleTextActive : styles.toggleText}>Sign Up</Text>
        </Pressable>
        <Pressable
          style={[styles.toggleButton, mode === "login" && styles.toggleButtonActive]}
          onPress={() => setMode("login")}>
          <Text style={mode === "login" ? styles.toggleTextActive : styles.toggleText}>Log In</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        {mode === "signup" ? (
          <>
            <Text style={styles.label}>Full Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Student Name"
              placeholderTextColor="#5b6294"
              value={fullName}
              onChangeText={setFullName}
            />
          </>
        ) : null}

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="student@email.com"
          placeholderTextColor="#5b6294"
          value={email}
          onChangeText={setEmail}
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          secureTextEntry
          placeholder="Password"
          placeholderTextColor="#5b6294"
          value={password}
          onChangeText={setPassword}
        />

        <Pressable style={styles.primaryButton} onPress={handleSubmit}>
          <Text style={styles.primaryButtonText}>{mode === "signup" ? "Create Account" : "Log In"}</Text>
        </Pressable>

        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>How this works</Text>
        <Text style={styles.infoText}>Accounts are app-local for now, not connected to an external backend.</Text>
        <Text style={styles.infoText}>New accounts start with your imported timetable so you can edit from there.</Text>
        <Text style={styles.infoText}>You can add, update, or delete classes from the Schedule tab after login.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f7f0d7",
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 56,
    paddingBottom: 40,
    gap: 18,
  },
  backButton: {
    alignSelf: "flex-start",
  },
  backText: {
    color: "#2c3ea3",
    fontWeight: "700",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#0b0b0b",
  },
  subtitle: {
    color: "#31406b",
    lineHeight: 22,
  },
  toggleRow: {
    flexDirection: "row",
    gap: 10,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: "#fff",
    alignItems: "center",
  },
  toggleButtonActive: {
    backgroundColor: "#2c3ea3",
  },
  toggleText: {
    color: "#2c3ea3",
    fontWeight: "700",
  },
  toggleTextActive: {
    color: "#f3d400",
    fontWeight: "700",
  },
  card: {
    backgroundColor: "#6f7fd4",
    borderRadius: 20,
    padding: 18,
    gap: 12,
  },
  label: {
    color: "#f7f0d7",
    fontWeight: "700",
    fontSize: 14,
  },
  input: {
    backgroundColor: "#f7f0d7",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: "#17204f",
  },
  primaryButton: {
    backgroundColor: "#f3d400",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginTop: 8,
  },
  primaryButtonText: {
    color: "#1a2060",
    fontWeight: "700",
    textAlign: "center",
  },
  errorText: {
    color: "#fff5c2",
    lineHeight: 20,
  },
  infoCard: {
    backgroundColor: "#fff5c2",
    borderRadius: 18,
    padding: 18,
    gap: 10,
  },
  infoTitle: {
    color: "#2c3ea3",
    fontWeight: "700",
    fontSize: 18,
  },
  infoText: {
    color: "#26315e",
    lineHeight: 20,
  },
});
