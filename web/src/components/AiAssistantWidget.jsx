import { Bot, MessageSquare, Mic, MicOff, Plus, Send, Volume2, VolumeX, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../api/apiClient";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";

const LIVE_WS_URL = import.meta.env.VITE_LIVE_WS_URL || "ws://127.0.0.1:8765/ws";
const CURRENT_SESSION_KEY = "smart_shop_ai_session";
const SESSION_LIST_KEY = "smart_shop_ai_sessions";

function createSessionId() {
  const id = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}_${Math.random().toString(16).slice(2)}`;
  return `web_${id}`;
}

function readKnownSessions() {
  const parsed = JSON.parse(localStorage.getItem(SESSION_LIST_KEY) || "[]");
  const sessions = Array.isArray(parsed) ? parsed : [];
  return Array.from(new Set(sessions.filter(Boolean)));
}

function rememberSession(sessionId) {
  const sessions = Array.from(new Set([sessionId, ...readKnownSessions()])).slice(0, 30);
  localStorage.setItem(CURRENT_SESSION_KEY, sessionId);
  localStorage.setItem(SESSION_LIST_KEY, JSON.stringify(sessions));
  return sessions;
}

function writeKnownSessions(sessions) {
  const cleaned = Array.from(new Set(sessions.filter(Boolean))).slice(0, 30);
  localStorage.setItem(SESSION_LIST_KEY, JSON.stringify(cleaned));
  return cleaned;
}

function initialSession() {
  const existing = localStorage.getItem(CURRENT_SESSION_KEY);
  if (existing) {
    return existing;
  }
  return createSessionId();
}

export default function AiAssistantWidget({ route = "products" }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState([]);
  const [streamingText, setStreamingText] = useState("");
  const [sessions, setSessions] = useState([]);
  const [knownSessions, setKnownSessions] = useState(() => readKnownSessions());
  const [sessionId, setSessionId] = useState(initialSession);
  const [listening, setListening] = useState(false);
  const [micMuted, setMicMuted] = useState(localStorage.getItem("smart_shop_mic_muted") === "true");
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [busy, setBusy] = useState(false);
  const [liveConnected, setLiveConnected] = useState(false);
  const [micPausedForAudio, setMicPausedForAudio] = useState(false);
  const recognitionRef = useRef(null);
  const wsRef = useRef(null);
  const audioContextRef = useRef(null);
  const audioEnabledRef = useRef(true);
  const nextAudioTimeRef = useRef(0);
  const scheduledAudioSourcesRef = useRef(new Set());
  const manuallyStoppedMicRef = useRef(false);
  const micMutedRef = useRef(micMuted);
  const listeningRef = useRef(false);
  const restartMicTimerRef = useRef(null);
  const assistantAudioPauseRef = useRef(false);
  const assistantSpeakingUntilRef = useRef(0);
  const currentSessionRef = useRef(sessionId);
  const busyRef = useRef(false);
  const { loadCart } = useCart();
  const { user } = useAuth();
  const sessionKeySignature = useMemo(() => knownSessions.join(","), [knownSessions]);

  useEffect(() => {
    currentSessionRef.current = sessionId;
  }, [sessionId]);

  useEffect(() => {
    busyRef.current = busy;
  }, [busy]);

  useEffect(() => {
    micMutedRef.current = micMuted;
  }, [micMuted]);

  useEffect(() => {
    let active = true;
    api.aiSessions(knownSessions)
      .then((res) => {
        if (!active) return;
        const fromApi = res.sessions || [];
        const apiKeys = fromApi.map((item) => item.session_key);
        setSessions(fromApi);
        setKnownSessions(writeKnownSessions(apiKeys));
        if (knownSessions.includes(sessionId) && !apiKeys.includes(sessionId) && chat.length === 0 && !busyRef.current) {
          const freshSessionId = createSessionId();
          localStorage.setItem(CURRENT_SESSION_KEY, freshSessionId);
          setSessionId(freshSessionId);
        }
      })
      .catch(() => {
        if (active) {
          setSessions([]);
        }
      });

    return () => {
      active = false;
    };
  }, [sessionKeySignature, sessionId, user?.id, chat.length]);

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
        const messages = (res.history || []).map((item) => ({
          from: item.role === "assistant" ? "ai" : "user",
          text: item.content,
          actions: item.actions || [],
        }));
        setChat(messages);
      })
      .catch(() => {
        if (active) setChat([]);
      });

    return () => {
      active = false;
    };
  }, [sessionId]);

  useEffect(() => {
    setBusy(false);
    setStreamingText("");
    setLiveConnected(false);

    const userParam = user?.id ? `&user_id=${encodeURIComponent(user.id)}` : "";
    const ws = new WebSocket(`${LIVE_WS_URL}?session_id=${encodeURIComponent(sessionId)}${userParam}`);
    const wsSessionId = sessionId;
    wsRef.current = ws;

    const isCurrentSocket = () => currentSessionRef.current === wsSessionId && wsRef.current === ws;

    ws.onopen = () => {
      if (isCurrentSocket()) setLiveConnected(true);
    };
    ws.onclose = () => {
      if (isCurrentSocket()) setLiveConnected(false);
    };
    ws.onerror = () => {
      if (isCurrentSocket()) setLiveConnected(false);
    };
    ws.onmessage = (event) => {
      const payload = JSON.parse(event.data);
      if (payload.type === "connected") {
        if (isCurrentSocket()) setLiveConnected(true);
      }
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
        playPcmAudio(payload.data, payload.mime_type);
      }
      if (payload.type === "final") {
        const reply = payload.reply || "";
        if (isCurrentSocket()) {
          busyRef.current = false;
          setBusy(false);
          setStreamingText("");
          setChat((items) => [...items, { from: "ai", text: reply, actions: payload.actions || [] }]);
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
          setKnownSessions(rememberSession(wsSessionId));
          if (payload.cart) loadCart().catch(() => {});
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

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.continuous = true;
    recognition.onresult = (event) => {
      let transcript = "";
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        if (event.results[index].isFinal) {
          transcript = `${transcript} ${event.results[index][0]?.transcript || ""}`.trim();
        }
      }
      if (assistantAudioPauseRef.current || Date.now() < assistantSpeakingUntilRef.current) {
        setMessage("");
        return;
      }
      setMessage(transcript);
      if (transcript) send(transcript);
    };
    recognition.onstart = () => {
      listeningRef.current = true;
      setListening(true);
    };
    recognition.onerror = () => {
      listeningRef.current = false;
      setListening(false);
      if (!manuallyStoppedMicRef.current && !micMutedRef.current) {
        queueMicRestart(700);
      }
    };
    recognition.onend = () => {
      listeningRef.current = false;
      setListening(false);
      if (!manuallyStoppedMicRef.current && !micMutedRef.current) {
        queueMicRestart(350);
      }
    };
    recognitionRef.current = recognition;

    if (!micMutedRef.current) {
      queueMicRestart(500);
    }

    return () => {
      window.clearTimeout(restartMicTimerRef.current);
      manuallyStoppedMicRef.current = true;
      try {
        recognition.stop();
      } catch {
        // Already stopped.
      }
    };
  }, []);

  useEffect(() => {
    localStorage.setItem("smart_shop_mic_muted", String(micMuted));
    if (micMuted) {
      stopMic();
      setMicPausedForAudio(false);
    } else {
      manuallyStoppedMicRef.current = false;
      startMic();
    }
  }, [micMuted]);

  useEffect(() => {
    audioEnabledRef.current = audioEnabled;
    if (!audioEnabled) {
      stopLiveAudio();
      return;
    }

    const context = audioContextRef.current;
    if (context?.state === "suspended") {
      context.resume().catch(() => {});
    }
    nextAudioTimeRef.current = context?.currentTime || 0;
  }, [audioEnabled]);

  const queueMicRestart = (delay = 350) => {
    window.clearTimeout(restartMicTimerRef.current);
    restartMicTimerRef.current = window.setTimeout(() => {
      if (!micMutedRef.current && !manuallyStoppedMicRef.current && !assistantAudioPauseRef.current) {
        startMic();
      }
    }, delay);
  };

  const pauseMicForAssistantAudio = () => {
    if (micMutedRef.current || assistantAudioPauseRef.current) return;
    const recognition = recognitionRef.current;
    assistantAudioPauseRef.current = true;
    setMicPausedForAudio(true);
    manuallyStoppedMicRef.current = true;
    window.clearTimeout(restartMicTimerRef.current);
    try {
      recognition?.stop();
    } catch {
      // Already stopped.
    }
    listeningRef.current = false;
    setListening(false);
  };

  const resumeMicAfterAssistantAudio = () => {
    if (scheduledAudioSourcesRef.current.size > 0) return;
    assistantSpeakingUntilRef.current = Date.now() + 900;
    assistantAudioPauseRef.current = false;
    setMicPausedForAudio(false);
    if (!micMutedRef.current) {
      manuallyStoppedMicRef.current = false;
      queueMicRestart(250);
    }
  };

  const stopLiveAudio = () => {
    scheduledAudioSourcesRef.current.forEach((source) => {
      try {
        source.stop();
      } catch {
        // The source may already have ended.
      }
      try {
        source.disconnect();
      } catch {
        // The source may already be disconnected.
      }
    });
    scheduledAudioSourcesRef.current.clear();
    nextAudioTimeRef.current = audioContextRef.current?.currentTime || 0;
    resumeMicAfterAssistantAudio();
  };

  const playPcmAudio = (base64Audio, mimeType = "audio/pcm;rate=24000") => {
    if (!audioEnabledRef.current || !base64Audio) {
      nextAudioTimeRef.current = audioContextRef.current?.currentTime || 0;
      return;
    }
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;

    const match = /rate=(\d+)/.exec(mimeType);
    const sampleRate = match ? Number(match[1]) : 24000;
    const binary = atob(base64Audio);
    const byteLength = binary.length - (binary.length % 2);
    if (byteLength <= 2) return;

    const pcm = new Int16Array(byteLength / 2);
    for (let i = 0; i < byteLength; i += 2) {
      const lo = binary.charCodeAt(i);
      const hi = binary.charCodeAt(i + 1);
      const value = (hi << 8) | lo;
      pcm[i / 2] = value >= 0x8000 ? value - 0x10000 : value;
    }

    const context = audioContextRef.current || new AudioContext({ sampleRate });
    audioContextRef.current = context;
    if (context.state === "suspended") context.resume();

    const buffer = context.createBuffer(1, pcm.length, sampleRate);
    const channel = buffer.getChannelData(0);
    for (let i = 0; i < pcm.length; i += 1) {
      channel[i] = Math.max(-1, Math.min(1, pcm[i] / 32768));
    }

    const source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(context.destination);
    pauseMicForAssistantAudio();
    scheduledAudioSourcesRef.current.add(source);
    source.onended = () => {
      scheduledAudioSourcesRef.current.delete(source);
      try {
        source.disconnect();
      } catch {
        // The browser may have already disconnected the source.
      }
      resumeMicAfterAssistantAudio();
    };
    const startAt = Math.max(context.currentTime + 0.02, nextAudioTimeRef.current || 0);
    source.start(startAt);
    nextAudioTimeRef.current = startAt + buffer.duration;
  };

  const send = async (overrideText) => {
    const userText = (overrideText ?? message).trim();
    if (!userText || busyRef.current) return;
    const activeSessionId = currentSessionRef.current;
    setBusy(true);
    busyRef.current = true;
    setStreamingText("");
    setMessage("");
    setChat((items) => [...items, { from: "user", text: userText }]);
    setKnownSessions(rememberSession(activeSessionId));

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      nextAudioTimeRef.current = audioContextRef.current?.currentTime || 0;
      wsRef.current.send(JSON.stringify({ type: "message", message: userText }));
      return;
    }

    setBusy(false);
    busyRef.current = false;
    setChat((items) => [...items, { from: "ai", text: "Pixie is offline. Start the live websocket server, then try again." }]);
  };

  const startMic = () => {
    const recognition = recognitionRef.current;
    if (!recognition || micMutedRef.current || listeningRef.current) return;
    window.clearTimeout(restartMicTimerRef.current);
    try {
      recognition.start();
      manuallyStoppedMicRef.current = false;
    } catch {
      if (!micMutedRef.current && !manuallyStoppedMicRef.current) {
        queueMicRestart(700);
      }
    }
  };

  const stopMic = () => {
    const recognition = recognitionRef.current;
    if (!recognition) return;
    window.clearTimeout(restartMicTimerRef.current);
    manuallyStoppedMicRef.current = true;
    try {
      recognition.stop();
    } catch {
      // Already stopped.
    }
    listeningRef.current = false;
    setListening(false);
  };

  const switchSession = (nextSessionId) => {
    if (!nextSessionId || nextSessionId === sessionId) return;
    const currentWs = wsRef.current;
    if (busyRef.current && currentWs?.readyState === WebSocket.OPEN) {
      currentWs.closeAfterFinal = true;
    } else {
      currentWs?.close();
    }
    setBusy(false);
    setMessage("");
    setStreamingText("");
    localStorage.setItem(CURRENT_SESSION_KEY, nextSessionId);
    setSessionId(nextSessionId);
  };

  const newSession = () => {
    switchSession(createSessionId());
  };

  const toggleAudio = () => {
    setAudioEnabled((value) => !value);
  };

  const activeTitle = sessions.find((item) => item.session_key === sessionId)?.title || "New chat";
  const quickPrompts = [
    "Recommend a gaming laptop",
    "Compare iPhone and Galaxy",
    "Add the best headphones to my cart",
  ];

  const quietRoutes = ["admin", "cart", "checkout", "login", "orders", "profile", "register"];

  return (
    <section className={`ai-widget ${open ? "open" : ""} ${quietRoutes.includes(route) ? "quiet-route" : ""}`}>
      {open && (
        <div className="ai-panel">
          <div className="ai-panel-head">
            <div>
              <strong>{liveConnected ? "Pixie AI Assistant" : "Pixie is offline"}</strong>
              <span>{activeTitle}</span>
            </div>
            <div className="ai-head-actions">
              <button onClick={newSession} title="New chat"><Plus size={17} /></button>
              <button onClick={() => setOpen(false)} title="Close chat"><X size={17} /></button>
            </div>
          </div>

          <div className="ai-body">
            <aside className="ai-sessions" aria-label="Chat sessions">
              <button className="ai-new-chat" onClick={newSession}><Plus size={16} /> New chat</button>
              {sessions.map((item) => (
                <button
                  key={item.session_key}
                  className={item.session_key === sessionId ? "selected" : ""}
                  onClick={() => switchSession(item.session_key)}
                >
                  <MessageSquare size={15} />
                  <span>
                    <strong>{item.title || "Shopping chat"}</strong>
                    <small>{Number(item.message_count || 0)} messages</small>
                  </span>
                </button>
              ))}
            </aside>

            <div className="ai-chat-area">
              <div className="ai-messages">
                {chat.length === 0 && !streamingText && (
                  <div className="ai-message ai">
                    <p>Hi, I can compare products, recommend devices, update your cart, or help write a product review.</p>
                  </div>
                )}
                {chat.map((item, index) => (
                  <div key={`${item.from}-${index}`} className={`ai-message ${item.from}`}>
                    <p>{item.text}</p>
                    {(item.actions || []).length > 0 && (
                      <div className="ai-action-list">
                        {item.actions.map((action, actionIndex) => (
                          <span key={actionIndex} className={action.success ? "success" : "failed"}>{action.message || action.type}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {(busy || streamingText) && (
                  <div className="ai-message ai streaming">
                    <p>{streamingText || "Pixie is thinking..."}</p>
                  </div>
                )}
              </div>

              <div className="ai-quick-prompts">
                {quickPrompts.map((prompt) => (
                  <button key={prompt} onClick={() => send(prompt)} disabled={busy}>{prompt}</button>
                ))}
              </div>

              <div className="ai-input">
                <button onClick={toggleAudio} title={audioEnabled ? "Mute Pixie voice" : "Unmute Pixie voice"}>
                  {audioEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
                </button>
                <button onClick={() => setMicMuted((value) => !value)} title={micMuted ? "Unmute microphone" : "Mute microphone"} disabled={!recognitionRef.current}>
                  {micMuted ? <MicOff size={18} /> : <Mic size={18} />}
                </button>
                <input
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  onKeyDown={(event) => event.key === "Enter" && send()}
                  placeholder="Ask, add to cart, remove, or review..."
                />
                <button onClick={() => send()} disabled={busy}><Send size={18} /></button>
              </div>
              <span className="voice-status">
                {liveConnected ? "Pixie connected" : "Pixie offline"} - {audioEnabled ? "Voice on" : "Voice muted"} - {micMuted ? "Mic muted" : micPausedForAudio ? "Mic paused while Pixie speaks" : listening ? "Listening by default" : "Mic ready"}
              </span>
            </div>
          </div>
        </div>
      )}
      <button className="ai-toggle" onClick={() => setOpen((value) => !value)} aria-label="Pixie AI assistant">
        <Bot size={22} />
      </button>
    </section>
  );
}
