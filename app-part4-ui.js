// ============================================
// FLOWZONE AI - PART 4: UI, FEATURES & INTEGRATION - COMPLETE FIXED
// Replace your entire app-part4-ui.js with this file
// ============================================

// Fallback if marked.js doesn't load
if (typeof marked === 'undefined') {
  window.marked = {
    parse: (text) => {
      return text
        .replace(/### (.*)/g, '<h3>$1</h3>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\* /g, '• ')
        .replace(/\n\n/g, '</p><p>')
        .replace(/\n/g, '<br>');
    }
  };
}

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
      showNotification("💡 Add your Gemini API key in Settings to unlock AI-powered coaching!", 5000);
    }, 500);
  }
}

// ============================================
// AI CHAT FUNCTIONALITY - COMPLETE FIXED
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
      addChatMessage(response + "\n\n💡 *Add API key in Settings for AI-powered coaching!*", "bot");
      
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
  
  // Convert markdown to HTML for bot messages
  let processedText = text;
  if (isBot && typeof marked !== 'undefined') {
    try {
      processedText = marked.parse(text);
    } catch (e) {
      console.error("Markdown parsing error:", e);
      processedText = escapeHtml(text).replace(/\n/g, '<br>');
    }
  } else {
    processedText = escapeHtml(text).replace(/\n/g, '<br>');
  }
  
  messageDiv.innerHTML = `
    <div class="message-avatar">
      <i data-lucide="${icon}"></i>
    </div>
    <div class="message-content">
      <div class="message-author">${author}</div>
      <div class="message-text">${processedText}</div>
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
    totalSessions: state.totalSessions,
    tabSwitches: state.tabSwitches,
    avgTyping: calculateAverage(state.typingSpeed).toFixed(0)
  };
  
  const prompt = `You are FlowZone AI, an expert focus and productivity coach. You provide detailed, actionable advice with proper structure.

USER CONTEXT:
- Current Flow Score: ${context.flowScore}% ${context.flowScore >= 80 ? '(Excellent!)' : context.flowScore >= 60 ? '(Good)' : '(Needs improvement)'}
- Session Duration: ${context.sessionTime} minutes
- Currently Tracking: ${context.isTracking ? 'Yes ✓' : 'No'}
- Current Streak: ${context.streak} days ${context.streak >= 7 ? '🔥' : ''}
- Total Sessions Completed: ${context.totalSessions}
- Tab Switches Today: ${context.tabSwitches}
- Typing Speed: ${context.avgTyping} keys/min

USER QUESTION: "${userText}"

INSTRUCTIONS:
1. Provide a comprehensive, detailed response (4-8 sentences minimum)
2. Reference the user's specific context and metrics when relevant
3. Structure your response with clear sections if needed
4. Use markdown formatting:
   - **Bold** for emphasis
   - Use bullet points (•) for lists
   - Use numbers (1., 2., 3.) for steps
   - Use ### for section headers if needed
5. Be encouraging and specific
6. Include actionable advice they can implement immediately
7. If their metrics are good, praise them. If struggling, provide solutions.

Respond in markdown format with proper structure.`;

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
          maxOutputTokens: 800,
          topP: 0.9,
          topK: 40
        }
      })
    });
    
    if (!response.ok) {
      if (response.status === 429) {
        throw new Error("API quota exceeded. Wait 60 seconds or create a new API key at https://aistudio.google.com/app/apikey");
      }
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`API error (${response.status}): ${errorData.error?.message || 'Unknown error'}`);
    }
    
    const data = await response.json();
    
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
    return `### 🎯 Improving Your Focus

Here are proven strategies to enhance concentration:

**1. Environment Optimization**
• Eliminate visual and auditory distractions
• Close unnecessary browser tabs (you have ${state.tabSwitches} switches today)
• Use noise-canceling headphones or ambient sound

**2. Technique Implementation**
• **Pomodoro Technique**: 25 minutes focused work, 5 minute breaks
• **Time Blocking**: Schedule specific tasks for specific hours
• **Single-Tasking**: Focus on ONE thing at a time

**3. Leverage FlowZone**
• Start tracking now to identify your peak hours
• Your current flow score: **${state.flowScore}%**
• Monitor your behavioral patterns in real-time

**Pro Tip**: Your streak is ${state.currentStreak} days! Keep building that momentum. Consistency creates focus.`;
  }
  
  if (lower.includes("procrastinat") || lower.includes("motivat")) {
    return `### ⚡ Beating Procrastination

**The Psychology**: Procrastination isn't laziness—it's fear of discomfort. Here's how to overcome it:

**Immediate Actions:**
1. **2-Minute Rule**: If it takes <2 minutes, do it NOW
2. **5-Minute Promise**: Commit to just 5 minutes. Usually, you'll continue
3. **Break It Down**: Divide big tasks into tiny, manageable chunks

**Momentum Building:**
• Start your FlowZone session RIGHT NOW (seriously, click Start!)
• The act of beginning creates motivation—not the other way around
• Your ${state.totalSessions} completed sessions prove you CAN do this

**Reward System:**
• Small wins → Dopamine → More motivation
• Track with FlowZone to see progress visually
• Celebrate each completed session

**Remember**: Action creates motivation. You have a ${state.currentStreak}-day streak. Don't break it!`;
  }
  
  if (lower.includes("distract") || lower.includes("interrupt")) {
    return `### 🧠 Mastering Distraction Management

**Your Current Stats**: ${state.tabSwitches} tab switches detected. Let's minimize that!

**Digital Distractions:**
1. **Website Blockers**: Freedom, Cold Turkey, or browser extensions
2. **App Limits**: Use Screen Time (iOS) or Digital Wellbeing (Android)
3. **Notification Silence**: Turn on Do Not Disturb mode

**Physical Environment:**
• Wear headphones (even without music = "I'm focused" signal)
• Close your door or use "busy" indicators
• Keep phone in another room or drawer

**Mindset Shifts:**
• **Timeboxing**: "I'll check messages at 10, 2, and 4 PM only"
• **OHIO Principle**: Only Handle It Once (decide → do → done)
• **90-Minute Blocks**: Our natural attention cycle

**FlowZone Helps:**
• We track your tab switches (currently ${state.tabSwitches})
• Real-time alerts when you lose focus
• Identify your distraction patterns over time

Start a session now and see your patterns!`;
  }
  
  if (lower.includes("habit") || lower.includes("routine")) {
    return `### 📚 Building Unbreakable Habits

**Your Foundation**: ${state.currentStreak} day streak! You're already proving you can build habits.

**The Science:**
1. **Habit Stacking**: Attach new habits to existing ones
   - Example: "After my morning coffee, I'll start FlowZone"
2. **Make It Easy**: Reduce friction to starting
   - Your setup: One click → Start Session → Flow state
3. **Make It Satisfying**: Track progress visually
   - FlowZone dashboard shows your improvement

**The 4 Laws of Habit Formation:**
• **Cue**: Make it obvious (FlowZone bookmark visible)
• **Craving**: Make it attractive (gamification with streaks)
• **Response**: Make it easy (one-click start)
• **Reward**: Make it satisfying (see your progress)

**Your Action Plan:**
1. Set a specific time daily (e.g., "9 AM every workday")
2. Start small (even 10 minutes counts)
3. Never break the chain twice in a row
4. Use FlowZone to track consistency

**Stats Show**: After 21 days, it becomes automatic. You're at day ${state.currentStreak}!`;
  }
  
  if (lower.includes("break") || lower.includes("tired") || lower.includes("rest")) {
    return `### 🧘 Strategic Break Planning

**Current Fatigue**: Your session is ${Math.floor(state.sessionTime / 60)} minutes. Here's your break strategy:

**Optimal Break Patterns:**
1. **Pomodoro (25/5)**: 25 min work, 5 min break → Great for starting
2. **52/17 Rule**: 52 min work, 17 min break → Backed by research
3. **90-Minute Ultradian**: 90 min work, 20 min break → Deep work cycles

**What to Do During Breaks:**
• **Physical**: Stand, stretch, walk (even 2 minutes helps)
• **Visual**: Look away from screen (20-20-20 rule: every 20 min, look 20 feet away, 20 seconds)
• **Hydration**: Drink water (dehydration kills focus)
• **Breathing**: Try our 4-4-4-4 exercise (Breathing button)

**What NOT to Do:**
• ❌ Social media (triggers dopamine → hard to return to work)
• ❌ News scrolling (increases anxiety)
• ❌ Email checking (creates new tasks mentally)

**When to Break:**
• Fatigue Level > 70% (FlowZone tracks this!)
• After completing a milestone
• When flow score drops below 40%

**Pro Tip**: Schedule breaks BEFORE you're exhausted. Prevention > Recovery.`;
  }
  
  if (lower.includes("product") || lower.includes("efficient")) {
    return `### 💪 Maximizing Your Productivity

**Your Current Performance**: 
• Flow Score: **${state.flowScore}%** ${state.flowScore >= 70 ? '(Excellent!)' : '(Room for improvement)'}
• Streak: **${state.currentStreak} days** ${state.currentStreak >= 7 ? '🔥' : ''}
• Total Sessions: **${state.totalSessions}**

**The Productivity Trinity:**

**1. Energy Management** (More important than time!)
• **Peak Hours**: Check your Dashboard → Find your 90%+ flow times
• **Chronotype**: Are you a morning lark or night owl?
• **Nutrition**: Protein + complex carbs = sustained focus

**2. Priority Management**
• **Eisenhower Matrix**: Urgent/Important quadrants
• **MIT Method**: 3 Most Important Tasks per day
• **Eat the Frog**: Hardest task first (when willpower is highest)

**3. System Optimization**
• **Single-Tasking**: 40% more productive than multitasking
• **Deep Work Blocks**: 90-120 minutes of uninterrupted focus
• **Batch Processing**: Group similar tasks together

**FlowZone Insights:**
Your dashboard shows patterns you can't see without data. After ${state.totalSessions} sessions, you should see:
• Which hours you perform best
• How long your optimal sessions are
• What breaks your flow

**Action Step**: Complete 7 more sessions this week to establish your baseline. Then optimize!`;
  }
  
  if (lower.includes("time") || lower.includes("manage") || lower.includes("schedule")) {
    return `### ⏰ Mastering Time Management

**Your Time Stats**: ${state.totalSessions} sessions completed, ${state.currentStreak}-day streak!

**Core Principles:**

**1. Time Blocking** (Most Effective)
• Block specific hours for specific tasks
• Example: 9-11 AM = Deep work, 2-3 PM = Meetings, 4-5 PM = Admin
• Your Dashboard shows YOUR best hours

**2. Priority Systems**
• **Eisenhower Matrix**: 
  - Urgent + Important = Do first
  - Important + Not Urgent = Schedule
  - Urgent + Not Important = Delegate
  - Neither = Eliminate
• **Warren Buffett's 5/25 Rule**: Focus on top 5 goals only

**3. Batching Technique**
• Group similar tasks together
• Check email 3x daily (not constantly)
• Make all calls in one block
• Process admin tasks together

**FlowZone Integration:**
1. Start session for each time block
2. Track which blocks produce highest flow
3. Adjust schedule based on data
4. Your current flow: ${state.flowScore}%

**Reality Check**: You can't manage time. You can only manage yourself. FlowZone helps you understand YOUR optimal patterns.`;
  }
  
  return `### 💡 Focus & Productivity Coaching

**Your Current Status:**
• Flow Score: ${state.flowScore}%
• Active Session: ${state.isTracking ? 'Yes ✓' : 'No'}
• Current Streak: ${state.currentStreak} days
• Total Sessions: ${state.totalSessions}

**I can help you with:**

**Focus & Concentration**
• Improving attention span
• Eliminating distractions
• Creating optimal work environment

**Productivity Systems**
• Time management techniques
• Building effective routines
• Optimizing your schedule

**Habit Formation**
• Creating lasting behavioral changes
• Tracking progress effectively
• Maintaining motivation

**Quick Actions Available:**
• **Breathing Exercise**: 4-4-4-4 calming technique
• **Pomodoro Mode**: Structured work intervals
• **Focus Tips**: Environment optimization
• **Export Data**: Download your sessions

**Try asking:**
• "How to focus better?"
• "Beat procrastination strategies"
• "When should I take breaks?"
• "How to build better habits?"

Start tracking now to unlock personalized insights! 🚀`;
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

// ============================================
// ADD STYLES
// ============================================

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
  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  .message-text {
    animation: fadeInUp 0.4s ease;
  }
`;
document.head.appendChild(style);

console.log("✅ Part 4 loaded: UI & Features with Voice Input + Markdown");
console.log("🎉 FlowZone AI FULLY LOADED - All systems operational!");
