// ============================================
// FLOWZONE AI - PART 1: CORE & REAL-TIME TRACKING
// Copy this entire file as: app-part1-core.js
// ============================================

const CONFIG = {
  GEMINI_API_URL:
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
  STORAGE_KEY: "flowzone_api_key",
  FLOW_UPDATE_INTERVAL: 3000, // 3 seconds for better AI analysis
  TYPING_SPEED_WINDOW: 10000,
  IDLE_THRESHOLD: 30000,
  FOCUS_SOUND_ENABLED: true,
  ADAPTIVE_LEARNING: true,
};

// Global State
const state = {
  isTracking: false,
  flowScore: 50,
  sessionTime: 0,
  currentSection: "home",
  apiKey: null,
  sessionInterval: null,
  flowInterval: null,

  // Real-time metrics
  typingSpeed: [],
  mouseMovements: 0,
  clickPatterns: [],
  tabSwitches: 0,
  lastActivity: Date.now(),
  idleTime: 0,

  // Analytics
  focusHistory: [],
  sessionHistory: [],
  distractionPatterns: [],
  learningData: {
    bestHours: [],
    peakScores: [],
    flowTriggers: [],
  },

  fatigueLevel: 0,
  predictedBreakTime: null,
  currentStreak: 0,
  totalSessions: 0,
};

let keystrokeTimestamps = [];
let mousePositions = [];
let activityLog = [];

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener("DOMContentLoaded", () => {
  console.log("🚀 FlowZone AI Advanced Mode Loading...");

  initializeApp();
  setupEventListeners();
  setupAdvancedTracking();
  loadUserData();
  updateDashboardWithRealData();

  setTimeout(() => {
    showNotification(
      "✨ FlowZone AI Ready! Start tracking for AI-powered insights.",
      5000
    );
  }, 1000);
});

function initializeApp() {
  addProgressGradient();

  if (typeof lucide !== "undefined") {
    lucide.createIcons();
  }

  // Initialize flow meter
  updateFlowMeter(50);

  // Hide real-time metrics initially
  const metricsDiv = document.getElementById("realtimeMetrics");
  if (metricsDiv) {
    metricsDiv.classList.add("hidden");
  }

  // Set initial section
  handleTabChange("home");

  console.log("✅ Core initialization complete");
}

function addProgressGradient() {
  const svg = document.querySelector(".progress-ring");
  if (!svg) return;

  // Check if gradient already exists
  if (svg.querySelector("#flowGradient")) return;

  const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
  const gradient = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "linearGradient"
  );

  gradient.setAttribute("id", "flowGradient");
  gradient.setAttribute("x1", "0%");
  gradient.setAttribute("y1", "0%");
  gradient.setAttribute("x2", "100%");
  gradient.setAttribute("y2", "100%");

  const stop1 = document.createElementNS("http://www.w3.org/2000/svg", "stop");
  stop1.setAttribute("offset", "0%");
  stop1.setAttribute("style", "stop-color:#8b5cf6;stop-opacity:1");

  const stop2 = document.createElementNS("http://www.w3.org/2000/svg", "stop");
  stop2.setAttribute("offset", "100%");
  stop2.setAttribute("style", "stop-color:#06b6d4;stop-opacity:1");

  gradient.appendChild(stop1);
  gradient.appendChild(stop2);
  defs.appendChild(gradient);
  svg.insertBefore(defs, svg.firstChild);
}

// ============================================
// ADVANCED BEHAVIORAL TRACKING
// ============================================

function setupAdvancedTracking() {
  // Keyboard tracking
  document.addEventListener("keydown", handleKeystroke);
  document.addEventListener("keyup", handleKeyRelease);

  // Mouse tracking
  document.addEventListener("mousemove", throttle(handleMouseMove, 100));
  document.addEventListener("click", handleClick);

  // Tab/Window tracking
  document.addEventListener("visibilitychange", handleVisibilityChange);
  window.addEventListener("blur", handleWindowBlur);
  window.addEventListener("focus", handleWindowFocus);

  // Idle detection
  setInterval(detectIdleState, 1000);

  console.log("✅ Advanced tracking enabled");
}

function handleKeystroke(e) {
  if (!state.isTracking) return;

  const now = Date.now();
  keystrokeTimestamps.push(now);

  // Keep last 50 keystrokes
  if (keystrokeTimestamps.length > 50) {
    keystrokeTimestamps.shift();
  }

  calculateTypingSpeed();

  state.lastActivity = now;
  state.idleTime = 0;
}

function handleKeyRelease(e) {
  if (state.isTracking) {
    activityLog.push({
      type: "keystroke",
      timestamp: Date.now(),
    });
  }
}

function calculateTypingSpeed() {
  const now = Date.now();
  const recentKeystrokes = keystrokeTimestamps.filter(
    (t) => now - t < CONFIG.TYPING_SPEED_WINDOW
  );

  // Calculate keys per minute
  const speed = (recentKeystrokes.length / CONFIG.TYPING_SPEED_WINDOW) * 60000;

  state.typingSpeed.push(speed);
  if (state.typingSpeed.length > 20) {
    state.typingSpeed.shift();
  }

  updateRealtimeMetrics();
}

function handleMouseMove(e) {
  if (!state.isTracking) return;

  state.mouseMovements++;
  state.lastActivity = Date.now();
  state.idleTime = 0;

  // Sample 5% of mouse positions
  if (Math.random() < 0.05) {
    mousePositions.push({
      x: e.clientX,
      y: e.clientY,
      timestamp: Date.now(),
    });

    if (mousePositions.length > 100) {
      mousePositions.shift();
    }
  }
}

function handleClick(e) {
  if (!state.isTracking) return;

  state.clickPatterns.push({
    x: e.clientX,
    y: e.clientY,
    timestamp: Date.now(),
  });

  if (state.clickPatterns.length > 50) {
    state.clickPatterns.shift();
  }
}

function handleVisibilityChange() {
  if (document.hidden) {
    state.tabSwitches++;

    activityLog.push({
      type: "tab_switch",
      timestamp: Date.now(),
    });

    if (state.isTracking) {
      console.log("⚠️ Tab switch detected - distraction counted");
      updateRealtimeMetrics();

      // Penalty for tab switching
      state.flowScore = Math.max(0, state.flowScore - 5);
      updateFlowMeter(state.flowScore);
    }
  }
}

function handleWindowBlur() {
  if (state.isTracking) {
    activityLog.push({
      type: "window_blur",
      timestamp: Date.now(),
    });
  }
}

function handleWindowFocus() {
  if (state.isTracking) {
    activityLog.push({
      type: "window_focus",
      timestamp: Date.now(),
    });
  }
}

function detectIdleState() {
  if (!state.isTracking) return;

  const timeSinceActivity = Date.now() - state.lastActivity;

  if (timeSinceActivity > CONFIG.IDLE_THRESHOLD) {
    state.idleTime = timeSinceActivity;

    // Warn after 60 seconds of idle
    if (timeSinceActivity > CONFIG.IDLE_THRESHOLD * 2 && state.flowScore > 50) {
      triggerIdleWarning();
    }

    // Gradually decrease flow score when idle
    if (timeSinceActivity > CONFIG.IDLE_THRESHOLD) {
      state.flowScore = Math.max(0, state.flowScore - 0.1);
      updateFlowMeter(state.flowScore);
    }
  }
}

function triggerIdleWarning() {
  showNotification("⏰ You've been idle. Take a break or refocus?", 5000);
  playFocusSound("warning");
}

// ============================================
// REAL-TIME METRICS UPDATE
// ============================================

function updateRealtimeMetrics() {
  const metricsDiv = document.getElementById("realtimeMetrics");
  if (!metricsDiv || !state.isTracking) return;

  metricsDiv.classList.remove("hidden");

  const avgTyping = calculateAverage(state.typingSpeed);
  const mouseActivity = state.mouseMovements;
  const tabCount = state.tabSwitches;
  const fatigue = state.fatigueLevel;

  // Update UI
  const typingEl = document.getElementById("typingSpeed");
  const mouseEl = document.getElementById("mouseActivity");
  const tabEl = document.getElementById("tabCount");
  const fatigueEl = document.getElementById("fatigueLevel");

  if (typingEl) {
    typingEl.textContent =
      avgTyping > 0 ? `${avgTyping.toFixed(0)} k/min` : "Idle";
  }

  if (mouseEl) {
    const activity =
      mouseActivity > 100
        ? "High"
        : mouseActivity > 50
        ? "Med"
        : mouseActivity > 0
        ? "Low"
        : "None";
    mouseEl.textContent = activity;
  }

  if (tabEl) {
    tabEl.textContent = tabCount;
  }

  if (fatigueEl) {
    fatigueEl.textContent = `${fatigue.toFixed(0)}%`;
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function calculateAverage(arr) {
  if (!Array.isArray(arr) || arr.length === 0) return 0;
  const sum = arr.reduce((s, v) => s + (typeof v === "number" ? v : 0), 0);
  return sum / arr.length;
}

function throttle(func, limit) {
  let inThrottle;
  return function () {
    const args = arguments;
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

function escapeHtml(text) {
  const map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

console.log("✅ Part 1 loaded: Core & Tracking");
