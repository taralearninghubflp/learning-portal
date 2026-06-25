/**
 * TARA LMS - Core Stream Engine Controller (Exact Duration Match)
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
        lockStatusPill: document.getElementById('lock-status-pill'),
        instructionText: document.getElementById('instruction-text'),
        countdownWrapper: document.getElementById('countdown-wrapper'),
        timerDigits: document.getElementById('timer-digits'),
        quizBtn: document.getElementById('quiz-btn'),
        btnText: document.getElementById('btn-text')
    };

    /**
     * Initialization execution context
     */
    function init() {
        // Naye session mein purana token clear karein taaki security bani rahe
        sessionStorage.removeItem('tara_quiz_access_granted');
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
        
        // NO EXTRA TIME BUFFER: Exact Google Sheet ka duration hi use hoga
        state.targetDuration = parseInt(payload.duration, 10) || 60;

        // Visual Layout Masking (No Duration Displayed on UI)
        DOM.lessonStatus.textContent = `Analyzing Matrix Module...`;
        DOM.videoTitle.textContent = `Core Training Stream Layer`;

        // Inject the dynamic secure iFrame sandbox layer
        renderVideoIframe(state.videoUrl);
        
        // Boot stealth progression engines
        startStealthProgressTracking();
    }

    /**
     * Dynamic clean injection of Bunny Embed Frame
     */
    function renderVideoIframe(url) {
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
     * Track user lesson pacing runtime sequence (Stealth Background Processing)
     */
    function startStealthProgressTracking() {
        // Pure background tracking—screen par koi visual metrics/bar nahi dikhega
        state.durationTimerId = setInterval(() => {
            state.elapsedSeconds++;

            // Jaise hi exact sheet ka duration match hoga, button unlock ho jayega
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

        // Yahan hum browser mein security token de rahe hain
        sessionStorage.setItem('tara_quiz_access_granted', 'true');

        // Update Pill Badges
        DOM.lockStatusPill.textContent = "Authorized";
        DOM.lockStatusPill.classList.remove('locked');
        DOM.lockStatusPill.classList.add('unlocked');

        // Transition Action Button Status
        DOM.quizBtn.removeAttribute('disabled');
        DOM.quizBtn.classList.remove('locked');
        DOM.quizBtn.classList.add('unlocked');
        DOM.quizBtn.querySelector('.btn-icon').textContent = '🚀';
        DOM.btnText.textContent = "Initialize Learning Evaluation Form";

        // Instruction Mutation
        DOM.instructionText.innerHTML = "<strong>Verification Window Initialized:</strong> Click the secure activation button below instantly to verify attendance records.";

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

        // Timer khatam hote hi access token cheen lo
        sessionStorage.removeItem('tara_quiz_access_granted');

        // Revert Lock Pill Badge
        DOM.lockStatusPill.textContent = "Revoked";
        DOM.lockStatusPill.classList.remove('unlocked');
        DOM.lockStatusPill.classList.add('locked');

        // Lock interactive CTA Button interface completely
        DOM.quizBtn.setAttribute('disabled', 'true');
        DOM.quizBtn.classList.remove('unlocked');
        DOM.quizBtn.classList.add('locked');
        DOM.quizBtn.querySelector('.btn-icon').textContent = '🔒';
        DOM.btnText.textContent = "Session Access Protocol Expired";

        // Mutate messaging
        DOM.instructionText.innerHTML = "<span style='color: var(--accent-danger); font-weight: bold;'>Security Lock Activated.</span> Access matrix parameters expired. Reload the verification module workspace node.";
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
            DOM.loadingSpinner.querySelector('.spinner-text').innerHTML = `<span style="color: var(--accent-danger); font-weight: 700;">Matrix Integration Error</span><br><small style="color: var(--text-muted);">${err.message}</small>`;
        }
        DOM.lessonStatus.textContent = "Matrix Network Error";
        DOM.videoTitle.textContent = "Synchronization Interrupted";
    }

    // Launch Application Runtime Core Context
    document.addEventListener('DOMContentLoaded', init);

})();
