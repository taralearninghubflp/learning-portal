/**
 * TARA LMS - Core Stream Engine Controller (Premium Theme & Production Lock Edition)
 * Features: Dark/Light Premium Toggle Logic & 11 PM - 12 AM Automated Maintenance Lockout
 */

(function () {
    'use strict';

    const CONFIG = {
        API_ENDPOINT: 'https://script.google.com/macros/s/AKfycbzXfKLksw0NHxRZEHBi2xydvkkIlGl5gxeTlwpYSfBsqjL0ZbMyCgnRjktLLTSqyO__/exec',
        QUIZ_COUNTDOWN_DURATION: 120,
        TICK_RATE_MS: 1000,
        MAINTENANCE: {
            START_HOUR: 23, // Real timing: Raat ke 11:00 baje automatic lock hoga
            END_HOUR: 0     // Real timing: Raat ke 12:00 baje (Midnight) automatic khulega
        }
    };

    let state = {
        lessonNumber: null, videoUrl: null, targetDuration: 0, elapsedSeconds: 0,
        countdownRemaining: CONFIG.QUIZ_COUNTDOWN_DURATION, durationTimerId: null, countdownTimerId: null, isUnlocked: false
    };

    const DOM = {
        loginContainer: document.getElementById('login-container'),
        portalContent: document.getElementById('portal-content'),
        loginForm: document.getElementById('login-form'),
        loginEmail: document.getElementById('login-email'),
        loginCode: document.getElementById('login-code'),
        loginBtn: document.getElementById('login-btn'),
        userDisplayBadge: document.getElementById('user-display-badge'),
        videoWrapper: document.getElementById('video-wrapper'),
        loadingSpinner: document.getElementById('loading-spinner'),
        lockStatusPill: document.getElementById('lock-status-pill'),
        instructionText: document.getElementById('instruction-text'),
        countdownWrapper: document.getElementById('countdown-wrapper'),
        timerDigits: document.getElementById('timer-digits'),
        quizBtn: document.getElementById('quiz-btn'),
        btnText: document.getElementById('btn-text'),
        
        // ☀️ Theme Elements Mapping
        themeToggleBtn: document.getElementById('theme-toggle-btn'),
        themeToggleIcon: document.getElementById('theme-toggle-icon')
    };

    // 🔒 REAL MAINTENANCE CHECK ENGINE
    function checkMaintenanceStatus() {
        const now = new Date();
        const currentHour = now.getHours();

        // Agar raat ke 11:00 baje hain (23), toh portal lock screen block actively inject karega
        if (currentHour === CONFIG.MAINTENANCE.START_HOUR) {
            injectMaintenanceUI();
            return true;
        }
        return false;
    }

    function injectMaintenanceUI() {
        document.body.innerHTML = `
            <div style="
                height: 100vh; 
                display: flex; 
                flex-direction: column; 
                justify-content: center; 
                align-items: center; 
                background: linear-gradient(135deg, #0f1626 0%, #070a13 100%); 
                color: #ffffff; 
                font-family: 'Segoe UI', -apple-system, sans-serif; 
                text-align: center; 
                padding: 20px;
            ">
                <div style="font-size: 80px; margin-bottom: 20px;">⚙️</div>
                <h1 style="font-size: 32px; font-weight: 700; margin-bottom: 10px; color: #3b82f6; letter-spacing: -0.5px;">
                    Daily Data Sync & Maintenance
                </h1>
                <p style="font-size: 15px; max-width: 550px; color: #cbd5e1; line-height: 1.6; margin-bottom: 24px;">
                    Portal is temporarily offline for daily attendance synchronization and database optimization. 
                    We will be back live sharp at <b>12:00 AM (Midnight)</b>.
                </p>
                <div style="
                    padding: 10px 24px; 
                    background: rgba(59, 130, 246, 0.05); 
                    border: 1px solid rgba(59, 130, 246, 0.2); 
                    border-radius: 50px; 
                    font-size: 12px; 
                    font-weight: 600;
                    color: #3b82f6;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                ">
                    Standard Lockout Window: 11:00 PM - 12:00 AM Daily
                </div>
            </div>
        `;
    }

    // ☀️ THEME MATRIX SYSTEM CONTROL
    function initializeThemeEngine() {
        const savedTheme = localStorage.getItem('tara_lms_theme') || 'dark';
        
        if (savedTheme === 'light') {
            document.documentElement.setAttribute('data-theme', 'light');
            if (DOM.themeToggleIcon) DOM.themeToggleIcon.textContent = '☀️';
        } else {
            document.documentElement.removeAttribute('data-theme');
            if (DOM.themeToggleIcon) DOM.themeToggleIcon.textContent = '🌙';
        }

        if (DOM.themeToggleBtn) {
            DOM.themeToggleBtn.addEventListener('click', () => {
                const currentTheme = document.documentElement.getAttribute('data-theme');
                if (currentTheme === 'light') {
                    document.documentElement.removeAttribute('data-theme');
                    localStorage.setItem('tara_lms_theme', 'dark');
                    if (DOM.themeToggleIcon) DOM.themeToggleIcon.textContent = '🌙';
                } else {
                    document.documentElement.setAttribute('data-theme', 'light');
                    localStorage.setItem('tara_lms_theme', 'light');
                    if (DOM.themeToggleIcon) DOM.themeToggleIcon.textContent = '☀️';
                }
            });
        }
    }

    function init() {
        if (checkMaintenanceStatus()) return; // Lock if time is exactly between 11 PM and 12 AM

        initializeThemeEngine();

        sessionStorage.removeItem('tara_quiz_access_granted');
        window.addEventListener('keydown', handleGlobalKeyGuard, true);

        document.addEventListener('fullscreenchange', handleOrientationPipeline);
        document.addEventListener('webkitfullscreenchange', handleOrientationPipeline);
        document.addEventListener('mozfullscreenchange', handleOrientationPipeline);
        document.addEventListener('MSFullscreenChange', handleOrientationPipeline);

        // Continuous real-time loop checking for 11 PM window arrival every 15s
        setInterval(checkMaintenanceStatus, 15000);

        const savedName = sessionStorage.getItem('tara_user_name');
        if (savedName) {
            launchPortalWorkspace();
        } else {
            DOM.loginForm.addEventListener('submit', handleLoginValidation);
        }
    }

    function handleOrientationPipeline() {
        const isFullscreen = !!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement);
        if (isFullscreen) {
            if (screen.orientation && screen.orientation.lock) { screen.orientation.lock('landscape').catch(function(e){}); }
        } else {
            if (screen.orientation && screen.orientation.unlock) { screen.orientation.unlock(); }
        }
    }

    function handleGlobalKeyGuard(e) {
        const blocked = ['ArrowRight', 'ArrowLeft', 'Space', ' '];
        if (blocked.includes(e.key)) { e.preventDefault(); return false; }
    }

    async function handleLoginValidation(e) {
        e.preventDefault();
        if (checkMaintenanceStatus()) return;

        DOM.loginBtn.setAttribute('disabled', 'true');
        DOM.loginBtn.textContent = "Verifying Identity...";
        const email = DOM.loginEmail.value.trim();
        const code = DOM.loginCode.value.trim();

        try {
            const response = await fetch(`${CONFIG.API_ENDPOINT}?action=login&email=${encodeURIComponent(email)}&code=${encodeURIComponent(code)}`);
            const data = await response.json();
            if (data.status === "success") {
                sessionStorage.setItem('tara_user_name', data.name);
                sessionStorage.setItem('tara_user_email', data.email);
                launchPortalWorkspace();
            } else {
                alert("Authentication Failed: Invalid credentials.");
                DOM.loginBtn.removeAttribute('disabled');
                DOM.loginBtn.textContent = "Authenticate Credentials";
            }
        } catch (err) {
            DOM.loginBtn.removeAttribute('disabled');
            DOM.loginBtn.textContent = "Authenticate Credentials";
        }
    }

    function launchPortalWorkspace() {
        DOM.loginContainer.style.display = 'none';
        DOM.portalContent.style.display = 'block';
        
        const badge = document.getElementById('user-display-badge');
        if (badge) {
            badge.style.display = 'block';
            badge.textContent = `ID: ${sessionStorage.getItem('tara_user_name')}`;
        }
        
        fetchLessonData();
        DOM.quizBtn.addEventListener('click', handleQuizRedirect);
    }

    async function fetchLessonData() {
        try {
            const response = await fetch(CONFIG.API_ENDPOINT);
            const data = await response.json();
            state.lessonNumber = data.no || 1;
            state.videoUrl = data.video;
            state.targetDuration = parseInt(data.duration, 10) || 60;
            renderVideoIframe(state.videoUrl);
            startStealthProgressTracking();
        } catch (error) {}
    }

    function renderVideoIframe(url) {
        const iframe = document.createElement('iframe');
        const separator = url.includes('?') ? '&' : '?';
        iframe.src = `${url}${separator}autoplay=1`;
        iframe.id = "tara-secure-stream-frame";
        
        iframe.setAttribute('allow', 'autoplay; encrypted-media; picture-in-picture; fullscreen; orientation-lock;');
        iframe.allowFullscreen = true;
        iframe.webkitAllowFullscreen = true;
        iframe.mozallowfullscreen = true;
        
        iframe.onload = () => { if (DOM.loadingSpinner) DOM.loadingSpinner.style.display = 'none'; };
        DOM.videoWrapper.appendChild(iframe);
    }

    function startStealthProgressTracking() {
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

        if (document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement) {
            const exitFS = document.exitFullscreen || document.webkitExitFullscreen || document.mozCancelFullScreen || document.msExitFullscreen;
            if (exitFS) {
                exitFS.call(document).catch(function(err) {
                    console.log("LMS Reset Redirect Restrained:", err);
                });
            }
        }

        if (screen.orientation && screen.orientation.unlock) {
            screen.orientation.unlock();
        }

        sessionStorage.setItem('tara_quiz_access_granted', 'true');
        DOM.lockStatusPill.textContent = "Authorized";
        DOM.lockStatusPill.classList.remove('locked');
        DOM.lockStatusPill.classList.add('unlocked');
        DOM.quizBtn.removeAttribute('disabled');
        DOM.quizBtn.classList.remove('locked');
        DOM.quizBtn.classList.add('unlocked');
        DOM.quizBtn.querySelector('.btn-icon').textContent = '🚀';
        DOM.btnText.textContent = "Initialize Learning Evaluation Form";
        initiateExpirationCountdown();
    }

    function initiateExpirationCountdown() {
        DOM.countdownWrapper.style.display = 'block';
        state.countdownTimerId = setInterval(() => {
            state.countdownRemaining--;
            DOM.timerDigits.textContent = formatTime(state.countdownRemaining);
            if (state.countdownRemaining <= 0) { clearInterval(state.countdownTimerId); enforceRelockSequence(); }
        }, CONFIG.TICK_RATE_MS);
    }

    function enforceRelockSequence() {
        state.isUnlocked = false;
        sessionStorage.removeItem('tara_quiz_access_granted');
        DOM.lockStatusPill.textContent = "Revoked";
        DOM.lockStatusPill.classList.add('locked');
        DOM.quizBtn.setAttribute('disabled', 'true');
        DOM.quizBtn.classList.remove('unlocked');
        DOM.quizBtn.classList.add('locked');
        DOM.quizBtn.querySelector('.btn-icon').textContent = '🔒';
        DOM.btnText.textContent = "Session Access Protocol Expired";
    }

    function formatTime(seconds) {
        return `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`;
    }

    document.addEventListener('DOMContentLoaded', init);
    function handleQuizRedirect() { if (state.isUnlocked) window.location.href = 'quiz.html'; }
})();
