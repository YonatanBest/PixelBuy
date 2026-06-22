import React, { useEffect, useMemo, useRef, useState } from "react";
import { Alert, FlatList, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from "expo-speech-recognition";
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system";
import { api, resolveLiveWsUrl } from "../api/apiClient";
import { useAuth } from "../context/AuthContext";
import { COLORS, useAppMetrics } from "../theme";

const LIVE_WS_URL = process.env.EXPO_PUBLIC_LIVE_WS_URL;

function createSessionId() {
  return `mobile_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export default function AiAssistantScreen() {
  const metrics = useAppMetrics();
  const initialSession = useMemo(createSessionId, []);
  const [sessionId, setSessionId] = useState(initialSession);
  const [knownSessions, setKnownSessions] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [message, setMessage] = useState("");
  const [connected, setConnected] = useState(false);
  const [listening, setListening] = useState(false);
  const [busy, setBusy] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [micMuted, setMicMuted] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [speaking, setSpeaking] = useState(false);
  const [chat, setChat] = useState([]);
  const { user } = useAuth();
  const wsRef = useRef(null);
  const micMutedRef = useRef(false);
  const audioEnabledRef = useRef(true);
  const listeningRef = useRef(false);
  const restartMicTimerRef = useRef(null);
  const speakingRef = useRef(false);
  const audioQueueRef = useRef([]);
  const audioSoundRef = useRef(null);
  const audioFileRef = useRef(null);
  const audioPlayingRef = useRef(false);
  const currentSessionRef = useRef(initialSession);
  const busyRef = useRef(false);
  const sessionSignature = knownSessions.join(",");

  useEffect(() => {
    currentSessionRef.current = sessionId;
  }, [sessionId]);

  useEffect(() => {
    busyRef.current = busy;
  }, [busy]);

  useEffect(() => {
    audioEnabledRef.current = audioEnabled;
    if (!audioEnabled) {
      audioQueueRef.current = [];
      audioSoundRef.current?.unloadAsync().catch(() => {});
      audioSoundRef.current = null;
      if (audioFileRef.current) {
        FileSystem.deleteAsync(audioFileRef.current, { idempotent: true }).catch(() => {});
        audioFileRef.current = null;
      }
      audioPlayingRef.current = false;
      speakingRef.current = false;
      setSpeaking(false);
    }
  }, [audioEnabled]);

  useEffect(() => {
    Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    }).catch(() => {});
  }, []);

  const getAndroidRecognitionServicePackage = () => {
    if (Platform.OS !== "android") {
      return undefined;
    }

    try {
      const availableServices = ExpoSpeechRecognitionModule.getSpeechRecognitionServices();
      const preferredPackages = [
        "com.google.android.as",
        "com.google.android.tts",
        "com.google.android.googlequicksearchbox",
      ];
      return preferredPackages.find((packageName) => availableServices.includes(packageName)) || ExpoSpeechRecognitionModule.getDefaultRecognitionService().packageName || undefined;
    } catch {
      return ExpoSpeechRecognitionModule.getDefaultRecognitionService().packageName || undefined;
    }
  };

  const ensureMicrophonePermission = async () => {
    const currentPermission = await ExpoSpeechRecognitionModule.getMicrophonePermissionsAsync();
    if (currentPermission.granted) {
      return true;
    }

    const requestedPermission = await ExpoSpeechRecognitionModule.requestMicrophonePermissionsAsync();
    return Boolean(requestedPermission.granted);
  };

  const queueMicRestart = (delay = 0) => {
    clearTimeout(restartMicTimerRef.current);
    if (micMutedRef.current) return;
    restartMicTimerRef.current = setTimeout(() => {
      if (!micMutedRef.current) {
        startListening();
      }
    }, delay);
  };

  const playNextAudioChunk = async () => {
    if (audioPlayingRef.current || !audioEnabledRef.current) return;
    const nextChunk = audioQueueRef.current.shift();
    if (!nextChunk) {
      setSpeaking(false);
      speakingRef.current = false;
      if (!micMutedRef.current) {
        queueMicRestart(250);
      }
      return;
    }

    audioPlayingRef.current = true;
    speakingRef.current = true;
    setSpeaking(true);
    try {
      ExpoSpeechRecognitionModule.stop();
    } catch {
      // Ignore stop failures.
    }
    listeningRef.current = false;
    setListening(false);

    try {
      if (audioSoundRef.current) {
        await audioSoundRef.current.unloadAsync().catch(() => {});
        audioSoundRef.current = null;
      }

      const fileExt = (nextChunk.mime_type || "audio/wav").includes("wav") ? "wav" : "mp3";
      const fileUri = `${FileSystem.cacheDirectory}pixie-voice-${Date.now()}-${Math.random().toString(16).slice(2)}.${fileExt}`;
      await FileSystem.writeAsStringAsync(fileUri, nextChunk.data, {
        encoding: FileSystem.EncodingType.Base64,
      });
      audioFileRef.current = fileUri;

      const { sound } = await Audio.Sound.createAsync(
        { uri: fileUri },
        { shouldPlay: true },
        async (status) => {
          if (!status?.isLoaded) {
            if (status?.error) {
              audioPlayingRef.current = false;
              speakingRef.current = false;
              setSpeaking(false);
              audioSoundRef.current = null;
              if (audioFileRef.current) {
                FileSystem.deleteAsync(audioFileRef.current, { idempotent: true }).catch(() => {});
                audioFileRef.current = null;
              }
              if (audioQueueRef.current.length) {
                playNextAudioChunk();
              } else if (!micMutedRef.current) {
                queueMicRestart(250);
              }
            }
            return;
          }

          if (status.didJustFinish) {
            audioPlayingRef.current = false;
            speakingRef.current = false;
            setSpeaking(false);
            audioSoundRef.current = null;
            if (audioFileRef.current) {
              FileSystem.deleteAsync(audioFileRef.current, { idempotent: true }).catch(() => {});
              audioFileRef.current = null;
            }
            if (audioQueueRef.current.length) {
              playNextAudioChunk();
            } else if (!micMutedRef.current) {
              queueMicRestart(250);
            }
          }
        }
      );

      audioSoundRef.current = sound;
    } catch {
      audioPlayingRef.current = false;
      speakingRef.current = false;
      setSpeaking(false);
      if (audioFileRef.current) {
        FileSystem.deleteAsync(audioFileRef.current, { idempotent: true }).catch(() => {});
        audioFileRef.current = null;
      }
      if (audioQueueRef.current.length) {
        playNextAudioChunk();
      } else if (!micMutedRef.current) {
        queueMicRestart(250);
      }
    }
  };

  useSpeechRecognitionEvent("start", () => {
    listeningRef.current = true;
    setListening(true);
  });
  useSpeechRecognitionEvent("end", () => {
    listeningRef.current = false;
    setListening(false);
    queueMicRestart(350);
  });
  useSpeechRecognitionEvent("result", (event) => {
    const transcript = event.results?.[0]?.transcript || "";
    if (transcript) {
      if (busyRef.current) {
        setMessage("");
        return;
      }
      setMessage(transcript);
      sendText(transcript);
    }
  });
  useSpeechRecognitionEvent("error", () => {
    listeningRef.current = false;
    setListening(false);
    queueMicRestart(700);
  });

  useEffect(() => {
    let active = true;
    api.aiSessions(knownSessions)
      .then((res) => {
        if (!active) return;
        const fromApi = res.sessions || [];
        setSessions(fromApi);
        setKnownSessions(fromApi.map((item) => item.session_key));
      })
      .catch(() => {
        if (active) {
          setSessions([]);
        }
      });
    return () => {
      active = false;
    };
  }, [sessionSignature, user?.id]);

  useEffect(() => {
    let active = true;
    if (!knownSessions.includes(sessionId)) {
      setChat([]);
      setStreamingText("");
      return () => {
        active = false;
      };
    }

    setChat([]);
    setStreamingText("");
    api.aiHistory(sessionId)
      .then((res) => {
        if (!active) return;
        setChat((res.history || []).map((item) => ({
          from: item.role === "assistant" ? "ai" : "user",
          text: item.content,
          actions: item.actions || [],
        })));
      })
      .catch(() => active && setChat([]));
    return () => {
      active = false;
    };
  }, [sessionId]);

  useEffect(() => {
    setConnected(false);
    setBusy(false);
    setStreamingText("");
    const userParam = user?.id ? `&user_id=${encodeURIComponent(user.id)}` : "";
    const wsUrl = LIVE_WS_URL || resolveLiveWsUrl("/ws");
    const ws = new WebSocket(`${wsUrl}?session_id=${encodeURIComponent(sessionId)}${userParam}`);
    const wsSessionId = sessionId;
    wsRef.current = ws;

    const isCurrentSocket = () => currentSessionRef.current === wsSessionId && wsRef.current === ws;

    ws.onopen = () => {
      if (isCurrentSocket()) setConnected(true);
    };
    ws.onclose = () => {
      if (isCurrentSocket()) setConnected(false);
    };
    ws.onerror = () => {
      if (isCurrentSocket()) setConnected(false);
    };
    ws.onmessage = (event) => {
      const payload = JSON.parse(event.data);
      if (payload.type === "connected" && isCurrentSocket()) setConnected(true);
      if (payload.type === "status") {
        if (isCurrentSocket()) {
          const isThinking = payload.status === "thinking";
          busyRef.current = isThinking;
          setBusy(isThinking);
          setStreamingText("");
        }
      }
      if (payload.type === "delta") {
        if (isCurrentSocket()) {
          setStreamingText((text) => `${text}${payload.text || ""}`);
        }
      }
      if (payload.type === "audio") {
        if (isCurrentSocket() && audioEnabledRef.current && payload.data) {
          if (payload.mime_type && !String(payload.mime_type).includes("wav")) {
            // Keep the mobile decoder on a predictable format.
          }
          audioQueueRef.current.push({ data: payload.data, mime_type: payload.mime_type });
          playNextAudioChunk();
        }
      }
      if (payload.type === "final") {
        if (isCurrentSocket()) {
          busyRef.current = false;
          setBusy(false);
          setStreamingText("");
          setChat((items) => [...items, { from: "ai", text: payload.reply, actions: payload.actions || [] }]);
          if (payload.title) {
            setSessions((items) => {
              const withoutActive = items.filter((item) => item.session_key !== wsSessionId);
              return [
                {
                  session_key: wsSessionId,
                  title: payload.title,
                  message_count: 2,
                },
                ...withoutActive,
              ].slice(0, 30);
            });
          }
          refreshKnown(wsSessionId);
        }
        if (ws.closeAfterFinal) {
          ws.close();
        }
      }
      if (payload.type === "error") {
        if (isCurrentSocket()) {
          busyRef.current = false;
          setBusy(false);
          setStreamingText("");
          setChat((items) => [...items, { from: "ai", text: payload.message }]);
        }
        if (ws.closeAfterFinal) {
          ws.close();
        }
      }
    };
    return () => {
      if (!ws.closeAfterFinal) {
        ws.close();
      }
    };
  }, [sessionId, user?.id]);

  const startListening = async () => {
    try {
      if (micMutedRef.current) {
        return;
      }

      if (!(await ensureMicrophonePermission())) {
        setMicMuted(true);
        micMutedRef.current = true;
        Alert.alert("Mic permission needed", "Enable microphone access in Android settings to use voice input.");
        return;
      }

      const available = ExpoSpeechRecognitionModule.isRecognitionAvailable();
      if (!available || micMutedRef.current || listeningRef.current) return;
      clearTimeout(restartMicTimerRef.current);
      ExpoSpeechRecognitionModule.start({
        lang: "en-US",
        interimResults: true,
        continuous: Platform.OS === "android" ? Number(Platform.Version) >= 33 : true,
        androidRecognitionServicePackage: getAndroidRecognitionServicePackage(),
      });
    } catch {
      listeningRef.current = false;
      setListening(false);
    }
  };

  useEffect(() => {
    micMutedRef.current = micMuted;
    if (micMuted) {
      clearTimeout(restartMicTimerRef.current);
      listeningRef.current = false;
      ExpoSpeechRecognitionModule.stop();
    } else {
      startListening();
    }
    return () => clearTimeout(restartMicTimerRef.current);
  }, [micMuted]);

  const refreshKnown = (nextSessionId) => {
    setKnownSessions((items) => Array.from(new Set([nextSessionId, ...items])).slice(0, 30));
  };

  const switchSession = (nextSessionId) => {
    if (!nextSessionId || nextSessionId === sessionId) return;
    const currentWs = wsRef.current;
    if (busyRef.current && currentWs?.readyState === WebSocket.OPEN) {
      currentWs.closeAfterFinal = true;
    } else {
      currentWs?.close();
    }
    setMessage("");
    setBusy(false);
    setStreamingText("");
    setSessionId(nextSessionId);
  };

  const newSession = () => {
    switchSession(createSessionId());
  };

  const sendText = (text) => {
    const clean = text.trim();
    if (!clean || busyRef.current) return;
    const activeSessionId = currentSessionRef.current;
    setBusy(true);
    busyRef.current = true;
    setStreamingText("");
    setChat((items) => [...items, { from: "user", text: clean }]);
    refreshKnown(activeSessionId);
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "message", message: clean }));
    } else {
      setBusy(false);
      busyRef.current = false;
      Alert.alert("Pixie AI", "Pixie is offline. Start the live websocket server.");
    }
  };

  const send = async () => {
    if (!message.trim()) return;
    const text = message;
    setMessage("");
    sendText(text);
  };

  const quickPrompts = ["Recommend a laptop", "Compare phones", "Add headphones to cart"];

  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <View>
          <Text style={[styles.title, { fontSize: metrics.titleSize }]}>Pixie AI</Text>
          <Text style={styles.status}>{connected ? "Pixie connected" : "Start the live websocket server"}</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={[styles.iconButton, audioEnabled ? styles.iconActive : styles.iconMuted]} onPress={() => setAudioEnabled((value) => !value)}>
            <Text style={styles.iconButtonText}>{audioEnabled ? "Voice on" : "Voice off"}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.newButton} onPress={newSession}><Text style={styles.newButtonText}>New</Text></TouchableOpacity>
        </View>
      </View>

      <View style={styles.statusStrip}>
        <Text style={styles.statusPill}>{connected ? "Live" : "Offline"}</Text>
        <Text style={styles.statusPill}>{audioEnabled ? "Voice on" : "Voice muted"}</Text>
        <Text style={styles.statusPill}>{micMuted ? "Mic muted" : speaking ? "Speaking" : listening ? "Listening" : "Mic ready"}</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sessions} contentContainerStyle={styles.sessionContent}>
        {sessions.map((item) => (
          <TouchableOpacity key={item.session_key} style={[styles.sessionChip, item.session_key === sessionId && styles.sessionSelected]} onPress={() => switchSession(item.session_key)}>
            <Text numberOfLines={1} style={styles.sessionTitle}>{item.title || "Shopping chat"}</Text>
            <Text style={styles.sessionCount}>{Number(item.message_count || 0)} messages</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.controlRow}>
        <TouchableOpacity style={[styles.micToggle, micMuted ? styles.muted : styles.live]} onPress={() => setMicMuted((value) => !value)}>
          <Text style={styles.micText}>{micMuted ? "Mic muted" : listening ? "Listening" : "Mic ready"}</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        style={styles.messages}
        data={[...chat, ...(busy || streamingText ? [{ from: "ai", text: streamingText || "Pixie is thinking..." }] : [])]}
        keyExtractor={(_, index) => String(index)}
        renderItem={({ item }) => (
          <View style={[styles.bubbleWrap, item.from === "user" ? styles.userWrap : styles.aiWrap]}>
            <Text style={[styles.bubble, item.from === "user" ? styles.userBubble : styles.aiBubble]}>{item.text}</Text>
            {(item.actions || []).map((action, index) => (
              <Text key={index} style={[styles.actionPill, action.success ? styles.actionSuccess : styles.actionFailed]}>{action.message || action.type}</Text>
            ))}
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>Ask me what to buy, compare products, update your cart, or explain features.</Text>}
      />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickPrompts} contentContainerStyle={styles.quickContent}>
        {quickPrompts.map((prompt) => (
          <TouchableOpacity key={prompt} style={styles.quickButton} onPress={() => sendText(prompt)} disabled={busy}>
            <Text style={styles.quickText}>{prompt}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={message}
          onChangeText={setMessage}
          placeholder="I need a cheap phone..."
          placeholderTextColor={COLORS.textSoft}
          multiline
        />
        <TouchableOpacity style={styles.button} onPress={send} disabled={busy}><Text style={styles.buttonText}>Send</Text></TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: 16, backgroundColor: COLORS.bg },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 8 },
  headerActions: { flexDirection: "row", gap: 8, alignItems: "center" },
  title: { fontWeight: "900", marginBottom: 6, color: COLORS.text },
  status: { color: COLORS.accent, fontWeight: "800", marginBottom: 10 },
  newButton: { minHeight: 38, paddingHorizontal: 14, borderRadius: 16, backgroundColor: COLORS.accent, justifyContent: "center" },
  newButtonText: { color: COLORS.text, fontWeight: "900" },
  iconButton: { minHeight: 38, paddingHorizontal: 12, borderRadius: 16, justifyContent: "center", borderWidth: 1 },
  iconActive: { backgroundColor: "rgba(34,197,94,0.14)", borderColor: "rgba(34,197,94,0.45)" },
  iconMuted: { backgroundColor: COLORS.card, borderColor: COLORS.border },
  iconButtonText: { color: COLORS.text, fontSize: 12, fontWeight: "900" },
  statusStrip: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 },
  statusPill: { color: COLORS.text, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, overflow: "hidden", fontSize: 11, fontWeight: "900" },
  sessions: { maxHeight: 92, marginBottom: 10 },
  sessionContent: { gap: 10, paddingRight: 4 },
  sessionChip: { width: Platform.OS === "web" ? 180 : 210, padding: 14, borderRadius: 18, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border },
  sessionSelected: { borderColor: COLORS.borderStrong, backgroundColor: "rgba(52,152,219,0.16)" },
  sessionTitle: { color: COLORS.text, fontWeight: "900", fontSize: 13 },
  sessionCount: { color: COLORS.textSoft, fontWeight: "800", fontSize: 11, marginTop: 4 },
  controlRow: { marginBottom: 12 },
  micToggle: { borderRadius: 18, paddingVertical: 12, paddingHorizontal: 14, alignItems: "center", borderWidth: 1 },
  live: { backgroundColor: "rgba(34,197,94,0.14)", borderColor: "rgba(34,197,94,0.45)" },
  muted: { backgroundColor: "rgba(255,77,77,0.13)", borderColor: "rgba(255,77,77,0.45)" },
  micText: { fontWeight: "900", color: COLORS.text },
  messages: { flex: 1 },
  empty: { color: COLORS.textMuted, padding: 14, borderRadius: 18, backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border },
  bubbleWrap: { maxWidth: "88%", marginBottom: 8, gap: 5 },
  aiWrap: { alignSelf: "flex-start" },
  userWrap: { alignSelf: "flex-end" },
  bubble: { padding: 12, borderRadius: 18, lineHeight: 20 },
  aiBubble: { backgroundColor: COLORS.cardStrong, color: COLORS.text, borderWidth: 1, borderColor: COLORS.border },
  userBubble: { backgroundColor: COLORS.accent, color: COLORS.text },
  actionPill: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 5, overflow: "hidden", fontSize: 11, fontWeight: "900" },
  actionSuccess: { color: "#9be7c1", backgroundColor: "rgba(34,197,94,0.14)" },
  actionFailed: { color: "#ffb4b4", backgroundColor: "rgba(255,77,77,0.12)" },
  quickPrompts: { maxHeight: 46, marginTop: 8 },
  quickContent: { gap: 10, paddingRight: 4 },
  quickButton: { borderRadius: 999, minHeight: 40, paddingHorizontal: 14, justifyContent: "center", backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border },
  quickText: { color: COLORS.textMuted, fontWeight: "800", fontSize: 12 },
  inputRow: { flexDirection: "row", gap: 10, paddingTop: 10, alignItems: "flex-end" },
  input: { flex: 1, minHeight: 54, maxHeight: 104, color: COLORS.text, backgroundColor: COLORS.surfaceAlt, borderWidth: 1, borderColor: COLORS.border, borderRadius: 18, paddingHorizontal: 14, paddingTop: 12, paddingBottom: 12, textAlignVertical: "top" },
  button: { minHeight: 54, backgroundColor: COLORS.accent, borderRadius: 18, paddingHorizontal: 18, justifyContent: "center" },
  buttonText: { color: COLORS.text, fontWeight: "900" },
});
