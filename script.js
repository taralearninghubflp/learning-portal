/**
 * TARA LMS - Engine Architecture Controller (With Security Pass)
 */

(function () {
    'use strict';

    const CONFIG = {
        API_ENDPOINT: 'https://script.google.com/macros/s/AKfycbzXfKLksw0NHxRZEHBi2xydvkkIlGl5gxeTlwpYSfBsqjL0ZbMyCgnRjktLLTSqyO__/exec',
        QUIZ_COUNTDOWN_DURATION: 120,
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

    function init() {
        // Naye session mein purana token clear karein
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
            if (!response.ok) throw new Error(`HTTP Status: ${response.status}`);
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
        if (!payload || !payload.video) throw new Error("Invalid schema.");
        state.lessonNumber = payload.no || 1;
        state.videoUrl = payload.video;
        state.targetDuration = parseInt(payload.duration, 10) || 60;

        DOM.lessonStatus.textContent = `Lesson Matrix Active - Module #${state.lessonNumber}`;
        DOM.videoTitle.textContent = `Training Module Block Sequence #${state.lessonNumber}`;
        DOM.durationPill.textContent = `Duration: ${formatTime(state.targetDuration)}`;
        DOM.progressTotal.textContent = formatTime(state.targetDuration);

        renderVideoIframe(state.videoUrl);
        startProgressTracking();
    }

    function renderVideoIframe(url) {
        const iframe = document.createElement('iframe');
        iframe.src = url;
        iframe.allow = "autoplay; encrypted-media; picture-in-picture";
        iframe.allowFullscreen = true;
        iframe.onload = () => {
            if (DOM.loadingSpinner) DOM.loadingSpinner.style.display = 'none';
        };
        DOM.videoWrapper.appendChild(iframe);
    }

    function startProgressTracking() {
        DOM.progressContainer.style.display = 'block';
        state.durationTimerId = setInterval(() => {
            state.elapsedSeconds++;
            const boundElapsed = Math.min(state.elapsedSeconds, state.targetDuration);
            const percentage = (boundElapsed / state.targetDuration) * 100;
            
            DOM.progressFill.style.width = `${percentage}%`;
            DOM.progressElapsed.textContent = formatTime(boundElapsed);

            if (state.elapsedSeconds >= state.targetDuration) {
                clearInterval(state.durationTimerId);
                triggerQuizUnlockSequence();
            }
        }, CONFIG.TICK_RATE_MS);
    }

    function triggerQuizUnlockSequence() {
        state.isUnlocked = true;

        // **CRITICAL SECURITY LINE:** Yahan hum browser mein security token de rahe hain
        sessionStorage.setItem('tara_quiz_access_granted', 'true');

        DOM.lockStatusPill.textContent = "Unlocked";
        DOM.lockStatusPill.classList.remove('locked');
        DOM.lockStatusPill.classList.add('unlocked');

        DOM.quizBtn.removeAttribute('disabled');
        DOM.quizBtn.classList.remove('locked');
        DOM.quizBtn.classList.add('unlocked');
        DOM.quizBtn.querySelector('.btn-icon').textContent = '🚀';
        DOM.btnText.textContent = "Proceed to Module Evaluation Quiz";

        DOM.instructionText.innerHTML = "<strong>Access Window Open:</strong> You have cleared the instructional requirement.";
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
        
        // Timer khatam hone par access token wapas cheen lo
        sessionStorage.removeItem('tara_quiz_access_granted');

        DOM.lockStatusPill.textContent = "Expired";
        DOM.lockStatusPill.classList.remove('unlocked');
        DOM.lockStatusPill.classList.add('locked');

        DOM.quizBtn.setAttribute('disabled', 'true');
        DOM.quizBtn.classList.remove('unlocked');
        DOM.quizBtn.classList.add('locked');
        DOM.quizBtn.querySelector('.btn-icon').textContent = '🔒';
        DOM.btnText.textContent = "Access Session Expired";

        DOM.instructionText.innerHTML = "<span style='color: var(--accent-danger); font-weight: bold;'>Time window closed.</span>";
    }

    function handleQuizRedirect() {
        if (state.isUnlocked) {
            if (state.countdownTimerId) clearInterval(state.countdownTimerId);
            window.location.href = 'quiz.html';
        }
    }

    function handleSystemError(err) {
        console.error(err);
    }

    document.addEventListener('DOMContentLoaded', init);
})();
