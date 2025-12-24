"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Takeoff, Quote, Detection } from "@/lib/types";
import { quoteRules } from "@/lib/pricing";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";


type ChatMsg = { role: "user" | "assistant"; content: string };

function fmtMoney(n: number) {
  return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function avgScore(arr: { score: number }[]) {
  if (!arr.length) return 0;
  return arr.reduce((s, x) => s + x.score, 0) / arr.length;
}

function summarizeByLabel(dets: Detection[]) {
  const map = new Map<string, number>();
  for (const d of dets) map.set(d.label, (map.get(d.label) ?? 0) + 1);
  return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
}

function Spinner({ size = 14 }: { size?: number }) {
  return (
    <span
      aria-label="loading"
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        border: "2px solid rgba(0,0,0,0.25)",
        borderTopColor: "rgba(0,0,0,0.85)",
        display: "inline-block",
        animation: "spin 0.8s linear infinite"
      }}
    />
  );
}

export default function Page() {
  const [file, setFile] = useState<File | null>(null);
  const [scale, setScale] = useState("0.02");
  const [takeoff, setTakeoff] = useState<Takeoff | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [material, setMaterial] = useState("aluminum");
  const [includeInstall, setIncludeInstall] = useState(false);

  const [chatInput, setChatInput] = useState("");
  const [chat, setChat] = useState<ChatMsg[]>([]);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  // ✅ loading states
  const [isVisionLoading, setIsVisionLoading] = useState(false);
  const [isQuoteLoading, setIsQuoteLoading] = useState(false);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chat]);

  const doorDets = useMemo(() => {
    return takeoff?.detections?.filter(d => d.label.startsWith("door_")) ?? [];
  }, [takeoff]);

  const windowDets = useMemo(() => {
    return takeoff?.detections?.filter(d => d.label === "window") ?? [];
  }, [takeoff]);

  const doorMix = useMemo(() => summarizeByLabel(doorDets), [doorDets]);

  const confidenceNote = useMemo(() => {
    if (!takeoff) return "";
    const w = avgScore(windowDets);
    const d = avgScore(doorDets);

    const moderate = (windowDets.length && w < 0.62) || (doorDets.length && d < 0.62);
    if (moderate) {
      return "Confidence is moderate. Recommend spot checking symbol style and counts before sending to a customer.";
    }
    return "Confidence looks solid. Recommend a quick spot check before sending to a customer.";
  }, [takeoff, windowDets, doorDets]);

  async function runVision() {
    if (!file) return;

    setIsVisionLoading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("scale_ft_per_pixel", scale);

      const res = await fetch("/api/vision", { method: "POST", body: form });
      if (!res.ok) throw new Error(await res.text());

      const data = (await res.json()) as Takeoff;
      setTakeoff(data);

      // reset dependent state
      setQuote(null);
      setChat([]);
    } catch (e) {
      console.error(e);
      alert("Vision failed. Check the console for details.");
    } finally {
      setIsVisionLoading(false);
    }
  }

  async function runQuote() {
    if (!takeoff) return;

    setIsQuoteLoading(true);
    try {
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

      if (!res.ok) throw new Error(await res.text());

      const data = (await res.json()) as Quote;
      setQuote(data);
    } catch (e) {
      console.error(e);
      alert("Quote failed. Check the console for details.");
    } finally {
      setIsQuoteLoading(false);
    }
  }

  async function sendChat() {
    if (!takeoff) return;
    if (!chatInput.trim()) return;

    const nextMessages: ChatMsg[] = [...chat, { role: "user", content: chatInput }];

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

    const data = (await res.json()) as { reply: string };
    setChat([...nextMessages, { role: "assistant", content: data.reply }]);
  }

  function onChatKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      void sendChat();
    }
  }

  const buttonBase: React.CSSProperties = {
    marginTop: 12,
    padding: 10,
    border: "1px solid #333",
    borderRadius: 10,
    background: "white",
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    opacity: 1
  };

  const buttonDisabled: React.CSSProperties = {
    opacity: 0.6,
    cursor: "not-allowed"
  };

  return (
    <div style={{ padding: 24, maxWidth: 1100, margin: "0 auto" }}>
      {/* spinner keyframes */}
      <style>{`
        @keyframes spin { 
          from { transform: rotate(0deg); } 
          to { transform: rotate(360deg); } 
        }
      `}</style>

      <h1 style={{ fontSize: 28, fontWeight: 700 }}>Merciful&apos;s Floor Plan Quoting Engine - Inspired by Latii</h1>

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
            disabled={!file || isVisionLoading}
            style={{
              ...buttonBase,
              ...((!file || isVisionLoading) ? buttonDisabled : null)
            }}
          >
            {isVisionLoading ? <Spinner /> : null}
            {isVisionLoading ? "Running takeoff…" : "Run takeoff (CV)"}
          </button>

          {takeoff?.uncertainty?.length ? (
            <div style={{ marginTop: 12 }}>
              <strong>Notes</strong>
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
            <select
              value={material}
              onChange={e => setMaterial(e.target.value)}
              style={{ padding: 8, cursor: "pointer" }}
              disabled={isQuoteLoading}
            >
              <option value="aluminum">Aluminum</option>
              <option value="steel">Steel</option>
            </select>
          </div>

          <div style={{ marginTop: 12, marginBottom: 12 }}>
            <label style={{ cursor: "pointer", display: "flex", gap: 8, alignItems: "center" }}>
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
            disabled={!takeoff || isQuoteLoading}
            style={{
              ...buttonBase,
              ...((!takeoff || isQuoteLoading) ? buttonDisabled : null)
            }}
          >
            {isQuoteLoading ? <Spinner /> : null}
            {isQuoteLoading ? "Generating quote…" : "Generate quote"}
          </button>

          {quote ? (
            <div style={{ marginTop: 12 }}>
              <div>
                <strong>Detected</strong>: {quote.counts.windows} windows, {quote.counts.doors} doors
              </div>
              <div>
                <strong>Range</strong>: ${fmtMoney(quote.quote_low)} to ${fmtMoney(quote.quote_high)}
              </div>
              <div style={{ marginTop: 8 }}>
                <strong>Assumptions</strong>
              </div>
              <ul>
                {quote.assumptions.slice(0, 6).map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>

      {takeoff ? (
        <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 16, marginTop: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600 }}>Takeoff summary</h2>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 12 }}>
            <div style={{ border: "1px solid #eee", borderRadius: 10, padding: 12 }}>
              <div style={{ fontSize: 13, opacity: 0.8 }}>Openings</div>
              <div style={{ fontSize: 22, fontWeight: 700, marginTop: 6 }}>
                {takeoff.takeoff.windows} Windows
              </div>
              <div style={{ fontSize: 22, fontWeight: 700 }}>
                {takeoff.takeoff.doors} Doors
              </div>
            </div>

            <div style={{ border: "1px solid #eee", borderRadius: 10, padding: 12 }}>
              <div style={{ fontSize: 13, opacity: 0.8 }}>Plan and settings</div>
              <div style={{ marginTop: 6 }}>
                <strong>Material</strong>: {material}
              </div>
              <div>
                <strong>Installation</strong>: {includeInstall ? "Included" : "Not included"}
              </div>
              <div>
                <strong>Scale</strong>: {scale} ft per pixel
              </div>
            </div>
          </div>

          {doorMix.length ? (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontWeight: 600 }}>Door types detected</div>
              <ul style={{ marginTop: 6 }}>
                {doorMix.slice(0, 6).map(([label, count]) => (
                  <li key={label}>
                    {label.replaceAll("_", " ")}: {count}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div style={{ marginTop: 12, fontSize: 13, opacity: 0.85 }}>
            {confidenceNote}
          </div>
        </div>
      ) : null}

      <div style={{ border: "1px solid #ddd", borderRadius: 12, padding: 16, marginTop: 16 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600 }}>Chat quoting agent</h2>

        {!takeoff ? (
          <p>Run takeoff first, then ask questions.</p>
        ) : (
          <>
            <div
              style={{
                maxHeight: 260,
                overflowY: "auto",
                padding: 12,
                border: "1px solid #eee",
                borderRadius: 10
              }}
            >
              {chat.map((m, i) => (
                <div key={i} style={{ marginBottom: 12 }}>
                  <strong>{m.role === "user" ? "You" : "Agent"}:</strong>
                  <div className="prose" style={{ marginTop: 4 }}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {m.content}
                    </ReactMarkdown>
                  </div>
                </div>
              ))}

              <div ref={chatBottomRef} />
            </div>

            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <input
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={onChatKeyDown}
                placeholder="Ask about counts, assumptions, material impacts, installation..."
                style={{ flex: 1, border: "1px solid #ddd", borderRadius: 10, padding: 10 }}
              />
              <button
                onClick={sendChat}
                style={{ padding: 10, border: "1px solid #333", borderRadius: 10, background: "white" }}
              >
                Send
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
