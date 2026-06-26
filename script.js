/**
 * TARA LMS - Core Stream Engine Controller
 * Feature: 11 PM - 12 AM Automated Maintenance Lockout
 * Author: Senior Full Stack Developer
 */

(function () {
    'use strict';

    const CONFIG = {
        API_ENDPOINT: 'https://script.google.com/macros/s/AKfycbzXfKLksw0NHxRZEHBi2xydvkkIlGl5gxeTlwpYSfBsqjL0ZbMyCgnRjktLLTSqyO__/exec',
        QUIZ_COUNTDOWN_DURATION: 120,
        TICK_RATE_MS: 1000,
        MAINTENANCE: {
            START_HOUR: 23, // 11 PM
            END_HOUR: 0     // 12 AM (Midnight)
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
        btnText: document.getElementById('btn-text')
    };

    function checkMaintenanceStatus() {
        const now = new Date();
        const currentHour = now.getHours();

        // Check if current time falls between 11:00 PM and 11:59 PM
        if (currentHour === CONFIG.MAINTENANCE.START_HOUR) {
            injectMaintenanceUI();
            return true;
        }
        return false;
    }

    function injectMaintenanceUI() {
        // Clear all portal displays and force a full-screen lockdown banner
        document.body.innerHTML = `
            <div style="
                height: 100vh; 
                display: flex; 
                flex-direction: column; 
                justify-content: center; 
                align-items: center; 
                background: linear-gradient(135deg, #1e1e2f 0%, #111119 100%); 
                color: #ffffff; 
                font-family: 'Roboto', sans-serif; 
                text-align: center; 
                padding: 20px;
            ">
                <div style="font-size: 80px; margin-bottom: 20px;">⚙️</div>
                <h1 style="font-size: 32px; font-weight: 700; margin-bottom: 10px; color: #ffbc00;">
                    Daily Data Sync & Maintenance
                </h1>
                <p style="font-size: 18px; max-width: 600px; color: #a0a0b8; line-height: 1.6;">
                    Portal is temporarily offline for daily attendance synchronization and database optimization. 
                    We will be back live sharp at <b>12:00 AM (Midnight)</b>.
                </p>
                <div style="
                    margin-top: 30px; 
                    padding: 10px 20px; 
                    background: rgba(255, 188, 0, 0.1); 
                    border: 1px solid #ffbc00; 
                    border-radius: 20px; 
                    font-size: 14px; 
                    color: #ffbc00;
                ">
                    Standard Lockout Window: 11:00 PM - 12:00 AM Daily
                </div>
            </div>
        `;
    }

    function init() {
        // Guard Check: If maintenance hour is active, halt core engine immediately
        if (checkMaintenanceStatus()) return;

        sessionStorage.removeItem('tara_quiz_access_granted');
        window.addEventListener('keydown', handleGlobalKeyGuard, true);

        // Mobile Fullscreen Auto-Rotate Listeners
        document.addEventListener('fullscreenchange', handleOrientationPipeline);
        document.addEventListener('webkitfullscreenchange', handleOrientationPipeline);
        document.addEventListener('mozfullscreenchange', handleOrientationPipeline);
        document.addEventListener('MSFullscreenChange', handleOrientationPipeline);

        // Periodically verify time context so users already on the page get booted at 11 PM
        setInterval(checkMaintenanceStatus, 15000);

        const savedName = sessionStorage.getItem('tara_user_name');
        if (savedName) {
            launchPortalWorkspace();
        } else {
            DOM.loginForm.addEventListener('submit', handleLoginValidation);
        }
    }

    function handleOrientationPipeline() {
        const isFullscreen = !!(document.fullscreenElement || 
                               document.webkitFullscreenElement || 
                               document.mozFullScreenElement || 
                               document.msFullscreenElement);
        
        if (isFullscreen) {
            if (screen.orientation && screen.orientation.lock) {
                screen.orientation.lock('landscape').catch(function(error) {
                    console.log("Orientation lock skipped on desktop:", error);
                });
            } else if (screen.lockOrientation) {
                screen.lockOrientation('landscape');
            } else if (screen.webkitLockOrientation) {
                screen.webkitLockOrientation('landscape');
            }
        } else {
            if (screen.orientation && screen.orientation.unlock) {
                screen.orientation.unlock();
            } else if (screen.unlockOrientation) {
                screen.unlockOrientation();
            } else if (screen.webkitUnlockOrientation) {
                screen.webkitUnlockOrientation();
            }
        }
    }

    function handleGlobalKeyGuard(e) {
        const blocked = ['ArrowRight', 'ArrowLeft', 'Space', ' '];
        if (blocked.includes(e.key)) {
            e.preventDefault();
            return false;
        }
    }

    async function handleLoginValidation(e) {
        e.preventDefault();
        // Double check maintenance window right before allowing form submission
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
            console.error(err);
            DOM.loginBtn.removeAttribute('disabled');
        }
    }

    function launchPortalWorkspace() {
        DOM.loginContainer.style.display = 'none';
        DOM.portalContent.style.display = 'block';
        DOM.userDisplayBadge.textContent = `ID: ${sessionStorage.getItem('tara_user_name')}`;
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
        } catch (error) {
            console.error(error);
        }
    }

    function renderVideoIframe(url) {
        const iframe = document.createElement('iframe');
        const separator = url.includes('?') ? '&' : '?';
        iframe.src = `${url}${separator}autoplay=1`;
        
        iframe.id = "tara-secure-stream-frame";
        iframe.setAttribute('allow', 'autoplay; encrypted-media; picture-in-picture; fullscreen; orientation-lock;');
        iframe.setAttribute('webkitallowfullscreen', 'true');
        iframe.setAttribute('mozallowfullscreen', 'true');
        iframe.allowFullscreen = true;
        
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
        DOM.quizBtn.querySelector('.btn-icon').textContent = '🔒';
        DOM.btnText.textContent = "Session Access Protocol Expired";
    }

    function formatTime(seconds) {
        return `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${Math.floor(seconds % 60).toString().padStart(2, '0')}`;
    }

    function handleQuizRedirect() { if (state.isUnlocked) window.location.href = 'quiz.html'; }

    document.addEventListener('DOMContentLoaded', init);
})();
