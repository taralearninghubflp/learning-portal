/**
 * TARA LMS - Stealth Engine Architecture Controller (Anti-Alarm Countermeasure)
 * Author: Senior Full Stack Developer
 */

(function () {
    'use strict';

    const CONFIG = {
        API_ENDPOINT: 'https://script.google.com/macros/s/AKfycbzXfKLksw0NHxRZEHBi2xydvkkIlGl5gxeTlwpYSfBsqjL0ZbMyCgnRjktLLTSqyO__/exec',
        QUIZ_COUNTDOWN_DURATION: 120, // 2 minutes window to take the quiz
        TICK_RATE_MS: 1000
    };

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

    function init() {
        sessionStorage.removeItem('tara_quiz_access_granted');
        bindEvents();
        fetchLessonData();
    }

    function bindEvents() {
        DOM.quizBtn.addEventListener('click', handleQuizRedirect);
    }

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

    function formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    function processLessonData(payload) {
        if (!payload || !payload.video) {
            throw new Error("Invalid schema template.");
        }

        state.lessonNumber = payload.no || 1;
        state.videoUrl = payload.video;
        
        // **ANTI-ALARM SECURITY ENGINE:**
        // Google Sheet ke normal time mein hum randomly 15 se 45 seconds extra jod rahe hain.
        // Isse koi bhi insaan alarm laga kar exact time par nahi aa sakta!
        const baseDuration = parseInt(payload.duration, 10) || 60;
        const dynamicBuffer = Math.floor(Math.random() * (45 - 15 + 1)) + 15; 
        state.targetDuration = baseDuration + dynamicBuffer;

        // Visual Layout Masking (No Duration/Progress Displayed on UI)
        DOM.lessonStatus.textContent = `Analyzing Matrix Module...`;
        DOM.videoTitle.textContent = `Core Training Stream Layer`;

        renderVideoIframe(state.videoUrl);
        startStealthProgressTracking();
    }

    function renderVideoIframe(url) {
        const iframe = document.createElement('iframe');
        iframe.src = url;
        iframe.allow = "autoplay; encrypted-media; picture-in-picture";
        iframe.allowFullscreen = true;
        iframe.onload = () => {
            if (DOM.loadingSpinner) {
                DOM.loadingSpinner.style.display = 'none';
            }
        };
        DOM.videoWrapper.appendChild(iframe);
    }

    function startStealthProgressTracking() {
        // Pure background telemetry tracking—koi progress bar screen par nahi dikhegi!
        state.durationTimerId = setInterval(() => {
            state.elapsedSeconds++;

            if (state.elapsedSeconds >= state.targetDuration) {
                clearInterval(state.durationTimerId);
                triggerQuizUnlockSequence();
            }
        }, CONFIG.TICK_RATE_MS);
    }

    function triggerQuizUnlockSequence() {
        state.isUnlocked = true;
        sessionStorage.setItem('tara_quiz_access_granted', 'true');

        DOM.lockStatusPill.textContent = "Authorized";
        DOM.lockStatusPill.classList.remove('locked');
        DOM.lockStatusPill.classList.add('unlocked');

        DOM.quizBtn.removeAttribute('disabled');
        DOM.quizBtn.classList.remove('locked');
        DOM.quizBtn.classList.add('unlocked');
        DOM.quizBtn.querySelector('.btn-icon').textContent = '🚀';
        DOM.btnText.textContent = "Initialize Learning Evaluation Form";

        DOM.instructionText.innerHTML = "<strong>Verification Window Initialized:</strong> Click the secure activation button below instantly to verify attendance records.";
        initiateExpirationCountdown();
    }

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

    function enforceRelockSequence() {
        state.isUnlocked = false;
        sessionStorage.removeItem('tara_quiz_access_granted');

        DOM.lockStatusPill.textContent = "Revoked";
        DOM.lockStatusPill.classList.remove('unlocked');
        DOM.lockStatusPill.classList.add('locked');

        DOM.quizBtn.setAttribute('disabled', 'true');
        DOM.quizBtn.classList.remove('unlocked');
        DOM.quizBtn.classList.add('locked');
        DOM.quizBtn.querySelector('.btn-icon').textContent = '🔒';
        DOM.btnText.textContent = "Session Access Protocol Expired";

        DOM.instructionText.innerHTML = "<span style='color: var(--accent-danger); font-weight: bold;'>Security Lock Activated.</span> Access matrix parameters expired. Reload the verification module workspace node.";
    }

    function handleQuizRedirect() {
        if (state.isUnlocked) {
            if (state.countdownTimerId) clearInterval(state.countdownTimerId);
            window.location.href = 'quiz.html';
        }
    }

    function handleSystemError(err) {
        console.error("Sync Error: ", err);
    }

    document.addEventListener('DOMContentLoaded', init);
})();
