// ============================================
// FLOWZONE AI - PART 4: UI, FEATURES & INTEGRATION - FIXED
// ============================================

// ============================================
// EVENT LISTENERS
// ============================================

function setupEventListeners() {
  // Navigation tabs
  document.querySelectorAll(".nav-tab").forEach(tab => {
    tab.addEventListener("click", () => handleTabChange(tab.dataset.section));
  });
  
  // Focus session toggle
  const toggleBtn = document.getElementById("toggleTracking");
  if (toggleBtn) {
    toggleBtn.addEventListener("click", toggleFocusSession);
  }
  
  // Chat functionality
  const chatInput = document.getElementById("chatInput");
  const sendBtn = document.getElementById("sendBtn");
  const voiceBtn = document.getElementById("voiceBtn");
  
  if (chatInput && sendBtn) {
    chatInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });
    
    sendBtn.addEventListener("click", sendMessage);
  }
  
  // Voice input
  if (voiceBtn) {
    voiceBtn.addEventListener("click", toggleVoiceInput);
  }
  
  // Quick action buttons
  document.querySelectorAll(".quick-action-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const prompt = btn.dataset.prompt;
      if (prompt) {
        document.getElementById("chatInput").value = prompt;
        sendMessage();
      }
    });
  });
  
  // Settings button
  const settingsBtn = document.getElementById("settingsBtn");
  if (settingsBtn) {
    settingsBtn.addEventListener("click", showSettings);
  }
  
  console.log("✅ Event listeners configured");
}

// ============================================
// VOICE INPUT
// ============================================

let recognition = null;
let isRecording = false;

function initVoiceRecognition() {
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    console.log("Speech recognition not supported");
    return null;
  }
  
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const rec = new SpeechRecognition();
  
  rec.continuous = false;
  rec.interimResults = false;
  rec.lang = 'en-US';
  
  rec.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    const chatInput = document.getElementById("chatInput");
    if (chatInput) {
      chatInput.value = transcript;
    }
    isRecording = false;
    updateVoiceButton();
    
    // Auto-send after voice input
    setTimeout(() => {
      sendMessage();
    }, 500);
  };
  
  rec.onerror = (event) => {
    console.error("Speech recognition error:", event.error);
    isRecording = false;
    updateVoiceButton();
    showNotification("⚠️ Voice input error: " + event.error, 3000);
  };
  
  rec.onend = () => {
    isRecording = false;
    updateVoiceButton();
  };
  
  return rec;
}

function toggleVoiceInput() {
  if (!recognition) {
    recognition = initVoiceRecognition();
    if (!recognition) {
      showNotification("⚠️ Voice input not supported in this browser", 4000);
      return;
    }
  }
  
  if (isRecording) {
    recognition.stop();
    isRecording = false;
  } else {
    try {
      recognition.start();
      isRecording = true;
      showNotification("🎤 Listening... Speak now!", 3000);
    } catch (e) {
      console.error("Failed to start recognition:", e);
    }
  }
  
  updateVoiceButton();
}

function updateVoiceButton() {
  const voiceBtn = document.getElementById("voiceBtn");
  if (!voiceBtn) return;
  
  if (isRecording) {
    voiceBtn.classList.add("recording");
  } else {
    voiceBtn.classList.remove("recording");
  }
}

// ============================================
// NAVIGATION
// ============================================

function handleTabChange(sectionId) {
  document.querySelectorAll(".section").forEach(section => {
    if (section.id === sectionId) {
      section.classList.add("active");
    } else {
      section.classList.remove("active");
    }
  });
  
  document.querySelectorAll(".nav-tab").forEach(tab => {
    if (tab.dataset.section === sectionId) {
      tab.classList.add("active");
    } else {
      tab.classList.remove("active");
    }
  });
  
  state.currentSection = sectionId;
  
  if (typeof lucide !== "undefined") {
    lucide.createIcons();
  }
  
  if (sectionId === "ai-coach" && !state.apiKey) {
    setTimeout(() => {
      showNotification("💡 Add your Gemini API key to unlock AI coaching features!", 5000);
    }, 500);
  }
}

// ============================================
// AI CHAT FUNCTIONALITY - FIXED
// ============================================

function sendMessage() {
  const input = document.getElementById("chatInput");
  const container = document.getElementById("chatContainer");
  const sendBtn = document.getElementById("sendBtn");
  
  if (!input || !container) return;
  
  const text = input.value.trim();
  if (!text) return;
  
  // Add user message
  addChatMessage(text, "user");
  input.value = "";
  
  // Disable input while processing
  input.disabled = true;
  if (sendBtn) sendBtn.disabled = true;
  
  // Add thinking indicator
  const thinkingId = "thinking-" + Date.now();
  addChatMessage("Thinking...", "bot", thinkingId);
  
  // Process with AI or fallback
  if (state.apiKey) {
    sendToGeminiAI(text)
      .then(response => {
        removeChatMessage(thinkingId);
        addChatMessage(response, "bot");
      })
      .catch(error => {
        console.error("AI Error:", error);
        removeChatMessage(thinkingId);
        const fallback = getFallbackResponse(text);
        addChatMessage(fallback + "\n\n⚠️ " + error.message, "bot");
      })
      .finally(() => {
        input.disabled = false;
        if (sendBtn) sendBtn.disabled = false;
        input.focus();
      });
  } else {
    setTimeout(() => {
      removeChatMessage(thinkingId);
      const response = getFallbackResponse(text);
      addChatMessage(response + "\n\n💡 Add API key in Settings for AI-powered coaching!", "bot");
      
      input.disabled = false;
      if (sendBtn) sendBtn.disabled = false;
      input.focus();
    }, 800);
  }
}

function addChatMessage(text, type, id) {
  const container = document.getElementById("chatContainer");
  if (!container) return;
  
  const messageDiv = document.createElement("div");
  messageDiv.className = `chat-message ${type}-message`;
  if (id) messageDiv.id = id;
  
  const isBot = type === "bot";
  const icon = isBot ? "brain" : "user";
  const author = isBot ? "FlowZone AI" : "You";
  
  messageDiv.innerHTML = `
    <div class="message-avatar">
      <i data-lucide="${icon}"></i>
    </div>
    <div class="message-content">
      <div class="message-author">${author}</div>
      <p>${escapeHtml(text).replace(/\n/g, '<br>')}</p>
    </div>
  `;
  
  container.appendChild(messageDiv);
  container.scrollTop = container.scrollHeight;
  
  if (typeof lucide !== "undefined") {
    lucide.createIcons();
  }
}

function removeChatMessage(id) {
  const msg = document.getElementById(id);
  if (msg) msg.remove();
}

async function sendToGeminiAI(userText) {
  const context = {
    flowScore: state.flowScore,
    sessionTime: Math.floor(state.sessionTime / 60),
    isTracking: state.isTracking,
    streak: state.currentStreak,
    totalSessions: state.totalSessions
  };
  
  const prompt = `You are FlowZone AI, an expert focus and productivity coach. Provide helpful, encouraging, and actionable advice.

USER CONTEXT:
- Current Flow Score: ${context.flowScore}%
- Session Duration: ${context.sessionTime} minutes
- Currently Tracking: ${context.isTracking ? 'Yes' : 'No'}
- Streak: ${context.streak} days
- Total Sessions: ${context.totalSessions}

USER QUESTION: "${userText}"

Provide specific, actionable advice in 2-4 sentences. Be encouraging and reference their context when relevant.`;

  try {
    const response = await fetch(`${CONFIG.GEMINI_API_URL}?key=${state.apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ 
          parts: [{ text: prompt }] 
        }],
        generationConfig: { 
          temperature: 0.7, 
          maxOutputTokens: 400,
          topP: 0.8,
          topK: 40
        }
      })
    });
    
    if (!response.ok) {
      if (response.status === 429) {
        throw new Error("API quota exceeded. Wait a minute or create a new API key at https://aistudio.google.com/app/apikey");
      }
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`API error (${response.status}): ${errorData.error?.message || 'Unknown error'}`);
    }
    
    const data = await response.json();
    
    // Extract text from response
    if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts) {
      const aiText = data.candidates[0].content.parts[0].text;
      return aiText.trim();
    }
    
    throw new Error("Invalid response format from AI");
    
  } catch (error) {
    console.error("Gemini API error:", error);
    throw error;
  }
}

function getFallbackResponse(text) {
  const lower = text.toLowerCase();
  
  if (lower.includes("focus") || lower.includes("concentrate")) {
    return "🎯 To improve focus: 1) Eliminate distractions (close tabs, silence phone), 2) Use Pomodoro (25 min work, 5 min break), 3) Start tracking now to identify your patterns!";
  }
  
  if (lower.includes("procrastinat") || lower.includes("motivat")) {
    return "⚡ Beat procrastination: Break tasks into 5-minute chunks, use the 2-minute rule (do it if <2min), and start a session right now - momentum creates motivation!";
  }
  
  if (lower.includes("distract") || lower.includes("interrupt")) {
    return "🧠 Manage distractions: Use website blockers, wear headphones, set specific times for messages. Your tab switches are tracked - try to minimize them!";
  }
  
  if (lower.includes("habit") || lower.includes("routine")) {
    return "📚 Build habits: Stack new habits onto existing ones, make it easy, track daily. FlowZone helps - start sessions consistently to build your streak!";
  }
  
  if (lower.includes("break") || lower.includes("tired") || lower.includes("rest")) {
    return "🧘 Smart breaks: Use 52-17 rule (52 min work, 17 min break) or Pomodoro. During breaks: move, look away, hydrate. Try our Breathing Exercise!";
  }
  
  if (lower.includes("product") || lower.includes("efficient")) {
    return "💪 Boost productivity: Work in peak hours (check Dashboard), single-task, use FlowZone to track patterns. Your current streak: " + state.currentStreak + " days!";
  }
  
  if (lower.includes("time") || lower.includes("manage")) {
    return "⏰ Time management: Time-block your calendar, batch similar tasks, prioritize with Eisenhower Matrix. Use FlowZone to find your optimal work hours!";
  }
  
  return "💡 Great question! Start a focus session to let FlowZone analyze your patterns. Check Quick Actions for Breathing exercises, Pomodoro mode, or export your data!";
}

// ============================================
// ADVANCED FEATURES
// ============================================

window.startBreathingExercise = function() {
  const html = `
    <div style="text-align:center;">
      <div style="font-size: 3rem; margin-bottom: 1rem; animation: pulse 2s infinite;">🧘</div>
      <h3 style="margin-bottom:1rem; font-size: 1.5rem;">Breathing Exercise</h3>
      <p style="margin-bottom:1rem; font-size: 1.1rem;">Follow this calming pattern:</p>
      <div style="background: rgba(139, 92, 246, 0.2); padding: 1.5rem; border-radius: 1rem; margin: 1rem 0;">
        <p style="font-size: 1.25rem; margin: 0.5rem 0;"><strong style="color: #8b5cf6;">Inhale</strong> for 4 seconds</p>
        <p style="font-size: 1.25rem; margin: 0.5rem 0;"><strong style="color: #06b6d4;">Hold</strong> for 4 seconds</p>
        <p style="font-size: 1.25rem; margin: 0.5rem 0;"><strong style="color: #10b981;">Exhale</strong> for 4 seconds</p>
        <p style="font-size: 1.25rem; margin: 0.5rem 0;"><strong style="color: #f97316;">Hold</strong> for 4 seconds</p>
      </div>
      <p style="margin-top:1rem;color:#94a3b8;">Repeat 5 times for best results</p>
    </div>
  `;
  showNotification(html, 12000);
  playFocusSound("start");
};

window.startPomodoroMode = function() {
  const html = `
    <div style="text-align:center;">
      <div style="font-size: 3rem; margin-bottom: 1rem;">🍅</div>
      <h3 style="margin-bottom:1rem; font-size: 1.5rem;">Pomodoro Mode Activated</h3>
      <p style="margin-bottom: 1rem;">The classic productivity technique:</p>
      <div style="background: rgba(16, 185, 129, 0.2); padding: 1rem; border-radius: 1rem; text-align: left;">
        <p style="margin: 0.5rem 0;">✅ Work for 25 minutes</p>
        <p style="margin: 0.5rem 0;">☕ Break for 5 minutes</p>
        <p style="margin: 0.5rem 0;">🔁 Repeat 4 times</p>
        <p style="margin: 0.5rem 0;">🎉 Take 15-30 min break</p>
      </div>
      <p style="margin-top: 1rem; color: #94a3b8;">FlowZone will notify you at each interval!</p>
    </div>
  `;
  showNotification(html, 10000);
  
  if (!state.isTracking) {
    setTimeout(() => {
      const btn = document.getElementById("toggleTracking");
      if (btn) btn.click();
    }, 2000);
  }
};

window.enableFocusMode = function() {
  const html = `
    <div style="text-align:center;">
      <div style="font-size: 3rem; margin-bottom: 1rem;">🔒</div>
      <h3 style="margin-bottom:1rem; font-size: 1.5rem;">Focus Mode Tips</h3>
      <div style="background: rgba(6, 182, 212, 0.2); padding: 1rem; border-radius: 1rem; text-align: left;">
        <p style="margin: 0.5rem 0;">🚫 Close unnecessary tabs</p>
        <p style="margin: 0.5rem 0;">🔕 Mute all notifications</p>
        <p style="margin: 0.5rem 0;">📵 Put phone on silent</p>
        <p style="margin: 0.5rem 0;">🎯 Set clear goals</p>
        <p style="margin: 0.5rem 0;">⏱️ Use time blocking</p>
      </div>
      <p style="margin-top: 1rem; color: #10b981; font-weight: bold;">You're now in Focus Mode!</p>
    </div>
  `;
  showNotification(html, 10000);
  playFocusSound("start");
};

window.exportSessionData = function() {
  const history = JSON.parse(localStorage.getItem("flowzone_session_history") || "[]");
  
  if (history.length === 0) {
    showNotification("📊 No session data yet. Complete some focus sessions first!", 5000);
    return;
  }
  
  const headers = ["Date", "Time", "Duration (min)", "Avg Flow %", "Peak Flow %", "Tab Switches", "Typing Speed", "Productivity"];
  const rows = history.map(s => [
    new Date(s.timestamp).toLocaleDateString(),
    new Date(s.timestamp).toLocaleTimeString(),
    Math.floor(s.duration / 60),
    s.avgFlowScore,
    s.peakFlow,
    s.tabSwitches,
    s.avgTypingSpeed,
    s.productivity
  ]);
  
  const csv = [headers, ...rows].map(row => row.join(",")).join("\n");
  
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `flowzone-sessions-${Date.now()}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  showNotification(`✅ Exported ${history.length} sessions successfully!`, 5000);
  playFocusSound("end");
};

// ============================================
// SETTINGS MODAL
// ============================================

function showSettings() {
  const hasKey = !!state.apiKey;
  const keyPreview = hasKey ? state.apiKey.substring(0, 15) + "..." : "Not set";
  
  const html = `
    <div style="text-align: left;">
      <h3 style="margin-bottom: 1.5rem; font-size: 1.5rem;">⚙️ Settings</h3>
      
      <div style="margin-bottom: 1.5rem; padding: 1rem; background: rgba(139, 92, 246, 0.1); border-radius: 0.75rem;">
        <strong style="font-size: 1.1rem;">API Key</strong><br>
        <span style="color: #94a3b8; font-size: 0.9rem;">${escapeHtml(keyPreview)}</span><br>
        <button onclick="showApiModal()" style="margin-top: 0.75rem; padding: 0.5rem 1.5rem; background: linear-gradient(135deg, #8b5cf6, #06b6d4); border: none; border-radius: 0.5rem; color: white; cursor: pointer; font-weight: 600;">
          ${hasKey ? "Change" : "Add"} API Key
        </button>
      </div>
      
      <div style="margin-bottom: 1.5rem; padding: 1rem; background: rgba(16, 185, 129, 0.1); border-radius: 0.75rem;">
        <strong style="font-size: 1.1rem;">📊 Your Stats</strong><br>
        <p style="margin: 0.5rem 0; color: #94a3b8;">Streak: <strong style="color: #10b981;">${state.currentStreak} days</strong></p>
        <p style="margin: 0.5rem 0; color: #94a3b8;">Total Sessions: <strong style="color: #06b6d4;">${state.totalSessions}</strong></p>
        <p style="margin: 0.5rem 0; color: #94a3b8;">Current Flow: <strong style="color: #8b5cf6;">${Math.round(state.flowScore)}%</strong></p>
      </div>
      
      <div style="padding: 1rem; background: rgba(6, 182, 212, 0.1); border-radius: 0.75rem;">
        <strong style="font-size: 1.1rem;">🤖 Features</strong><br>
        <p style="margin: 0.5rem 0; color: #94a3b8;">✅ Real-time behavioral tracking</p>
        <p style="margin: 0.5rem 0; color: #94a3b8;">✅ Voice input for chat</p>
        <p style="margin: 0.5rem 0; color: #94a3b8;">✅ Adaptive learning system</p>
        <p style="margin: 0.5rem 0; color: #94a3b8;">${state.apiKey ? '✅' : '⚠️'} AI-powered analysis</p>
      </div>
    </div>
  `;
  
  showNotification(html, 15000);
}

// ============================================
// API KEY MODAL
// ============================================

function showApiModal() {
  const existing = document.getElementById("flowzone_api_modal");
  if (existing) {
    existing.remove();
    return;
  }
  
  const modal = document.createElement("div");
  modal.id = "flowzone_api_modal";
  modal.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,0.85);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;z-index:10000;animation:fadeIn 0.3s ease;";
  
  const box = document.createElement("div");
  box.style.cssText = "background:#0f172a;border:1px solid rgba(139,92,246,0.3);border-radius:1.5rem;padding:2rem;max-width:500px;width:90%;box-shadow:0 25px 50px rgba(0,0,0,0.5);";
  
  box.innerHTML = `
    <h3 style="margin:0 0 1rem 0;font-size:1.75rem;background:linear-gradient(135deg,#8b5cf6,#06b6d4);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">🔑 Gemini API Key</h3>
    <p style="color:#94a3b8;margin:0 0 1.5rem 0;line-height:1.6;">Get your free API key from <a href="https://aistudio.google.com/app/apikey" target="_blank" style="color:#06b6d4;text-decoration:none;font-weight:600;">Google AI Studio</a></p>
    <input type="text" id="flowzone_api_input" placeholder="AIzaSy..." value="${state.apiKey || ''}" style="width:100%;padding:0.75rem 1rem;border-radius:0.75rem;border:1px solid rgba(139,92,246,0.3);background:#1e293b;color:white;font-size:1rem;margin-bottom:1.5rem;" />
    <div style="display:flex;gap:0.75rem;">
      <button onclick="closeApiModal()" style="flex:1;padding:0.75rem;border-radius:0.75rem;border:1px solid rgba(255,255,255,0.1);background:#1e293b;color:white;cursor:pointer;font-size:1rem;">Skip</button>
      <button onclick="saveApiKeyFromModal()" style="flex:1;padding:0.75rem;border-radius:0.75rem;border:none;background:linear-gradient(135deg,#8b5cf6,#06b6d4);color:white;cursor:pointer;font-weight:600;font-size:1rem;">Save Key</button>
    </div>
  `;
  
  modal.appendChild(box);
  document.body.appendChild(modal);
  
  document.getElementById("flowzone_api_input").focus();
}

function closeApiModal() {
  const modal = document.getElementById("flowzone_api_modal");
  if (modal) modal.remove();
}

window.saveApiKeyFromModal = function() {
  const input = document.getElementById("flowzone_api_input");
  const key = input.value.trim();
  
  if (!key) {
    showNotification("⚠️ Please enter a valid API key", 4000);
    return;
  }
  
  if (!key.startsWith("AIza")) {
    showNotification("⚠️ Invalid API key format. Should start with 'AIza'", 4000);
    return;
  }
  
  state.apiKey = key;
  localStorage.setItem(CONFIG.STORAGE_KEY, key);
  
  closeApiModal();
  showNotification("✅ API key saved! AI features now enabled.", 5000);
  
  console.log("✅ API key configured");
};

// ============================================
// NOTIFICATION SYSTEM
// ============================================

function showNotification(htmlContent, duration = 7000) {
  const containerId = "flowzone_notifications";
  let container = document.getElementById(containerId);
  
  if (!container) {
    container = document.createElement("div");
    container.id = containerId;
    container.style.cssText = "position:fixed;bottom:20px;right:20px;z-index:9999;display:flex;flex-direction:column;gap:10px;max-width:400px;";
    document.body.appendChild(container);
  }
  
  const notification = document.createElement("div");
  notification.style.cssText = "background:linear-gradient(135deg,rgba(15,23,42,0.95),rgba(30,27,75,0.95));backdrop-filter:blur(10px);color:white;padding:1.25rem;border-radius:1rem;box-shadow:0 10px 25px rgba(0,0,0,0.4);border:1px solid rgba(139,92,246,0.3);animation:slideIn 0.3s ease;";
  
  notification.innerHTML = `
    <div style="display:flex;align-items:start;gap:0.75rem;">
      <div style="flex:1;">${htmlContent}</div>
      <button onclick="this.parentElement.parentElement.remove()" style="background:transparent;border:none;color:rgba(255,255,255,0.6);font-size:1.5rem;cursor:pointer;line-height:1;padding:0;width:24px;height:24px;display:flex;align-items:center;justify-content:center;">×</button>
    </div>
  `;
  
  container.appendChild(notification);
  
  if (duration > 0) {
    setTimeout(() => {
      notification.style.animation = "slideOut 0.3s ease";
      setTimeout(() => notification.remove(), 300);
    }, duration);
  }
}

// ============================================
// SOUND SYSTEM
// ============================================

function playFocusSound(type = "start") {
  if (!CONFIG.FOCUS_SOUND_ENABLED) return;
  
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = "sine";
    
    if (type === "start") {
      osc.frequency.value = 523.25;
    } else if (type === "end") {
      osc.frequency.value = 392.00;
    } else if (type === "warning") {
      osc.frequency.value = 293.66;
    } else {
      osc.frequency.value = 440.00;
    }
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    gain.gain.value = 0.1;
    
    osc.start();
    setTimeout(() => {
      osc.stop();
      ctx.close();
    }, 150);
  } catch (e) {
    // Audio blocked
  }
}

const style = document.createElement("style");
style.textContent = `
  @keyframes slideIn {
    from { opacity: 0; transform: translateX(100px); }
    to { opacity: 1; transform: translateX(0); }
  }
  @keyframes slideOut {
    from { opacity: 1; transform: translateX(0); }
    to { opacity: 0; transform: translateX(100px); }
  }
    @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes pulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.1); }
  }
`;
document.head.appendChild(style);

console.log("✅ Part 4 loaded: UI & Features with Voice Input");
console.log("🎉 FlowZone AI FULLY LOADED - All systems operational!");