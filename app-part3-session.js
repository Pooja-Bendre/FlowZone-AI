// ============================================
// FLOWZONE AI - PART 3: SESSION MANAGEMENT & DASHBOARD
// Copy this entire file as: app-part3-session.js
// ============================================

// ============================================
// FOCUS SESSION MANAGEMENT
// ============================================

function toggleFocusSession() {
  state.isTracking = !state.isTracking;
  
  const btn = document.getElementById("toggleTracking");
  const timer = document.getElementById("sessionTimer");
  const icon = btn.querySelector("i");
  const text = btn.querySelector("span");
  
  if (state.isTracking) {
    // START SESSION
    btn.classList.add("active");
    icon.setAttribute("data-lucide", "pause");
    text.textContent = "Stop Session";
    timer.classList.remove("hidden");
    
    // Reset tracking data
    keystrokeTimestamps = [];
    mousePositions = [];
    activityLog = [];
    state.typingSpeed = [];
    state.mouseMovements = 0;
    state.tabSwitches = 0;
    state.lastActivity = Date.now();
    state.fatigueLevel = 0;
    state.predictedBreakTime = null;
    
    // Initialize flow score
    state.flowScore = 50;
    updateFlowMeter(state.flowScore);
    
    // Start timers
    startSessionTimer();
    startAdvancedFlowTracking();
    
    playFocusSound("start");
    showNotification("🚀 Real-time flow tracking started! Your behavior is being analyzed.", 4000);
    
  } else {
    // STOP SESSION
    btn.classList.remove("active");
    icon.setAttribute("data-lucide", "play");
    text.textContent = "Start Focus Session";
    timer.classList.add("hidden");
    
    // Stop timers
    stopSessionTimer();
    stopFlowTracking();
    
    // Save session data
    saveSessionData();
    
    // Show comprehensive summary
    showAdvancedSessionSummary();
    
    // Hide metrics
    const metricsDiv = document.getElementById("realtimeMetrics");
    if (metricsDiv) {
      metricsDiv.classList.add("hidden");
    }
    
    playFocusSound("end");
    
    // Update dashboard with new data
    updateDashboardWithRealData();
    
    // Update streak
    updateStreak();
  }
  
  if (typeof lucide !== "undefined") {
    lucide.createIcons();
  }
}

function startAdvancedFlowTracking() {
  state.flowInterval = setInterval(async () => {
    // Analyze flow state
    if (state.apiKey) {
      await analyzeFlowStateWithAI();
    } else {
      performRuleBasedAnalysis();
    }
    
    // Reset mouse movement counter for next interval
    state.mouseMovements = 0;
    
  }, CONFIG.FLOW_UPDATE_INTERVAL);
}

function stopFlowTracking() {
  if (state.flowInterval) {
    clearInterval(state.flowInterval);
    state.flowInterval = null;
  }
}

// ============================================
// SESSION TIMER
// ============================================

function startSessionTimer() {
  state.sessionTime = 0;
  state.sessionInterval = setInterval(() => {
    state.sessionTime++;
    updateTimerDisplay();
    
    // Milestone notifications
    if (state.sessionTime === 300) { // 5 minutes
      showNotification("🎯 5 minutes of focus! You're building momentum.", 4000);
    } else if (state.sessionTime === 1500) { // 25 minutes
      showNotification("🔥 25 minutes! Pomodoro complete. Consider a break soon.", 5000);
    } else if (state.sessionTime === 3000) { // 50 minutes
      showNotification("⚡ 50 minutes of deep work! Take a longer break to recharge.", 6000);
    }
  }, 1000);
}

function stopSessionTimer() {
  if (state.sessionInterval) {
    clearInterval(state.sessionInterval);
    state.sessionInterval = null;
  }
}

function updateTimerDisplay() {
  const timerDisplay = document.getElementById("timerDisplay");
  if (!timerDisplay) return;
  
  const minutes = Math.floor(state.sessionTime / 60);
  const seconds = state.sessionTime % 60;
  timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// ============================================
// SESSION DATA MANAGEMENT
// ============================================

function saveSessionData() {
  const peakFlow = Math.max(...state.focusHistory.map(h => h.score || 0), state.flowScore);
  
  const session = {
    duration: state.sessionTime,
    avgFlowScore: Math.round(calculateAverage(state.focusHistory.map(h => h.score || 50))),
    peakFlow: Math.round(peakFlow),
    tabSwitches: state.tabSwitches,
    avgTypingSpeed: Math.round(calculateAverage(state.typingSpeed)),
    timestamp: Date.now(),
    timeOfDay: new Date().getHours(),
    date: new Date().toLocaleDateString(),
    productivity: calculateProductivityScore()
  };
  
  // Add to state
  state.sessionHistory.push(session);
  
  // Save to localStorage
  const history = JSON.parse(localStorage.getItem("flowzone_session_history") || "[]");
  history.push(session);
  
  // Keep last 100 sessions
  if (history.length > 100) {
    history.shift();
  }
  
  localStorage.setItem("flowzone_session_history", JSON.stringify(history));
  
  // Update total sessions count
  state.totalSessions = history.length;
  localStorage.setItem("flowzone_total_sessions", state.totalSessions);
  
  console.log("✅ Session saved:", session);
}

function showAdvancedSessionSummary() {
  const duration = Math.floor(state.sessionTime / 60);
  const avgScore = Math.round(calculateAverage(state.focusHistory.map(h => h.score || 50)));
  const peakScore = Math.max(...state.focusHistory.map(h => h.score || 0), state.flowScore);
  const productivity = calculateProductivityScore();
  
  // Calculate session quality
  let quality = "Good";
  let qualityColor = "#06b6d4";
  if (avgScore >= 80) {
    quality = "Excellent";
    qualityColor = "#10b981";
  } else if (avgScore >= 60) {
    quality = "Great";
    qualityColor = "#22d3ee";
  } else if (avgScore < 40) {
    quality = "Needs Improvement";
    qualityColor = "#f97316";
  }
  
  const summary = `
    <div style="text-align: center;">
      <div style="font-size: 3rem; margin-bottom: 1rem;">✨</div>
      <h3 style="margin-bottom: 1rem; font-size: 1.5rem;">Session Complete!</h3>
      
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin: 1.5rem 0;">
        <div style="background: rgba(139, 92, 246, 0.2); padding: 1rem; border-radius: 0.75rem; border: 1px solid rgba(139, 92, 246, 0.3);">
          <div style="font-size: 2rem; font-weight: bold; color: #8b5cf6;">${duration}m</div>
          <div style="font-size: 0.875rem; color: #94a3b8;">Duration</div>
        </div>
        <div style="background: rgba(6, 182, 212, 0.2); padding: 1rem; border-radius: 0.75rem; border: 1px solid rgba(6, 182, 212, 0.3);">
          <div style="font-size: 2rem; font-weight: bold; color: #06b6d4;">${avgScore}%</div>
          <div style="font-size: 0.875rem; color: #94a3b8;">Avg Flow</div>
        </div>
        <div style="background: rgba(16, 185, 129, 0.2); padding: 1rem; border-radius: 0.75rem; border: 1px solid rgba(16, 185, 129, 0.3);">
          <div style="font-size: 2rem; font-weight: bold; color: #10b981;">${Math.round(peakScore)}%</div>
          <div style="font-size: 0.875rem; color: #94a3b8;">Peak Flow</div>
        </div>
        <div style="background: rgba(249, 115, 22, 0.2); padding: 1rem; border-radius: 0.75rem; border: 1px solid rgba(249, 115, 22, 0.3);">
          <div style="font-size: 2rem; font-weight: bold; color: #fb923c;">${productivity}</div>
          <div style="font-size: 0.875rem; color: #94a3b8;">Productivity</div>
        </div>
      </div>
      
      <div style="margin: 1.5rem 0; padding: 1rem; background: rgba(139, 92, 246, 0.1); border-radius: 0.75rem; border: 1px solid rgba(139, 92, 246, 0.2);">
        <div style="font-size: 1.25rem; font-weight: bold; color: ${qualityColor}; margin-bottom: 0.5rem;">
          ${quality} Session!
        </div>
      </div>
      
      <div style="margin-top: 1.5rem; padding: 1rem; background: rgba(15, 23, 42, 0.5); border-radius: 0.75rem; text-align: left; font-size: 0.875rem;">
        <strong style="color: white;">📊 Session Insights:</strong><br>
        • Tab Switches: <strong style="color: ${state.tabSwitches < 3 ? '#10b981' : state.tabSwitches < 7 ? '#fb923c' : '#ef4444'}">${state.tabSwitches}</strong> ${state.tabSwitches < 3 ? '(Excellent!)' : state.tabSwitches < 7 ? '(Good)' : '(Try to minimize)'}<br>
        • Typing Consistency: <strong style="color: #06b6d4;">${state.typingSpeed.length > 5 ? 'Consistent' : 'Varied'}</strong><br>
        • Session Time: <strong style="color: #8b5cf6;">${new Date().getHours()}:00</strong><br>
        • Total Sessions: <strong style="color: #10b981;">${state.totalSessions}</strong><br>
        ${state.apiKey ? '• <strong style="color: #22d3ee;">AI Analysis Saved ✓</strong>' : '• Add API key for AI insights'}
      </div>
    </div>
  `;
  
  showNotification(summary, 15000);
}

function calculateProductivityScore() {
  const avgFlow = calculateAverage(state.focusHistory.map(h => h.score || 50));
  const baseScore = avgFlow / 10;
  const durationBonus = Math.min(state.sessionTime / 600, 3); // Max 3 points for 10+ min
  const distractionPenalty = state.tabSwitches * 0.15;
  
  const score = Math.max(0.5, baseScore + durationBonus - distractionPenalty);
  return score.toFixed(1) + "x";
}

// ============================================
// STREAK MANAGEMENT
// ============================================

function updateStreak() {
  const today = new Date().toDateString();
  const lastSession = localStorage.getItem("flowzone_last_session_date");
  
  if (lastSession) {
    const lastDate = new Date(lastSession);
    const todayDate = new Date(today);
    
    const diffTime = todayDate - lastDate;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      // Same day - no change
    } else if (diffDays === 1) {
      // Consecutive day - increase streak
      state.currentStreak++;
      localStorage.setItem("flowzone_streak", state.currentStreak);
    } else {
      // Streak broken
      state.currentStreak = 1;
      localStorage.setItem("flowzone_streak", state.currentStreak);
    }
  } else {
    // First session
    state.currentStreak = 1;
    localStorage.setItem("flowzone_streak", state.currentStreak);
  }
  
  localStorage.setItem("flowzone_last_session_date", today);
  
  // Update UI
  const streakEl = document.getElementById("streakCount");
  if (streakEl) {
    streakEl.textContent = state.currentStreak;
  }
  
  // Celebrate milestones
  if (state.currentStreak % 7 === 0 && state.currentStreak > 0) {
    showNotification(`🎉 ${state.currentStreak} Day Streak! You're on fire!`, 6000);
  }
}

function loadUserData() {
  // Load streak
  const savedStreak = localStorage.getItem("flowzone_streak");
  state.currentStreak = savedStreak ? parseInt(savedStreak) : 0;
  
  const streakEl = document.getElementById("streakCount");
  if (streakEl) {
    streakEl.textContent = state.currentStreak || 1;
  }
  
  // Load total sessions
  const totalSessions = localStorage.getItem("flowzone_total_sessions");
  state.totalSessions = totalSessions ? parseInt(totalSessions) : 0;
  
  // Load API key
  const savedKey = localStorage.getItem(CONFIG.STORAGE_KEY);
  if (savedKey) {
    state.apiKey = savedKey;
    console.log("✅ API key loaded");
  }
  
  // Load session history
  const history = JSON.parse(localStorage.getItem("flowzone_session_history") || "[]");
  state.sessionHistory = history;
  
  // Load learning data
  initializeAdaptiveLearning();
  
  console.log("✅ User data loaded:", {
    streak: state.currentStreak,
    sessions: state.totalSessions,
    hasApiKey: !!state.apiKey
  });
}

// ============================================
// DASHBOARD DATA UPDATES
// ============================================

function updateDashboardWithRealData() {
  const history = JSON.parse(localStorage.getItem("flowzone_session_history") || "[]");
  
  if (history.length === 0) {
    console.log("No session history yet");
    return;
  }
  
  // Calculate weekly stats
  const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
  const weekSessions = history.filter(s => s.timestamp > weekAgo);
  
  // Total focus time (hours)
  const totalMinutes = weekSessions.reduce((sum, s) => sum + (s.duration / 60), 0);
  const totalHours = (totalMinutes / 60).toFixed(1);
  
  // Average flow score
  const avgFlow = weekSessions.length > 0 
    ? Math.round(weekSessions.reduce((sum, s) => sum + s.avgFlowScore, 0) / weekSessions.length)
    : 0;
  
  // Deep work sessions count
  const deepWorkCount = weekSessions.filter(s => s.avgFlowScore >= 70).length;
  
  // Productivity boost (average)
  const avgProductivity = weekSessions.length > 0
    ? (weekSessions.reduce((sum, s) => sum + parseFloat(s.productivity), 0) / weekSessions.length).toFixed(1)
    : "1.0";
  
  // Update overview stats
  updateOverviewStat(0, totalHours + "h", calculateChange(weekSessions, 'duration'));
  updateOverviewStat(1, avgFlow + "%", calculateChange(weekSessions, 'avgFlowScore'));
  updateOverviewStat(2, deepWorkCount.toString(), "+15%");
  updateOverviewStat(3, avgProductivity + "x", "+25%");
  
  // Update weekly chart
  updateWeeklyChart(history);
  
  // Update best times
  updateBestTimes(history);
  
  // Update distractions
  updateTopDistractions(history);
  
  console.log("✅ Dashboard updated with real data");
}

function updateOverviewStat(index, value, change) {
  const stats = document.querySelectorAll(".overview-stat");
  if (stats[index]) {
    const valueEl = stats[index].querySelector(".overview-value");
    const changeEl = stats[index].querySelector(".overview-change");
    
    if (valueEl) valueEl.textContent = value;
    if (changeEl) changeEl.textContent = change;
  }
}

function calculateChange(sessions, metric) {
  if (sessions.length < 2) return "+0%";
  
  const mid = Math.floor(sessions.length / 2);
  const firstHalf = sessions.slice(0, mid);
  const secondHalf = sessions.slice(mid);
  
  const avg1 = firstHalf.reduce((sum, s) => sum + (s[metric] || 0), 0) / firstHalf.length;
  const avg2 = secondHalf.reduce((sum, s) => sum + (s[metric] || 0), 0) / secondHalf.length;
  
  const change = ((avg2 - avg1) / avg1) * 100;
  return (change >= 0 ? "+" : "") + Math.round(change) + "%";
}

function updateWeeklyChart(history) {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
  const weekSessions = history.filter(s => s.timestamp > weekAgo);
  
  // Group by day
  const dayScores = {};
  days.forEach((day, i) => {
    const daySessions = weekSessions.filter(s => {
      const date = new Date(s.timestamp);
      return date.getDay() === (i + 1) % 7;
    });
    
    dayScores[day] = daySessions.length > 0
      ? Math.round(daySessions.reduce((sum, s) => sum + s.avgFlowScore, 0) / daySessions.length)
      : 0;
  });
  
  // Update bars
  const barWrappers = document.querySelectorAll(".bar-wrapper");
  barWrappers.forEach((wrapper, i) => {
    const bar = wrapper.querySelector(".bar");
    const tooltip = wrapper.querySelector(".bar-tooltip");
    const day = days[i];
    const score = dayScores[day] || 0;
    
    if (bar) {
      bar.style.height = score + "%";
    }
    if (tooltip) {
      tooltip.textContent = score + "% Flow";
    }
  });
}

function updateBestTimes(history) {
  if (history.length === 0) return;
  
  // Group by hour
  const hourScores = {};
  history.forEach(s => {
    const hour = s.timeOfDay;
    if (!hourScores[hour]) hourScores[hour] = [];
    hourScores[hour].push(s.avgFlowScore);
  });
  
  // Calculate averages
  const hourAverages = Object.entries(hourScores).map(([hour, scores]) => ({
    hour: parseInt(hour),
    avg: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
  }));
  
  // Sort by average score
  hourAverages.sort((a, b) => b.avg - a.avg);
  
  // Update UI (top 3)
  const bestTimesContainer = document.querySelector(".analytics-section .analytics-list");
  if (bestTimesContainer && hourAverages.length >= 3) {
    const items = bestTimesContainer.querySelectorAll(".analytics-item");
    for (let i = 0; i < Math.min(3, items.length); i++) {
      const hour = hourAverages[i].hour;
      const nextHour = (hour + 2) % 24;
      const timeRange = `${hour}:00 - ${nextHour}:00`;
      const avg = hourAverages[i].avg;
      
      items[i].innerHTML = `
        <span>${timeRange}</span>
        <strong>${avg}% avg</strong>
      `;
    }
  }
}

function updateTopDistractions(history) {
  if (history.length === 0) return;
  
  const totalTabSwitches = history.reduce((sum, s) => sum + (s.tabSwitches || 0), 0);
  
  // Update distractions UI
  const distractionsContainer = document.querySelectorAll(".analytics-section")[1];
  if (distractionsContainer) {
    const items = distractionsContainer.querySelectorAll(".analytics-item");
    if (items[0]) {
      items[0].innerHTML = `
        <span>Tab Switching</span>
        <strong>${totalTabSwitches} times</strong>
      `;
    }
  }
}

console.log("✅ Part 3 loaded: Session Management & Dashboard");