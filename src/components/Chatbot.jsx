import React, { useState, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send, Bot, Sparkles } from "lucide-react";

const QUICK_PROMPTS = [
  "What can this app do?",
  "Suggest a Focus event",
  "How does Schedule AI work?",
  "Tips for burnout",
  "How do I earn points?",
];

function buildLocalReply(question, { mode, displayName }) {
  const q = String(question || "").toLowerCase();
  const name = displayName?.split(" ")[0] || "there";
  const modeLabel = mode === "balance" ? "Balance" : "Focus";

  if (
    /what can|features|help me|what do you|this app|t-life|nexus/.test(q)
  ) {
    return `${name}, T-Life helps you with Focus/Balance event matching, Schedule AI free-slot suggestions, clubs, points/rewards, notifications, and an Admin wellness dashboard.`;
  }

  if (/focus|balance|mode|toggle/.test(q) && !/burnout|stress/.test(q)) {
    return `You're in ${modeLabel} Mode right now. Focus surfaces academic/tech events; Balance surfaces wellness and social ones. Flip the toggle on Home to switch instantly.`;
  }

  if (/schedule|timetable|free slot|free time|ai schedule/.test(q)) {
    return `Schedule AI reads your synced timetable, detects free slots between classes, and suggests matching campus events into those gaps. Turn Timetable Sync on in Profile → Privacy if your schedule looks empty.`;
  }

  if (/burnout|stress|wellness|tired|overwhelm/.test(q)) {
    return `If you're feeling stretched, switch to Balance Mode and try a short wellness event (yoga, run, mindfulness). Admins track campus burnout risk weekly so Student Affairs can target support.`;
  }

  if (/point|reward|gamif|leaderboard|redeem/.test(q)) {
    return `Earn points by RSVPing and checking into events. Open Profile for your progress, leaderboard standing, and reward redemptions.`;
  }

  if (/club|society|join|explore/.test(q)) {
    return `Open the Explore tab to browse clubs like Agents of Tech or Debate Club, view meeting times, and join/leave communities that match your goals.`;
  }

  if (/admin|dashboard|burnout score|match score/.test(q)) {
    return `Admin accounts see a shield icon for the dashboard: live student counts, RSVPs, Avg Match Score, attendance fill rate, and burnout risk by faculty.`;
  }

  if (/event|workshop|hackathon|yoga|suggest|recommend/.test(q)) {
    if (mode === "balance") {
      return `In Balance Mode, try Sunset Yoga & Mindfulness or Lakeside Campus Run — lighter activities that fit free slots without overloading your week.`;
    }
    return `In Focus Mode, strong picks are Imagine Hack, Cybersecurity Industry Panel, or a coding workshop — high match when they land in your free slots.`;
  }

  if (/notification|remind/.test(q)) {
    return `Notifications appear after you RSVP or check in. Tap the bell in the header to review reminders and activity updates.`;
  }

  if (/login|google|sign in|password/.test(q)) {
    return `T-Life is a university platform — sign in with your @taylors.edu.my or @sd.taylors.edu.my email and password. Use Sign Up if you need a new student account.`;
  }

  if (/hello|hi\b|hey|good morning|good afternoon/.test(q)) {
    return `Hey ${name}! I'm your T-Life assistant. Ask me about events, Schedule AI, clubs, points, or wellness tips.`;
  }

  return `I can help with Focus/Balance events, Schedule AI, clubs, points, and wellness. Try: "Suggest a ${modeLabel} event" or "How does Schedule AI work?"`;
}

async function askGroq(messages, userMessage, context) {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY;
  if (!apiKey) {
    return { source: "local", content: buildLocalReply(userMessage.content, context) };
  }

  const system = {
    role: "system",
    content: `You are Taylor's Nexus AI (T-Life) campus assistant for Taylor's University students.
Be warm, concise (1-3 short sentences), and practical.
Student name: ${context.displayName || "Student"}.
Current mode: ${context.mode === "balance" ? "Balance" : "Focus"}.
You know: Focus/Balance event feed, Schedule AI free-slot matching, Explore clubs, Profile points/rewards, notifications, privacy/timetable sync, and Admin burnout analytics.
If unsure, guide them to the right tab instead of inventing policies.`,
  };

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "llama-3.1-8b-instant",
      messages: [system, ...messages.slice(-8), userMessage],
      temperature: 0.6,
      max_tokens: 180,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message || "Groq request failed");
  }

  const content = data?.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("Empty model response");
  }

  return { source: "groq", content };
}

export default function Chatbot({ mode = "focus", displayName = "Student" }) {
  const context = useMemo(
    () => ({ mode, displayName }),
    [mode, displayName],
  );

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: `Hi${displayName && displayName !== "Student" ? ` ${displayName.split(" ")[0]}` : ""}! I'm your T-Life AI assistant. Ask about events, Schedule AI, clubs, or wellness.`,
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const hasGroq = Boolean(import.meta.env.VITE_GROQ_API_KEY);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendText = async (text) => {
    const trimmed = String(text || "").trim();
    if (!trimmed || loading) return;

    const userMessage = { role: "user", content: trimmed };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const reply = await askGroq(messages, userMessage, context);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: reply.content },
      ]);
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: buildLocalReply(trimmed, context),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = () => sendText(input);

  return (
    <div className="fixed bottom-24 right-5 z-50">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="absolute bottom-16 right-0 w-[22rem] max-w-[calc(100vw-2.5rem)] bg-[#1a1a24] border border-white/10 shadow-2xl rounded-2xl overflow-hidden flex flex-col"
            style={{ height: "440px" }}
          >
            <div className="bg-gradient-to-r from-taylor-red to-[#8a1525] p-4 flex justify-between items-center">
              <div className="flex items-center gap-2 text-white font-bold">
                <Bot size={20} />
                <div className="leading-tight">
                  <span className="block text-sm">T-Life AI</span>
                  <span className="block text-[10px] font-normal text-white/80">
                    {hasGroq ? "Groq-powered · campus guide" : "Campus guide · demo mode"}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-white/80 hover:text-white"
                aria-label="Close chatbot"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#0a0506]">
              {messages.map((msg, idx) => (
                <div
                  key={`${msg.role}-${idx}`}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-taylor-red text-white rounded-br-none"
                        : "bg-white/10 text-gray-200 rounded-bl-none"
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="bg-white/10 text-gray-200 rounded-2xl rounded-bl-none px-4 py-2 text-sm animate-pulse flex items-center gap-2">
                    <Sparkles size={14} className="text-taylor-red" />
                    Thinking...
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="px-3 pt-2 pb-1 bg-[#1a1a24] flex gap-2 overflow-x-auto no-scrollbar">
              {QUICK_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  disabled={loading}
                  onClick={() => sendText(prompt)}
                  className="shrink-0 text-[10px] px-2.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 hover:text-white disabled:opacity-50"
                >
                  {prompt}
                </button>
              ))}
            </div>

            <div className="p-3 bg-[#1a1a24] border-t border-white/5 flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Ask about events, schedule, wellness..."
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-taylor-red"
              />
              <button
                type="button"
                onClick={handleSend}
                disabled={loading || !input.trim()}
                className="bg-taylor-red text-white p-2 rounded-xl disabled:opacity-50"
                aria-label="Send message"
              >
                <Send size={18} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        type="button"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 bg-taylor-red rounded-full flex items-center justify-center text-white shadow-lg shadow-taylor-red/30 border border-white/20"
        aria-label={isOpen ? "Close chatbot" : "Open chatbot"}
      >
        {isOpen ? <X size={24} /> : <MessageCircle size={24} />}
      </motion.button>
    </div>
  );
}
