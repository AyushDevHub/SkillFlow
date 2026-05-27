import React, { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import { useAuth, useToast, API } from "../App";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "";
const ICE_SERVERS = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
  ],
};

// Inject responsive styles once
const ROOM_CSS = `
  .room-layout {
    max-width: 1280px;
    margin: 0 auto;
    padding: 0;
    display: grid;
    grid-template-columns: 1fr 340px;
    gap: 0;
    align-items: start;
    min-height: calc(100vh - 60px);
  }
  .room-main { padding: 0; }
  .room-sidebar {
    position: sticky;
    top: 60px;
    height: calc(100vh - 60px);
    border-left: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    background: var(--surface);
  }
  .video-wrap {
    background: #0f0f0f;
    width: 100%;
    aspect-ratio: 16/9;
    position: relative;
    display: block;
  }
  .room-info-area {
    padding: 20px;
  }
  .host-controls {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    padding: 12px 20px;
    border-bottom: 1px solid var(--border);
    background: var(--surface);
  }

  @media (max-width: 768px) {
    .room-layout {
      grid-template-columns: 1fr;
      gap: 0;
    }
    .room-sidebar {
      position: static;
      height: 420px;
      border-left: none;
      border-top: 1px solid var(--border);
    }
    .room-info-area {
      padding: 14px 14px 24px;
    }
    .host-controls {
      padding: 10px 14px;
    }
  }
`;

function injectStyles() {
  if (document.getElementById("room-styles")) return;
  const el = document.createElement("style");
  el.id = "room-styles";
  el.textContent = ROOM_CSS;
  document.head.appendChild(el);
}

export default function Room() {
  const { id: sessionId } = useParams();
  const [searchParams] = useSearchParams();
  const isHost = searchParams.get("host") === "1";
  const { user, token } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionEnded, setSessionEnded] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);
  const [liveChat, setLiveChat] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [comments, setComments] = useState([]);
  const [commentInput, setCommentInput] = useState("");
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [recording, setRecording] = useState(false);
  const [recordingUrl, setRecordingUrl] = useState(null);
  const [activeTab, setActiveTab] = useState("chat");
  const [streamReady, setStreamReady] = useState(false);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const socketRef = useRef(null);
  const pcsRef = useRef({});
  const iceBufRef = useRef({});
  const mediaRecRef = useRef(null);
  const chunksRef = useRef([]);
  const chatEndRef = useRef(null);
  const sessionEndedRef = useRef(false);

  useEffect(() => {
    injectStyles();
  }, []);

  // Load session
  useEffect(() => {
    fetch(`${API}/api/sessions/${sessionId}`)
      .then((r) => r.json())
      .then((d) => {
        if (!d.session) return navigate("/browse");
        setSession(d.session);
        if (d.session.status === "ended") {
          setSessionEnded(true);
          sessionEndedRef.current = true;
        }
      })
      .catch(() => navigate("/browse"))
      .finally(() => setLoading(false));
  }, [sessionId]);

  const loadComments = useCallback(() => {
    fetch(`${API}/api/comments/${sessionId}`)
      .then((r) => r.json())
      .then((d) => setComments(d.comments || []));
  }, [sessionId]);

  useEffect(() => {
    loadComments();
  }, [loadComments]);
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [liveChat]);

  const addIceCandidate = useCallback(async (peerId, candidate) => {
    const pc = pcsRef.current[peerId];
    if (!pc || !pc.remoteDescription) {
      if (!iceBufRef.current[peerId]) iceBufRef.current[peerId] = [];
      iceBufRef.current[peerId].push(candidate);
      return;
    }
    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch {}
  }, []);

  const drainIceBuf = useCallback(async (peerId) => {
    const buf = iceBufRef.current[peerId];
    if (!buf?.length) return;
    const pc = pcsRef.current[peerId];
    if (!pc) return;
    for (const c of buf) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(c));
      } catch {}
    }
    iceBufRef.current[peerId] = [];
  }, []);

  // WebRTC + Socket — runs once after session loads
  useEffect(() => {
    if (!session || sessionEndedRef.current) return;

    const socket = io(SOCKET_URL, {
      path: "/socket.io",
      transports: ["websocket", "polling"],
    });
    socketRef.current = socket;

    socket.on("viewer:count", ({ count }) => setViewerCount(count));
    socket.on("chat:message", (msg) =>
      setLiveChat((c) => [...c.slice(-99), msg])
    );
    socket.on("session:ended", () => {
      sessionEndedRef.current = true;
      setSessionEnded(true);
      toast("Host ended the session", "default");
      loadComments();
    });

    if (isHost) {
      const startHost = async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true,
          });
          localStreamRef.current = stream;
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
            localVideoRef.current.play().catch(() => {});
          }
        } catch {
          toast("Camera/mic denied. Allow permissions and refresh.", "error");
          return;
        }

        socket.emit("host:join", { sessionId, user });
        socket.on("host:ready", ({ viewerCount }) =>
          setViewerCount(viewerCount)
        );

        socket.on("viewer:new", async ({ viewerId }) => {
          const pc = new RTCPeerConnection(ICE_SERVERS);
          pcsRef.current[viewerId] = pc;
          localStreamRef.current
            .getTracks()
            .forEach((t) => pc.addTrack(t, localStreamRef.current));
          pc.onicecandidate = ({ candidate }) => {
            if (candidate)
              socket.emit("webrtc:ice", { targetId: viewerId, candidate });
          };
          pc.onconnectionstatechange = () => {
            if (pc.connectionState === "failed") pc.restartIce();
          };
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          socket.emit("webrtc:offer", { viewerId, offer });
        });

        socket.on("webrtc:answer", async ({ viewerId, answer }) => {
          const pc = pcsRef.current[viewerId];
          if (pc?.signalingState === "have-local-offer") {
            await pc.setRemoteDescription(new RTCSessionDescription(answer));
            await drainIceBuf(viewerId);
          }
        });

        socket.on("webrtc:ice", async ({ fromId, candidate }) => {
          await addIceCandidate(fromId, candidate);
        });
        socket.on("viewer:left", ({ viewerId }) => {
          pcsRef.current[viewerId]?.close();
          delete pcsRef.current[viewerId];
          delete iceBufRef.current[viewerId];
        });
      };
      startHost();
    } else {
      socket.emit("viewer:join", {
        sessionId,
        user: user || {
          id: "anon-" + Date.now(),
          name: "Guest",
          avatar_color: "#999",
        },
      });

      socket.on("webrtc:offer", async ({ hostId, offer }) => {
        if (pcsRef.current[hostId]) {
          pcsRef.current[hostId].close();
          delete pcsRef.current[hostId];
        }

        const pc = new RTCPeerConnection(ICE_SERVERS);
        pcsRef.current[hostId] = pc;

        pc.ontrack = (e) => {
          const stream = e.streams[0];
          if (!stream) return;
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = stream;
            remoteVideoRef.current
              .play()
              .then(() => setStreamReady(true))
              .catch(() => setStreamReady(true));
          } else setStreamReady(true);
        };

        pc.onicecandidate = ({ candidate }) => {
          if (candidate)
            socket.emit("webrtc:ice", { targetId: hostId, candidate });
        };
        pc.onconnectionstatechange = () => {
          if (pc.connectionState === "failed") pc.restartIce();
        };

        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        await drainIceBuf(hostId);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit("webrtc:answer", { hostId, answer });
      });

      socket.on("webrtc:ice", async ({ fromId, candidate }) => {
        await addIceCandidate(fromId, candidate);
      });
    }

    return () => {
      socket.disconnect();
      Object.values(pcsRef.current).forEach((pc) => pc.close());
      pcsRef.current = {};
      iceBufRef.current = {};
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const toggleMic = () => {
    const t = localStreamRef.current?.getAudioTracks()[0];
    if (t) {
      t.enabled = !t.enabled;
      setMicOn(t.enabled);
    }
  };
  const toggleCam = () => {
    const t = localStreamRef.current?.getVideoTracks()[0];
    if (t) {
      t.enabled = !t.enabled;
      setCamOn(t.enabled);
    }
  };

  const startRecording = () => {
    const stream = isHost
      ? localStreamRef.current
      : remoteVideoRef.current?.srcObject;
    if (!stream) return toast("No stream to record", "error");
    chunksRef.current = [];
    const mr = new MediaRecorder(stream, { mimeType: "video/webm;codecs=vp9" });
    mr.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    mr.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "video/webm" });
      setRecordingUrl(URL.createObjectURL(blob));
      toast("Recording saved — download below", "success");
    };
    mr.start(1000);
    mediaRecRef.current = mr;
    setRecording(true);
    toast("Recording started", "success");
  };
  const stopRecording = () => {
    mediaRecRef.current?.stop();
    setRecording(false);
  };

  const endSession = () => {
    socketRef.current?.emit("session:end", { sessionId });
    fetch(`${API}/api/sessions/${sessionId}/end`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
    });
    sessionEndedRef.current = true;
    setSessionEnded(true);
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
  };

  const sendChat = () => {
    if (!chatInput.trim() || !socketRef.current) return;
    socketRef.current.emit("chat:message", {
      sessionId,
      message: chatInput.trim(),
      user: user || { name: "Guest", id: "anon", avatar_color: "#999" },
    });
    setChatInput("");
  };

  const postComment = async () => {
    if (!commentInput.trim()) return;
    if (!user) return toast("Sign in to comment", "error");
    try {
      const res = await fetch(`${API}/api/comments/${sessionId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text: commentInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setComments((c) => [...c, data.comment]);
      setCommentInput("");
    } catch (e) {
      toast(e.message, "error");
    }
  };

  if (loading)
    return (
      <div
        className="loader-center"
        style={{ minHeight: "calc(100vh - 60px)" }}
      >
        <div className="spinner" />
      </div>
    );
  if (!session) return null;

  return (
    <div className="room-layout">
      {/* ── Left / Main column ── */}
      <div className="room-main">
        {/* VIDEO — full width, top of page, like YouTube */}
        <div className="video-wrap">
          {isHost ? (
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
              }}
            />
          ) : (
            <>
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  display: "block",
                }}
              />
              {!streamReady && !sessionEnded && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: "#0f0f0f",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 14,
                  }}
                >
                  <div
                    className="spinner"
                    style={{
                      borderTopColor: "var(--accent)",
                      borderColor: "#2a2a2a",
                    }}
                  />
                  <p style={{ color: "#666", fontSize: "0.82rem" }}>
                    Connecting to host…
                  </p>
                </div>
              )}
            </>
          )}

          {/* Session ended overlay */}
          {sessionEnded && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "rgba(0,0,0,.8)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 12,
                color: "#fff",
              }}
            >
              <div style={{ fontSize: "2.5rem" }}>📹</div>
              <div
                style={{ fontFamily: "'Fraunces', serif", fontSize: "1.1rem" }}
              >
                Session Ended
              </div>
              {recordingUrl && (
                <a
                  href={recordingUrl}
                  download={`${session.title}.webm`}
                  className="btn btn-primary btn-sm"
                  style={{ marginTop: 4 }}
                >
                  ⬇ Download Recording
                </a>
              )}
            </div>
          )}

          {/* Live badge */}
          {!sessionEnded && (
            <div
              style={{
                position: "absolute",
                top: 10,
                left: 10,
                display: "flex",
                gap: 7,
              }}
            >
              <span className="badge badge-live">LIVE</span>
              <span
                className="badge"
                style={{ background: "rgba(0,0,0,.6)", color: "#fff" }}
              >
                👁 {viewerCount}
              </span>
            </div>
          )}

          {/* Recording badge */}
          {recording && (
            <div style={{ position: "absolute", top: 10, right: 10 }}>
              <span className="badge badge-live">● REC</span>
            </div>
          )}
        </div>

        {/* Host controls bar */}
        {isHost && !sessionEnded && (
          <div className="host-controls">
            <button
              className={`btn btn-sm ${micOn ? "btn-outline" : "btn-danger"}`}
              onClick={toggleMic}
            >
              {micOn ? "🎤 Mic" : "🎤 Muted"}
            </button>
            <button
              className={`btn btn-sm ${camOn ? "btn-outline" : "btn-danger"}`}
              onClick={toggleCam}
            >
              {camOn ? "📷 Cam" : "📷 Off"}
            </button>
            {!recording ? (
              <button
                className="btn btn-outline btn-sm"
                onClick={startRecording}
              >
                ⏺ Record
              </button>
            ) : (
              <button className="btn btn-danger btn-sm" onClick={stopRecording}>
                ⏹ Stop
              </button>
            )}
            {recordingUrl && (
              <a
                href={recordingUrl}
                download={`${session.title}.webm`}
                className="btn btn-outline btn-sm"
              >
                ⬇ Download
              </a>
            )}
            <button
              className="btn btn-danger btn-sm"
              style={{ marginLeft: "auto" }}
              onClick={endSession}
            >
              End Session
            </button>
          </div>
        )}

        {/* Viewer record bar */}
        {!isHost && !sessionEnded && (
          <div className="host-controls">
            {!recording ? (
              <button
                className="btn btn-outline btn-sm"
                onClick={startRecording}
              >
                ⏺ Record for yourself
              </button>
            ) : (
              <button className="btn btn-danger btn-sm" onClick={stopRecording}>
                ⏹ Stop & Save
              </button>
            )}
            {recordingUrl && (
              <a
                href={recordingUrl}
                download={`${session.title}.webm`}
                className="btn btn-outline btn-sm"
              >
                ⬇ Download
              </a>
            )}
          </div>
        )}

        {/* Session info + comments */}
        <div className="room-info-area">
          {/* Title row */}
          <div style={{ marginBottom: 16 }}>
            <div
              style={{
                display: "flex",
                gap: 7,
                marginBottom: 8,
                flexWrap: "wrap",
              }}
            >
              <span
                className={`badge ${
                  sessionEnded ? "badge-ended" : "badge-live"
                }`}
              >
                {sessionEnded ? "Recorded" : "LIVE"}
              </span>
              <span className="badge badge-cat">{session.category}</span>
            </div>
            <h2
              style={{ fontSize: "clamp(1rem, 3vw, 1.3rem)", marginBottom: 6 }}
            >
              {session.title}
            </h2>
            {session.description && (
              <p style={{ fontSize: "0.875rem", marginBottom: 10 }}>
                {session.description}
              </p>
            )}
            {session.tags?.length > 0 && (
              <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                {session.tags.map((t) => (
                  <span key={t} className="badge badge-tag">
                    {t}
                  </span>
                ))}
              </div>
            )}
          </div>

          <hr className="divider" />

          {/* Host info */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 20,
            }}
          >
            <div
              className="avatar avatar-lg"
              style={{ background: session.host_color }}
            >
              {session.host_name?.[0]?.toUpperCase()}
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>
                {session.host_name}
              </div>
              {session.host_bio && (
                <p style={{ fontSize: "0.78rem" }}>{session.host_bio}</p>
              )}
            </div>
          </div>

          <hr className="divider" />

          {/* Comments */}
          <div>
            <h3 style={{ marginBottom: 14, fontSize: "1rem" }}>
              Comments ({comments.length})
            </h3>
            {user ? (
              <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
                <input
                  className="input"
                  placeholder="Leave a comment…"
                  value={commentInput}
                  onChange={(e) => setCommentInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && postComment()}
                  style={{ fontSize: "0.85rem" }}
                />
                <button
                  className="btn btn-primary btn-sm"
                  onClick={postComment}
                >
                  Post
                </button>
              </div>
            ) : (
              <p style={{ fontSize: "0.82rem", marginBottom: 14 }}>
                <a href="/auth" style={{ color: "var(--accent)" }}>
                  Sign in
                </a>{" "}
                to comment
              </p>
            )}
            {comments.length === 0 ? (
              <p
                style={{
                  fontSize: "0.82rem",
                  color: "var(--text-3)",
                  padding: "12px 0",
                }}
              >
                No comments yet. Be first!
              </p>
            ) : (
              <div
                style={{ display: "flex", flexDirection: "column", gap: 14 }}
              >
                {comments.map((c) => (
                  <div key={c.id} style={{ display: "flex", gap: 10 }}>
                    <div
                      className="avatar avatar-sm"
                      style={{ background: c.avatar_color, flexShrink: 0 }}
                    >
                      {c.user_name[0].toUpperCase()}
                    </div>
                    <div>
                      <div
                        style={{
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          color: "var(--accent)",
                          marginBottom: 2,
                        }}
                      >
                        {c.user_name}
                      </div>
                      <div style={{ fontSize: "0.875rem" }}>{c.text}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Right / Sidebar ── */}
      <div className="room-sidebar">
        {/* Tab bar */}
        <div
          style={{
            display: "flex",
            borderBottom: "1px solid var(--border)",
            flexShrink: 0,
          }}
        >
          {["chat", "info"].map((tab) => (
            <button
              key={tab}
              style={{
                flex: 1,
                padding: "13px 0",
                fontSize: "0.75rem",
                fontWeight: 700,
                letterSpacing: ".05em",
                textTransform: "uppercase",
                background: "none",
                color: activeTab === tab ? "var(--accent)" : "var(--text-3)",
                borderBottom:
                  activeTab === tab
                    ? "2.5px solid var(--accent)"
                    : "2.5px solid transparent",
                transition: "all .15s",
              }}
              onClick={() => setActiveTab(tab)}
            >
              {tab === "chat" ? "💬 Live Chat" : "ℹ Info"}
            </button>
          ))}
        </div>

        {activeTab === "chat" ? (
          <>
            {/* Messages */}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "12px 14px",
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              {liveChat.length === 0 && (
                <p
                  style={{
                    textAlign: "center",
                    color: "var(--text-3)",
                    fontSize: "0.8rem",
                    marginTop: 28,
                  }}
                >
                  No messages yet. Say hi! 👋
                </p>
              )}
              {liveChat.map((m) => (
                <div
                  key={m.id}
                  style={{ display: "flex", gap: 7, alignItems: "flex-start" }}
                >
                  <div
                    className="avatar avatar-sm"
                    style={{
                      background: m.user?.avatar_color || "#999",
                      flexShrink: 0,
                    }}
                  >
                    {(m.user?.name || "G")[0].toUpperCase()}
                  </div>
                  <div>
                    <span
                      style={{
                        fontSize: "0.7rem",
                        fontWeight: 700,
                        color: "var(--accent)",
                        marginRight: 5,
                      }}
                    >
                      {m.user?.name || "Guest"}
                    </span>
                    <span style={{ fontSize: "0.82rem" }}>{m.message}</span>
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            {/* Chat input */}
            <div
              style={{
                padding: "10px 12px",
                borderTop: "1px solid var(--border)",
                flexShrink: 0,
              }}
            >
              {sessionEnded ? (
                <p
                  style={{
                    fontSize: "0.78rem",
                    color: "var(--text-3)",
                    textAlign: "center",
                    padding: "6px 0",
                  }}
                >
                  Session ended
                </p>
              ) : (
                <div style={{ display: "flex", gap: 6 }}>
                  <input
                    className="input"
                    style={{ fontSize: "0.82rem", padding: "8px 10px" }}
                    placeholder={user ? "Type a message…" : "Sign in to chat"}
                    value={chatInput}
                    disabled={!user}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendChat()}
                  />
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={sendChat}
                    disabled={!user}
                  >
                    →
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: 16,
              display: "flex",
              flexDirection: "column",
              gap: 11,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: "0.68rem",
                  fontWeight: 700,
                  color: "var(--text-3)",
                  letterSpacing: ".07em",
                  textTransform: "uppercase",
                  marginBottom: 5,
                }}
              >
                Session
              </div>
              <p
                style={{
                  fontSize: "0.88rem",
                  fontWeight: 600,
                  color: "var(--text)",
                  lineHeight: 1.4,
                }}
              >
                {session.title}
              </p>
            </div>
            <hr className="divider" style={{ margin: "2px 0" }} />
            {[
              ["Host", session.host_name],
              ["Category", session.category],
              ["Status", sessionEnded ? "Ended" : "Live"],
              ["Viewers", viewerCount],
              ["Comments", comments.length],
            ].map(([l, v]) => (
              <div
                key={l}
                style={{ display: "flex", justifyContent: "space-between" }}
              >
                <span style={{ fontSize: "0.77rem", color: "var(--text-3)" }}>
                  {l}
                </span>
                <span style={{ fontSize: "0.82rem", fontWeight: 500 }}>
                  {v}
                </span>
              </div>
            ))}
            {session.tags?.length > 0 && (
              <>
                <hr className="divider" style={{ margin: "2px 0" }} />
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                  {session.tags.map((t) => (
                    <span key={t} className="badge badge-tag">
                      {t}
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
