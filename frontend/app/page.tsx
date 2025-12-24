"use client";

import { useEffect, useRef, useState } from "react";
import type { Takeoff, Quote } from "@/lib/types";
import { quoteRules } from "@/lib/pricing";

export default function Page() {
  const [file, setFile] = useState<File | null>(null);
  const [scale, setScale] = useState("0.02");
  const [takeoff, setTakeoff] = useState<Takeoff | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [material, setMaterial] = useState("aluminum");
  const [includeInstall, setIncludeInstall] = useState(false);

  const [chatInput, setChatInput] = useState("");
  const [chat, setChat] = useState<{ role: "user" | "assistant"; content: string }[]>([]);

  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat]);

  async function runVision() {
    if (!file) return;

    const form = new FormData();
    form.append("file", file);
    form.append("scale_ft_per_pixel", scale);

    const res = await fetch("/api/vision", { method: "POST", body: form });
    const data = await res.json();
    setTakeoff(data);
    setQuote(null);
    setChat([]);
  }

  async function runQuote() {
    if (!takeoff) return;

    const payload = {
      takeoff: takeoff.takeoff,
      material,
      include_installation: includeInstall
    };

    const res = await fetch("/api/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    setQuote(data);
  }

  async function sendChat() {
    if (!takeoff) return;
    if (!chatInput.trim()) return;

    const nextMessages = [...chat, { role: "user" as const, content: chatInput }];

    setChat(nextMessages);
    setChatInput("");

    const quoteSettings = {
      material,
      include_installation: includeInstall,
      scale_ft_per_pixel: Number(scale)
    };

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: nextMessages.map(m => ({ role: m.role, content: m.content })),
        takeoff,
        quoteRules,
        quoteSettings,
        quoteResult: quote
      })
    });

    const data = await res.json();
    setChat([...nextMessages, { role: "assistant", content: data.reply }]);
  }

  function onChatKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      void sendChat();
    }
  }

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: "0 auto" }}>
      <h1 style={{ fontSize: 28, fontWeight: 700 }}>Mini AI Quoting Engine</h1>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16 }}>
        <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600 }}>Upload floor plan</h2>

          <input
            id="floorplan-upload"
            type="file"
            accept="image/png,image/jpeg"
            onChange={e => setFile(e.target.files?.[0] ?? null)}
            style={{ display: "none" }}
          />

          <label htmlFor="floorplan-upload" role="button" style={{ marginTop: 12 }}>
            Choose floor plan image
          </label>

          {file ? (
            <div style={{ marginTop: 8, fontSize: 14 }}>
              Selected: <strong>{file.name}</strong>
            </div>
          ) : null}

          <div style={{ marginTop: 12 }}>
            <label>Scale (ft per pixel): </label>
            <input
              value={scale}
              onChange={e => setScale(e.target.value)}
              style={{ border: "1px solid #ddd", borderRadius: 8, padding: 8, width: 140 }}
            />
          </div>

          <button
            onClick={runVision}
            style={{ marginTop: 12, padding: 10, border: "1px solid #333", borderRadius: 10, cursor: "pointer" }}
          >
            Run takeoff (CV)
          </button>

          {takeoff?.uncertainty?.length ? (
            <div style={{ marginTop: 12 }}>
              <strong>Uncertainty</strong>
              <ul>
                {takeoff.uncertainty.map((u, i) => (
                  <li key={i}>{u}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600 }}>Quote settings</h2>

          <div style={{ marginTop: 12 }}>
            <label>Material: </label>
            <select value={material} onChange={e => setMaterial(e.target.value)} style={{ padding: 8, cursor: "pointer" }}>
              <option value="aluminum">Aluminum</option>
              <option value="steel">Steel</option>
            </select>
          </div>

          <div style={{ marginTop: 12 }}>
            <label style={{ cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={includeInstall}
                onChange={e => setIncludeInstall(e.target.checked)}
                style={{ cursor: "pointer" }}
              />
              Include installation
            </label>
          </div>

          <button
            onClick={runQuote}
            style={{ marginTop: 12, padding: 10, border: "1px solid #333", borderRadius: 10, cursor: "pointer" }}
          >
            Generate quote
          </button>

          {quote ? (
            <div style={{ marginTop: 12 }}>
              <div>
                <strong>Detected</strong>: {quote.counts.windows} windows, {quote.counts.doors} doors
              </div>
              <div>
                <strong>Range</strong>: ${quote.quote_low} to ${quote.quote_high}
              </div>
              <div style={{ marginTop: 8 }}>
                <strong>Assumptions</strong>
              </div>
              <ul>
                {quote.assumptions.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>

      <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 16, marginTop: 16 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600 }}>Chat quoting agent</h2>

        {!takeoff ? (
          <p>Run takeoff first, then ask questions.</p>
        ) : (
          <>
            <div style={{ maxHeight: 260, overflowY: "auto", padding: 12, border: "1px solid #eee", borderRadius: 10 }}>
              {chat.map((m, i) => (
                <div key={i} style={{ marginBottom: 10 }}>
                  <strong>{m.role === "user" ? "You" : "Agent"}:</strong> {m.content}
                </div>
              ))}
              <div ref={chatBottomRef} />
            </div>

            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <input
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={onChatKeyDown}
                placeholder="Ask about the quote, counts, uncertainty, materials..."
                style={{ flex: 1, border: "1px solid #ddd", borderRadius: 10, padding: 10 }}
              />
              <button
                onClick={sendChat}
                style={{ padding: 10, border: "1px solid #333", borderRadius: 10, cursor: "pointer" }}
              >
                Send
              </button>
            </div>
          </>
        )}
      </div>

      {takeoff ? (
        <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 16, marginTop: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600 }}>Extracted takeoff JSON</h2>
          <pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(takeoff, null, 2)}</pre>
        </div>
      ) : null}
    </div>
  );
}
