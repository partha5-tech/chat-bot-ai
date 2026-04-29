// ==================== CONFIG ====================
const API_KEY = "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";
const MODEL   = "google/gemini-2.5-flash";

// ==================== DOM ====================
const chatBox   = document.getElementById("chat-box");
const input     = document.getElementById("user-input");
const sendBtn   = document.getElementById("send-btn");
const charCount = document.getElementById("char-count");
const histList  = document.getElementById("history-list");

// ==================== STATE ====================
let sessions       = [];   // [{ id, title, messages: [{role,content}] }]
let activeSession  = null; // id of active session
let isLoading      = false;

// ==================== PERSISTENCE ====================
function saveAll() {
  localStorage.setItem("geminiSessions", JSON.stringify(sessions));
  localStorage.setItem("geminiActiveSession", activeSession);
}

function loadAll() {
  const raw = localStorage.getItem("geminiSessions");
  if (raw) {
    sessions = JSON.parse(raw);
    activeSession = localStorage.getItem("geminiActiveSession") || (sessions[0]?.id ?? null);
  }
  if (!sessions.length) createSession();
  else {
    if (!sessions.find(s => s.id === activeSession)) activeSession = sessions[0].id;
    renderSidebar();
    renderMessages();
  }
}

// ==================== SESSIONS ====================
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function createSession(switchTo = true) {
  const session = { id: generateId(), title: "New Chat", messages: [] };
  sessions.unshift(session);
  if (switchTo) {
    activeSession = session.id;
    saveAll();
    renderSidebar();
    renderMessages();
  }
  return session;
}

function getActiveSession() {
  return sessions.find(s => s.id === activeSession) || null;
}

function switchSession(id) {
  if (id === activeSession) return;
  activeSession = id;
  saveAll();
  renderSidebar();
  renderMessages();
}

function deleteSession(id, e) {
  e.stopPropagation();
  sessions = sessions.filter(s => s.id !== id);
  if (!sessions.length) createSession();
  else {
    if (activeSession === id) activeSession = sessions[0].id;
    saveAll();
    renderSidebar();
    renderMessages();
  }
}

function newChat() {
  createSession(true);
}

function clearCurrentChat() {
  const s = getActiveSession();
  if (!s) return;
  if (s.messages.length === 0) return;
  if (!confirm("Clear this conversation?")) return;
  s.messages = [];
  s.title = "New Chat";
  saveAll();
  renderSidebar();
  renderMessages();
}

function toggleSidebar() {
  document.querySelector(".sidebar").classList.toggle("collapsed");
}

// ==================== RENDER SIDEBAR ====================
function renderSidebar() {
  histList.innerHTML = "";
  sessions.forEach(s => {
    const item = document.createElement("div");
    item.className = "history-item" + (s.id === activeSession ? " active" : "");
    item.onclick = () => switchSession(s.id);

    const icon = document.createElement("span");
    icon.className = "chat-icon";
    icon.textContent = "💬";

    const label = document.createElement("span");
    label.className = "chat-label";
    label.textContent = s.title;

    const del = document.createElement("span");
    del.className = "delete-session";
    del.title = "Delete";
    del.textContent = "×";
    del.onclick = (e) => deleteSession(s.id, e);

    item.appendChild(icon);
    item.appendChild(label);
    item.appendChild(del);
    histList.appendChild(item);
  });
}

// ==================== RENDER MESSAGES ====================
function renderMessages() {
  chatBox.innerHTML = "";
  const s = getActiveSession();
  if (!s || s.messages.length === 0) {
    showWelcome();
    return;
  }
  s.messages.forEach(msg => {
    appendBubble(msg.role === "user" ? "user" : "bot", msg.content, false);
  });
}

function showWelcome() {
  chatBox.innerHTML = `
    <div class="welcome-msg">
      <div class="welcome-icon">✦</div>
      <h2>Hello, I'm Gemini</h2>
      <p>Powered by Google Gemini 2.5 Flash · OpenRouter</p>
      <div class="suggestions">
        <button class="suggestion-chip" onclick="useSuggestion('Explain quantum computing simply')">Explain quantum computing</button>
        <button class="suggestion-chip" onclick="useSuggestion('Write a short poem about the ocean')">Write a poem</button>
        <button class="suggestion-chip" onclick="useSuggestion('Give me 5 productivity tips')">Productivity tips</button>
        <button class="suggestion-chip" onclick="useSuggestion('What are the latest AI trends?')">Latest AI trends</button>
      </div>
    </div>
  `;
}

// ==================== BUBBLES ====================
function appendBubble(role, text, save = true) {
  // Remove welcome if present
  const welcome = chatBox.querySelector(".welcome-msg");
  if (welcome) welcome.remove();

  const wrap   = document.createElement("div");
  wrap.className = `message ${role}`;

  const avatar = document.createElement("div");
  avatar.className = "avatar";
  avatar.textContent = role === "bot" ? "✦" : "U";

  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.innerHTML  = formatText(text);

  wrap.appendChild(avatar);
  wrap.appendChild(bubble);
  chatBox.appendChild(wrap);
  scrollBottom();

  if (save) {
    const s = getActiveSession();
    if (!s) return;
    s.messages.push({ role: role === "user" ? "user" : "assistant", content: text });
    // Auto-title from first user message
    if (s.messages.length === 1 && role === "user") {
      s.title = text.slice(0, 38) + (text.length > 38 ? "…" : "");
    }
    saveAll();
    renderSidebar();
  }
}

function appendThinking() {
  const wrap = document.createElement("div");
  wrap.className = "message bot";
  wrap.id = "thinking";
  wrap.innerHTML = `
    <div class="avatar">✦</div>
    <div class="thinking-bubble">
      <span>Thinking</span>
      <div class="dots">
        <span class="dot"></span><span class="dot"></span><span class="dot"></span>
      </div>
    </div>`;
  chatBox.appendChild(wrap);
  scrollBottom();
}

function removeThinking() {
  const el = document.getElementById("thinking");
  if (el) el.remove();
}

// ==================== FORMAT ====================
function formatText(text) {
  return text
    .replace(/&/g,  "&amp;")
    .replace(/</g,  "&lt;")
    .replace(/>/g,  "&gt;")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g,     "<em>$1</em>")
    .replace(/`(.+?)`/g,       "<code>$1</code>")
    .replace(/\n/g,            "<br>");
}

// ==================== INPUT HELPERS ====================
function autoResize(el) {
  el.style.height = "auto";
  el.style.height = Math.min(el.scrollHeight, 140) + "px";
}

function updateCharCount(el) {
  const n = el.value.length;
  charCount.textContent = `${n} / 2000`;
  charCount.classList.toggle("warn", n > 1800);
}

function handleKey(e) {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
}

function useSuggestion(text) {
  input.value = text;
  autoResize(input);
  updateCharCount(input);
  sendMessage();
}

function scrollBottom() {
  chatBox.scrollTo({ top: chatBox.scrollHeight, behavior: "smooth" });
}

// ==================== API ====================
async function sendMessage() {
  const text = input.value.trim();
  if (!text || isLoading) return;

  isLoading = true;
  sendBtn.disabled = true;
  input.value = "";
  autoResize(input);
  updateCharCount(input);

  appendBubble("user", text);
  appendThinking();

  // Build message history for context
  const s = getActiveSession();
  const contextMessages = s ? s.messages.slice(0, -1) : []; // exclude the one just pushed (will resend)
  const messagesForAPI  = [...contextMessages, { role: "user", content: text }];

  try {
    const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": window.location.href,
        "X-Title": "Gemini Chat UI"
      },
      body: JSON.stringify({
        model: MODEL,
        messages: messagesForAPI,
        temperature: 0.75,
        max_tokens: 1200
      })
    });

    if (!resp.ok) {
      const errorText = await resp.text();
      console.error("API Error:", resp.status, errorText);
      throw new Error(`Server returned ${resp.status}: ${errorText}`);
    }
    
    const data  = await resp.json();
    
    if (!data.choices || !data.choices[0]) {
      throw new Error("Invalid response format from API");
    }
    
    const reply = data.choices[0].message.content;

    removeThinking();
    appendBubble("bot", reply);

  } catch (err) {
    removeThinking();
    // Show more helpful error message
    let errorMsg = "⚠️ Sorry, I couldn't reach the server. Please try again.";
    
    if (err.message.includes("401") || err.message.includes("403")) {
      errorMsg = "⚠️ Invalid API key. Please check your OpenRouter API key in script.js";
    } else if (err.message.includes("429")) {
      errorMsg = "⚠️ Too many requests. Please wait a moment and try again.";
    } else if (err.message.includes("500") || err.message.includes("502")) {
      errorMsg = "⚠️ Server error. The API service is temporarily unavailable.";
    } else if (err.message.includes("Failed to fetch") || err.message.includes("NetworkError")) {
      errorMsg = "⚠️ Network error. Check your internet connection.";
    }
    
    appendBubble("bot", errorMsg);
    console.error("Chat error:", err);
  }

  isLoading = false;
  sendBtn.disabled = false;
  input.focus();
}

// ==================== INIT ====================
window.onload = () => {
  loadAll();
  input.focus();
};
