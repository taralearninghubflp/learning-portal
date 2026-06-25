/**
 * TARA LMS - Engine Architecture Controller
 * Author: Senior Full Stack Developer
 */

(function () {
    'use strict';

    // Application Constants Configurations
    const CONFIG = {
        API_ENDPOINT: 'https://script.google.com/macros/s/AKfycbzXfKLksw0NHxRZEHBi2xydvkkIlGl5gxeTlwpYSfBsqjL0ZbMyCgnRjktLLTSqyO__/exec',
        QUIZ_COUNTDOWN_DURATION: 120, // 2 minutes window to take the quiz
        TICK_RATE_MS: 1000
    };

    // State Matrix Variables
    let state = {
        lessonNumber: null,
        videoUrl: null,
        targetDuration: 0,
        elapsedSeconds: 0,
        countdownRemaining: CONFIG.QUIZ_COUNTDOWN_DURATION,
        durationTimerId: null,
        countdownTimerId: null,
        isUnlocked: false
    };

    // Cached Core DOM Nodes
    const DOM = {
        videoWrapper: document.getElementById('video-wrapper'),
        loadingSpinner: document.getElementById('loading-spinner'),
        lessonStatus: document.getElementById('lesson-status'),
        videoTitle: document.getElementById('video-title'),
        durationPill: document.getElementById('duration-pill'),
        lockStatusPill: document.getElementById('lock-status-pill'),
        instructionText: document.getElementById('instruction-text'),
        progressContainer: document.getElementById('progress-container'),
        progressFill: document.getElementById('progress-fill'),
        progressElapsed: document.getElementById('progress-time-elapsed'),
        progressTotal: document.getElementById('progress-time-total'),
        countdownWrapper: document.getElementById('countdown-wrapper'),
        timerDigits: document.getElementById('timer-digits'),
        quizBtn: document.getElementById('quiz-btn'),
        btnText: document.getElementById('btn-text')
    };

    /**
     * Initialization execution context
     */
    function init() {
        bindEvents();
        fetchLessonData();
    }

    /**
     * Event listeners binding
     */
    function bindEvents() {
        DOM.quizBtn.addEventListener('click', handleQuizRedirect);
    }

    /**
     * Data acquisition lifecycle hook
     */
    async function fetchLessonData() {
        try {
            const response = await fetch(CONFIG.API_ENDPOINT);
            if (!response.ok) {
                throw new Error(`HTTP Error Status: ${response.status}`);
            }
            const data = await response.json();
            processLessonData(data);
        } catch (error) {
            handleSystemError(error);
        }
    }

    /**
     * Formats raw seconds into standardized readable standard notation MM:SS
     */
    function formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    /**
     * Handle state mutation & UI presentation rendering from dynamic response payload
     */
    function processLessonData(payload) {
        if (!payload || !payload.video) {
            throw new Error("Invalid schema received from cloud registry layer.");
        }

        // Hydrate Application Core State
        state.lessonNumber = payload.no || 1;
        state.videoUrl = payload.video;
        state.targetDuration = parseInt(payload.duration, 10) || 60;

        // UI Updates
        DOM.lessonStatus.textContent = `Lesson Matrix Active - Module #${state.lessonNumber}`;
        DOM.videoTitle.textContent = `Training Module Block Sequence #${state.lessonNumber}`;
        DOM.durationPill.textContent = `Duration: ${formatTime(state.targetDuration)}`;
        DOM.progressTotal.textContent = formatTime(state.targetDuration);

        // Inject the dynamic secure iFrame sandbox layer
        renderVideoIframe(state.videoUrl);
        
        // Boot progression engines
        startProgressTracking();
    }

    /**
     * Dynamic clean injection of Bunny Embed Frame
     */
    function renderVideoIframe(url) {
        // Clear everything except the loading element if present
        const iframe = document.createElement('iframe');
        iframe.src = url;
        iframe.allow = "autoplay; encrypted-media; picture-in-picture";
        iframe.allowFullscreen = true;
        
        // Onload callback to dismiss interface spinner overlay safely
        iframe.onload = () => {
            if (DOM.loadingSpinner) {
                DOM.loadingSpinner.style.display = 'none';
            }
        };

        DOM.videoWrapper.appendChild(iframe);
    }

    /**
     * Track user lesson pacing runtime sequence
     */
    function startProgressTracking() {
        DOM.progressContainer.style.display = 'block';
        
        state.durationTimerId = setInterval(() => {
            state.elapsedSeconds++;
            
            // Limit progress bounds
            const boundElapsed = Math.min(state.elapsedSeconds, state.targetDuration);
            const percentage = (boundElapsed / state.targetDuration) * 100;
            
            // Visual Updates
            DOM.progressFill.style.width = `${percentage}%`;
            DOM.progressElapsed.textContent = formatTime(boundElapsed);

            if (state.elapsedSeconds >= state.targetDuration) {
                clearInterval(state.durationTimerId);
                triggerQuizUnlockSequence();
            }
        }, CONFIG.TICK_RATE_MS);
    }

    /**
     * Unlock Interactive Gate Sequence Transitions
     */
    function triggerQuizUnlockSequence() {
        state.isUnlocked = true;

        // Update Pill Badges
        DOM.lockStatusPill.textContent = "Unlocked";
        DOM.lockStatusPill.classList.remove('locked');
        DOM.lockStatusPill.classList.add('unlocked');

        // Transition Action Button Status
        DOM.quizBtn.removeAttribute('disabled');
        DOM.quizBtn.classList.remove('locked');
        DOM.quizBtn.classList.add('unlocked');
        DOM.quizBtn.querySelector('.btn-icon').textContent = '🚀';
        DOM.btnText.textContent = "Proceed to Module Evaluation Quiz";

        // Instruction Mutation
        DOM.instructionText.innerHTML = "<strong>Access Window Open:</strong> You have cleared the instructional requirement. Click the evaluation button below immediately.";

        // Activate the 2-Minute Window Safety Constraint Engine
        initiateExpirationCountdown();
    }

    /**
     * 2 Minute Expiration Window Clock Engine
     */
    function initiateExpirationCountdown() {
        DOM.countdownWrapper.style.display = 'block';
        DOM.timerDigits.textContent = formatTime(state.countdownRemaining);

        state.countdownTimerId = setInterval(() => {
            state.countdownRemaining--;
            DOM.timerDigits.textContent = formatTime(state.countdownRemaining);

            if (state.countdownRemaining <= 0) {
                clearInterval(state.countdownTimerId);
                enforceRelockSequence();
            }
        }, CONFIG.TICK_RATE_MS);
    }

    /**
     * Enforce hard relock safety fallback state logic
     */
    function enforceRelockSequence() {
        state.isUnlocked = false;

        // Revert Lock Pill Badge
        DOM.lockStatusPill.textContent = "Expired";
        DOM.lockStatusPill.classList.remove('unlocked');
        DOM.lockStatusPill.classList.add('locked');

        // Lock interactive CTA Button interface completely
        DOM.quizBtn.setAttribute('disabled', 'true');
        DOM.quizBtn.classList.remove('unlocked');
        DOM.quizBtn.classList.add('locked');
        DOM.quizBtn.querySelector('.btn-icon').textContent = '🔒';
        DOM.btnText.textContent = "Access Session Expired - Reload Lesson Block";

        // Mutate messaging
        DOM.instructionText.innerHTML = "<span style='color: var(--accent-danger); font-weight: bold;'>Time window closed.</span> Evaluation portal safety lock engaged. Please refresh the page workspace stack matrix to initialize validation tracking protocols again.";
        DOM.countdownWrapper.style.backgroundColor = "rgba(239, 68, 68, 0.08)";
        DOM.countdownWrapper.style.borderColor = "rgba(239, 68, 68, 0.2)";
        DOM.countdownWrapper.querySelector('.alert-title').textContent = "Access Authorization Revoked";
        DOM.countdownWrapper.querySelector('.alert-title').style.color = "var(--accent-danger)";
        DOM.countdownWrapper.querySelector('.alert-desc').textContent = "Validation window parameters reached final threshold expiration.";
    }

    /**
     * Interface transition redirect dispatch execution context
     */
    function handleQuizRedirect() {
        if (state.isUnlocked) {
            // Futureproof clean clearing context hooks
            if (state.countdownTimerId) clearInterval(state.countdownTimerId);
            window.location.href = 'quiz.html';
        }
    }

    /**
     * Structural fallback gracefully handling API connection loss exceptions
     */
    function handleSystemError(err) {
        console.error("Critical Cloud Matrix Sync Error: ", err);
        if (DOM.loadingSpinner) {
            DOM.loadingSpinner.querySelector('.spinner').style.borderTopColor = 'var(--accent-danger)';
            DOM.spinnerText.innerHTML = `<span style="color: var(--accent-danger); font-weight: 700;">Matrix Integration Error</span><br><small style="color: var(--text-muted);">${err.message}</small>`;
        }
        DOM.lessonStatus.textContent = "Matrix Network Error";
        DOM.videoTitle.textContent = "Synchronization Interrupted";
    }

    // Launch Application Runtime Core Context
    document.addEventListener('DOMContentLoaded', init);

})();
