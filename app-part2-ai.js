// ============================================
// FLOWZONE AI - PART 2: AI ANALYSIS & FLOW MANAGEMENT
// Copy this entire file as: app-part2-ai.js
// ============================================

// ============================================
// AI-POWERED FLOW ANALYSIS
// ============================================

async function analyzeFlowStateWithAI() {
  if (!state.apiKey || !state.isTracking) {
    performRuleBasedAnalysis();
    return;
  }
  
  const behavioralData = {
    avgTypingSpeed: calculateAverage(state.typingSpeed),
    mouseActivity: state.mouseMovements,
    tabSwitches: state.tabSwitches,
    idleTime: state.idleTime,
    sessionDuration: state.sessionTime,
    timeOfDay: new Date().getHours()
  };
  
  try {
    const prompt = `You are a focus analysis AI. Analyze this real-time behavioral data and respond ONLY with valid JSON.

Data:
- Typing Speed: ${behavioralData.avgTypingSpeed.toFixed(1)} keys/min (Good: 40-80)
- Mouse Movements: ${behavioralData.mouseActivity} (Low is better for focus)
- Tab Switches: ${behavioralData.tabSwitches} (Distractions)
- Idle Time: ${(behavioralData.idleTime / 1000).toFixed(0)} seconds
- Session Duration: ${Math.floor(behavioralData.sessionDuration / 60)} minutes
- Time: ${behavioralData.timeOfDay}:00

Calculate a flow score (0-100) where:
- High consistent typing + low mouse movement + no tab switches = 90-100%
- Moderate activity = 60-80%
- High distractions or idle = 20-40%

Respond with this EXACT JSON format:
{
  "flowScore": 75,
  "distractions": ["Tab switching detected"],
  "fatigueLevel": 25,
  "recommendation": "Maintain focus",
  "breakInMinutes": 20,
  "insight": "Your typing rhythm is consistent, indicating deep concentration"
}`;

    const response = await fetch(`${CONFIG.GEMINI_API_URL}?key=${state.apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { 
          temperature: 0.3, 
          maxOutputTokens: 500 
        }
      })
    });
    
    if (response.ok) {
      const data = await response.json();
      const aiText = data.candidates[0].content.parts[0].text;
      
      const jsonMatch = aiText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const analysis = JSON.parse(jsonMatch[0]);
        applyAIAnalysis(analysis);
        console.log("✅ AI analysis applied:", analysis);
      } else {
        performRuleBasedAnalysis();
      }
    } else {
      performRuleBasedAnalysis();
    }
  } catch (error) {
    console.error("AI Analysis error:", error);
    performRuleBasedAnalysis();
  }
}

function performRuleBasedAnalysis() {
  const behavioralData = {
    avgTypingSpeed: calculateAverage(state.typingSpeed),
    mouseActivity: state.mouseMovements,
    tabSwitches: state.tabSwitches,
    idleTime: state.idleTime,
    sessionDuration: state.sessionTime,
    timeOfDay: new Date().getHours()
  };
  
  let score = 50; // Base score
  
  // Typing speed analysis (optimal: 40-80 keys/min)
  if (behavioralData.avgTypingSpeed >= 40 && behavioralData.avgTypingSpeed <= 80) {
    score += 20; // Excellent typing rhythm
  } else if (behavioralData.avgTypingSpeed > 0) {
    score += 10; // Some typing activity
  }
  
  // Mouse activity (lower is better for deep work)
  if (behavioralData.mouseActivity < 30) {
    score += 15; // Very focused
  } else if (behavioralData.mouseActivity < 70) {
    score += 8; // Moderately focused
  }
  
  // Tab switching penalty (major distraction)
  score -= Math.min(behavioralData.tabSwitches * 5, 30);
  
  // Idle time penalty
  if (behavioralData.idleTime > CONFIG.IDLE_THRESHOLD) {
    score -= 20;
  }
  
  // Session duration bonus (building stamina)
  if (behavioralData.sessionDuration > 600) { // 10+ minutes
    score += 15;
  } else if (behavioralData.sessionDuration > 300) { // 5+ minutes
    score += 8;
  }
  
  // Time of day adjustment (peak hours)
  const hour = behavioralData.timeOfDay;
  if ((hour >= 9 && hour <= 11) || (hour >= 14 && hour <= 16) || (hour >= 20 && hour <= 22)) {
    score += 5; // Peak focus hours
  }
  
  // Ensure score is between 0-100
  state.flowScore = Math.max(0, Math.min(100, score));
  updateFlowMeter(state.flowScore);
  
  // Calculate fatigue (increases with session time)
  state.fatigueLevel = Math.min(100, (behavioralData.sessionDuration / 5400) * 100); // 90 min = 100%
  
  // Auto-suggest breaks
  if (state.fatigueLevel > 70 && !state.predictedBreakTime) {
    suggestIntelligentBreak();
  }
  
  updateRealtimeMetrics();
  
  // Store in history
  state.focusHistory.push({
    score: state.flowScore,
    timestamp: Date.now(),
    typing: behavioralData.avgTypingSpeed,
    distractions: behavioralData.tabSwitches
  });
  
  // Keep last 100 readings
  if (state.focusHistory.length > 100) {
    state.focusHistory.shift();
  }
}

function applyAIAnalysis(analysis) {
  state.flowScore = analysis.flowScore || state.flowScore;
  state.fatigueLevel = analysis.fatigueLevel || state.fatigueLevel;
  state.predictedBreakTime = analysis.breakInMinutes ? Date.now() + (analysis.breakInMinutes * 60000) : null;
  
  updateFlowMeter(state.flowScore);
  updateRealtimeMetrics();
  
  if (analysis.insight) {
    showAIInsight(analysis.insight);
  }
  
  if (analysis.recommendation && analysis.recommendation.toLowerCase().includes("break")) {
    if (analysis.breakInMinutes) {
      scheduleSmartBreak(analysis.breakInMinutes);
    }
  }
  
  console.log("✅ AI recommendations applied");
}

function showAIInsight(insight) {
  const insightsContainer = document.querySelector(".insights-list");
  if (!insightsContainer) return;
  
  // Remove existing AI insights
  const existingAI = insightsContainer.querySelectorAll('[data-ai-insight="true"]');
  existingAI.forEach(el => el.remove());
  
  const insightHTML = `
    <div class="insight-item insight-purple" data-ai-insight="true" style="animation: slideIn 0.3s ease;">
      <p>🤖 <strong>AI Insight:</strong> ${escapeHtml(insight)}</p>
    </div>
  `;
  
  insightsContainer.insertAdjacentHTML("afterbegin", insightHTML);
  
  // Keep only last 3 insights
  const insights = insightsContainer.querySelectorAll(".insight-item");
  if (insights.length > 3) {
    insights[insights.length - 1].remove();
  }
}

// ============================================
// FLOW METER UPDATES
// ============================================

function updateFlowMeter(score) {
  try {
    // Update score display
    const scoreEl = document.getElementById("flowScore");
    if (scoreEl) {
      scoreEl.textContent = Math.round(score);
    }
    
    // Update circular progress SVG
    const circle = document.getElementById("progressCircle");
    if (circle) {
      const radius = 120;
      const circumference = 2 * Math.PI * radius;
      const offset = circumference - (score / 100) * circumference;
      
      circle.style.strokeDasharray = `${circumference} ${circumference}`;
      circle.style.strokeDashoffset = `${offset}`;
      circle.style.transition = "stroke-dashoffset 0.5s ease";
    }
    
    // Update status text
    const statusEl = document.getElementById("flowStatus");
    if (statusEl) {
      let icon, text;
      
      if (score >= 85) {
        icon = "🔥";
        text = "Peak Flow";
      } else if (score >= 70) {
        icon = "🚀";
        text = "Flow State";
      } else if (score >= 50) {
        icon = "⚡";
        text = "Focused";
      } else if (score >= 30) {
        icon = "🌱";
        text = "Building";
      } else {
        icon = "⚠️";
        text = "Distracted";
      }
      
      statusEl.innerHTML = `
        <span class="status-icon">${icon}</span>
        <span class="status-text">${text}</span>
      `;
    }
  } catch (e) {
    console.error("Flow meter update error:", e);
  }
}

// ============================================
// INTELLIGENT BREAK SYSTEM
// ============================================

function suggestIntelligentBreak() {
  if (state.predictedBreakTime) return; // Already scheduled
  
  const breakMinutes = calculateOptimalBreakLength();
  
  showNotification(`
    <div style="text-align: center;">
      <h3 style="margin-bottom: 0.5rem;">🧘 Smart Break Suggestion</h3>
      <p>Take a ${breakMinutes}-minute break to recharge.</p>
      <p style="margin-top: 0.5rem;">Fatigue Level: <strong>${state.fatigueLevel.toFixed(0)}%</strong></p>
    </div>
  `, 8000);
  
  state.predictedBreakTime = Date.now() + (breakMinutes * 60000);
}

function calculateOptimalBreakLength() {
  const sessionMinutes = state.sessionTime / 60;
  
  if (sessionMinutes < 25) return 5;
  if (sessionMinutes < 50) return 10;
  if (sessionMinutes < 90) return 15;
  return 20;
}

function scheduleSmartBreak(minutes) {
  setTimeout(() => {
    if (state.isTracking) {
      showBreakDialog(minutes);
    }
  }, minutes * 60000);
}

function showBreakDialog(minutes) {
  const dialog = `
    <div style="text-align: center;">
      <div style="font-size: 3rem; margin-bottom: 1rem;">🧘</div>
      <h3 style="margin-bottom: 0.5rem;">Time for a Smart Break!</h3>
      <p style="color: #94a3b8; margin-bottom: 1rem;">
        You've been focused for ${Math.floor(state.sessionTime / 60)} minutes.
      </p>
      <div style="margin-top: 1rem; text-align: left; color: #94a3b8;">
        <strong style="color: white;">Suggested activities:</strong><br>
        • Stretch your body<br>
        • Look away from screen (20-20-20 rule)<br>
        • Hydrate<br>
        • Take deep breaths
      </div>
    </div>
  `;
  
  showNotification(dialog, 12000);
  playFocusSound("break");
}

// ============================================
// ADAPTIVE LEARNING SYSTEM
// ============================================

function initializeAdaptiveLearning() {
  const savedData = localStorage.getItem("flowzone_learning_data");
  if (savedData) {
    try {
      state.learningData = JSON.parse(savedData);
      console.log("✅ Learning data loaded");
    } catch (e) {
      console.error("Failed to load learning data");
    }
  }
  
  // Update learning model every 5 minutes
  setInterval(updateLearningModel, 300000);
}

function updateLearningModel() {
  if (!state.isTracking) return;
  
  const currentHour = new Date().getHours();
  const currentScore = state.flowScore;
  
  // Track best hours
  state.learningData.bestHours.push({
    hour: currentHour,
    score: currentScore,
    timestamp: Date.now()
  });
  
  // Track peak scores
  if (currentScore > 80) {
    state.learningData.peakScores.push({
      score: currentScore,
      hour: currentHour,
      typing: calculateAverage(state.typingSpeed),
      timestamp: Date.now()
    });
  }
  
  // Identify flow triggers
  if (currentScore > 70) {
    const trigger = {
      typingSpeed: calculateAverage(state.typingSpeed),
      timeOfDay: currentHour,
      sessionLength: state.sessionTime,
      tabSwitches: state.tabSwitches
    };
    state.learningData.flowTriggers.push(trigger);
  }
  
  // Save learning data
  localStorage.setItem("flowzone_learning_data", JSON.stringify(state.learningData));
  
  console.log("✅ Learning model updated");
}

console.log("✅ Part 2 loaded: AI Analysis & Flow Management");