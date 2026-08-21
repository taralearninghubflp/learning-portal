/**
 * TARA LMS - Core Stream Engine Controller (Mobile + Desktop Strict Guard Edition)
 */

(function () {
    'use strict';

    const CONFIG = {
        API_ENDPOINT: 'https://script.google.com/macros/s/AKfycbzXfKLksw0NHxRZEHBi2xydvkkIlGl5gxeTlwpYSfBsqjL0ZbMyCgnRjktLLTSqyO__/exec',
        QUIZ_COUNTDOWN_DURATION: 120, // 2 Minutes
        TICK_RATE_MS: 1000,
        MAINTENANCE: {
            START_HOUR: 23,
            END_HOUR: 0
        }
    };

    let state = {
        lessonNumber: null, 
        videoUrl: null, 
        targetDuration: 0, 
        elapsedSeconds: 0,
        countdownRemaining: CONFIG.QUIZ_COUNTDOWN_DURATION, 
        durationTimerId: null, 
        countdownTimerId: null, 
        isUnlocked: false,
        isNavigatingSafely: false
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
        popupTimerDigits: document.getElementById('popup-timer-digits'),
        popupActionBtn: document.getElementById('popup-action-btn'),
        popupDismissBtn: document.getElementById('popup-dismiss-btn'),
        popupTickerBox: document.getElementById('popup-ticker-box'),
        popupTickerSub: document.getElementById('popup-ticker-sub'),
        quizBtn: document.getElementById('quiz-btn'),
        btnText: document.getElementById('btn-text'),
        fiveMinAlert: document.getElementById('five-min-alert'),
        formPopupModal: document.getElementById('form-popup-modal'),
        themeToggleBtn: document.getElementById('theme-toggle-btn'),
        themeToggleIcon: document.getElementById('theme-toggle-icon')
    };

    function checkMaintenanceStatus() {
        const now = new Date();
        const currentHour = now.getHours();

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

    /* 🛡️ MOBILE DUAL-STAGE RELOAD GUARD */
    function setupMobileStrictReloadGuard() {
        // 1. Mobile Back-Button / Swipe Lock
        window.history.pushState(null, null, window.location.href);
        window.addEventListener('popstate', function (e) {
            if (!state.isNavigatingSafely && sessionStorage.getItem('tara_user_name')) {
                window.history.pushState(null, null, window.location.href);
                alert("⚠️ WARNING: Live training session active! Do not press back or reload.");
            }
        });

        // 2. Cross-Device Desktop & Mobile Unload Guard
        window.addEventListener('beforeunload', handlePageReloadWarning);
        window.onbeforeunload = handlePageReloadWarning;
    }

    function handlePageReloadWarning(e) {
        if (state.isNavigatingSafely) return;

        if (sessionStorage.getItem('tara_user_name')) {
            const warningMsg = "Warning: Active training session in progress. Reloading will reset your progress.";
            e = e || window.event;
            if (e) {
                e.preventDefault();
                e.returnValue = warningMsg;
            }
            return warningMsg;
        }
    }

    function init() {
        if (checkMaintenanceStatus()) return;

        initializeThemeEngine();
        setupMobileStrictReloadGuard();

        sessionStorage.removeItem('tara_quiz_access_granted');
        window.addEventListener('keydown', handleGlobalKeyGuard, true);

        document.addEventListener('fullscreenchange', handleOrientationPipeline);
        document.addEventListener('webkitfullscreenchange', handleOrientationPipeline);
        document.addEventListener('mozfullscreenchange', handleOrientationPipeline);
        document.addEventListener('MSFullscreenChange', handleOrientationPipeline);

        setInterval(checkMaintenanceStatus, 15000);

        if (DOM.quizBtn) DOM.quizBtn.addEventListener('click', executeRedirectToQuiz);
        if (DOM.popupActionBtn) DOM.popupActionBtn.addEventListener('click', executeRedirectToQuiz);
        if (DOM.popupDismissBtn) {
            DOM.popupDismissBtn.addEventListener('click', () => {
                if (DOM.formPopupModal) DOM.formPopupModal.style.display = 'none';
            });
        }

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
        
        // Push initial history state on workspace launch
        window.history.pushState(null, null, window.location.href);
        fetchLessonData();
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
            if (!document.hidden && !state.isUnlocked) {
                state.elapsedSeconds++;

                const remaining = state.targetDuration - state.elapsedSeconds;
                if (remaining > 0 && remaining <= 300) {
                    if (DOM.fiveMinAlert) DOM.fiveMinAlert.style.display = 'flex';
                } else {
                    if (DOM.fiveMinAlert) DOM.fiveMinAlert.style.display = 'none';
                }

                if (state.elapsedSeconds >= state.targetDuration) {
                    clearInterval(state.durationTimerId);
                    if (DOM.fiveMinAlert) DOM.fiveMinAlert.style.display = 'none';
                    triggerQuizUnlockSequence();
                }
            }
        }, CONFIG.TICK_RATE_MS);
    }

    function triggerQuizUnlockSequence() {
        state.isUnlocked = true;

        if (document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement) {
            const exitFS = document.exitFullscreen || document.webkitExitFullscreen || document.mozCancelFullScreen || document.msExitFullscreen;
            if (exitFS) exitFS.call(document).catch(function(err) {});
        }

        if (screen.orientation && screen.orientation.unlock) {
            screen.orientation.unlock();
        }

        sessionStorage.setItem('tara_quiz_access_granted', 'true');
        
        DOM.lockStatusPill.textContent = "Authorized & Ready";
        DOM.lockStatusPill.classList.remove('locked');
        DOM.lockStatusPill.classList.add('unlocked');
        
        DOM.quizBtn.removeAttribute('disabled');
        DOM.quizBtn.classList.remove('locked');
        DOM.quizBtn.classList.add('unlocked');
        DOM.quizBtn.querySelector('.btn-icon').textContent = '🚀';
        DOM.btnText.textContent = "Open Evaluation Form & Complete Module";
        
        if (DOM.formPopupModal) {
            DOM.formPopupModal.style.display = 'flex';
        }

        initiateExpirationCountdown();
    }

    function initiateExpirationCountdown() {
        if (DOM.countdownWrapper) DOM.countdownWrapper.style.display = 'block';
        
        state.countdownTimerId = setInterval(() => {
            state.countdownRemaining--;
            
            const timeStr = formatTime(state.countdownRemaining);
            if (DOM.timerDigits) DOM.timerDigits.textContent = timeStr;
            if (DOM.popupTimerDigits) DOM.popupTimerDigits.textContent = timeStr;

            if (state.countdownRemaining <= 0) { 
                clearInterval(state.countdownTimerId); 
                enforceRelockSequence(); 
            }
        }, CONFIG.TICK_RATE_MS);
    }

    function enforceRelockSequence() {
        state.isUnlocked = false;
        sessionStorage.removeItem('tara_quiz_access_granted');
        
        if (DOM.popupActionBtn) {
            DOM.popupActionBtn.setAttribute('disabled', 'true');
            DOM.popupActionBtn.innerHTML = "🔒 Access Window Expired";
            DOM.popupActionBtn.classList.remove('unlocked');
        }

        if (DOM.popupTickerBox) {
            DOM.popupTickerBox.style.background = "rgba(239, 68, 68, 0.08)";
            DOM.popupTickerBox.style.borderColor = "rgba(239, 68, 68, 0.3)";
        }

        if (DOM.popupTimerDigits) {
            DOM.popupTimerDigits.textContent = "00:00";
            DOM.popupTimerDigits.style.color = "var(--accent-danger)";
        }

        if (DOM.popupTickerSub) {
            DOM.popupTickerSub.textContent = "Session access window closed. Re-authentication required.";
            DOM.popupTickerSub.style.color = "var(--accent-danger)";
        }

        DOM.lockStatusPill.textContent = "Revoked";
        DOM.lockStatusPill.classList.remove('unlocked');
        DOM.lockStatusPill.classList.add('locked');
        
        DOM.quizBtn.setAttribute('disabled', 'true');
        DOM.quizBtn.classList.remove('unlocked');
        DOM.quizBtn.classList.add('locked');
        DOM.quizBtn.querySelector('.btn-icon').textContent = '🔒';
        DOM.btnText.textContent = "Session Access Expired";

        if (DOM.timerDigits) {
            DOM.timerDigits.textContent = "00:00";
            DOM.timerDigits.style.color = "var(--accent-danger)";
        }
    }

    function formatTime(seconds) {
        return `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`;
    }

    function executeRedirectToQuiz() { 
        if (state.isUnlocked) {
            state.isNavigatingSafely = true;
            window.location.href = 'quiz.html'; 
        } else {
            alert("⚠️ Session access has expired. Please re-authenticate.");
        }
    }

    document.addEventListener('DOMContentLoaded', init);
})();
