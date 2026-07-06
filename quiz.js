/**
 * TARA LMS - Quiz Engine (Discord Matrix Delivery Edition with Dynamic UI Theme Engine)
 * Feature: Multi-Tap Append Files Logic
 */

(function () {
    'use strict';

    const hasAccessPass = sessionStorage.getItem('tara_quiz_access_granted');
    if (!hasAccessPass || hasAccessPass !== 'true') {
        alert("Access Denied: You must complete the video training module before accessing the evaluation portal.");
        window.location.replace('index.html');
        return; 
    }

    // 🟢 DISCORD AUTH COORDINATE
    const DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/1523754029174227106/2ENRAQQG8UvH3QV44D26HWxp_zaTP87fi3HxaMcalB7x2SbQnJgAw0oPyATe9quWMbp9"; 

    const CONFIG = {
        API_ENDPOINT: 'https://script.google.com/macros/s/AKfycbzXfKLksw0NHxRZEHBi2xydvkkIlGl5gxeTlwpYSfBsqjL0ZbMyCgnRjktLLTSqyO__/exec',
        TARGETS: { Q2_MIN_CHAR: 50, Q3_MIN_CHAR: 30, Q4_MIN_CHAR: 80 },
        MAX_FILES: 5 // Maximum 5 sheets allowed
    };

    let validationState = {
        q1Valid: false, q2Valid: false, q3Valid: false, q4Valid: false,
        filesReadyToUpload: false, complianceChecked: false, fileUploadPayloads: [] // Array to store appended files
    };

    const DOM = {
        form: document.getElementById('quiz-form'),
        submitBtn: document.getElementById('submit-verification-btn'),
        btnSpinner: document.getElementById('btn-spinner'),
        btnText: document.getElementById('btn-text'),
        formContainer: document.getElementById('form-container'),
        successContainer: document.getElementById('success-container'),
        verificationStatus: document.getElementById('verification-status'),
        q2TextArea: document.getElementById('biggest-learning'),
        q3TextArea: document.getElementById('action-implementation'),
        q4TextArea: document.getElementById('important-points'),
        fileInput: document.getElementById('file-input'),
        dropzone: document.getElementById('dropzone'),
        complianceCheck: document.getElementById('compliance-check'),
        confidenceSlider: document.getElementById('confidence-rating'),
        counterQ2: document.getElementById('counter-q2'),
        counterQ3: document.getElementById('counter-q3'),
        counterQ4: document.getElementById('counter-q4'),
        ratingOutput: document.getElementById('rating-output'),
        matrixWrapper: document.getElementById('file-upload-matrix'),
        matrixGrid: document.getElementById('file-preview-grid'),
        matrixStatusIcon: document.getElementById('matrix-status-icon'),
        matrixStatusText: document.getElementById('matrix-status-text'),
        clearAllBtn: document.getElementById('remove-all-files-btn'),
        
        // Theme nodes mapping
        themeToggleBtn: document.getElementById('theme-toggle-btn'),
        themeToggleIcon: document.getElementById('theme-toggle-icon')
    };

    // ☀️ FLUID THEME TRACKING LAYER
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
        initializeThemeEngine();
        bindInputTrackingEvents();
        bindDropzoneSystem();
    }

    function bindInputTrackingEvents() {
        document.getElementsByName('watch_confirm').forEach(radio => {
            radio.addEventListener('change', (e) => { validationState.q1Valid = (e.target.value === 'yes'); evaluateGlobalFormValidity(); });
        });
        DOM.q2TextArea.addEventListener('input', () => handleTextLengthValidation(DOM.q2TextArea, DOM.counterQ2, CONFIG.TARGETS.Q2_MIN_CHAR, 'q2Valid'));
        DOM.q3TextArea.addEventListener('input', () => handleTextLengthValidation(DOM.q3TextArea, DOM.counterQ3, CONFIG.TARGETS.Q3_MIN_CHAR, 'q3Valid'));
        DOM.q4TextArea.addEventListener('input', () => handleTextLengthValidation(DOM.q4TextArea, DOM.counterQ4, CONFIG.TARGETS.Q4_MIN_CHAR, 'q4Valid'));
        DOM.complianceCheck.addEventListener('change', (e) => { validationState.complianceChecked = e.target.checked; evaluateGlobalFormValidity(); });
        DOM.confidenceSlider.addEventListener('input', (e) => { DOM.ratingOutput.textContent = e.target.value; });
        DOM.form.addEventListener('submit', handleFormSubmissionPipeline);
    }

    function handleTextLengthValidation(element, counterElement, minLimit, stateProperty) {
        const length = element.value.trim().length;
        counterElement.textContent = `${length} / ${minLimit} characters`;
        validationState[stateProperty] = (length >= minLimit);
        counterElement.classList.toggle('valid', length >= minLimit);
        evaluateGlobalFormValidity();
    }

    function bindDropzoneSystem() {
        // 🟢 FIX A: Pure Upload Matrix area par click karne par bhi add file ka option khulega
        DOM.dropzone.addEventListener('click', () => DOM.fileInput.click());
        DOM.matrixWrapper.addEventListener('click', (e) => {
            // Agar clear button par click nahi kiya hai, toh click par input trigger hoga
            if (e.target !== DOM.clearAllBtn) {
                DOM.fileInput.click();
            }
        });

        DOM.fileInput.addEventListener('change', (e) => { if (e.target.files.length > 0) processMultipleFilesToDrive(Array.from(e.target.files)); });
        ['dragenter', 'dragover'].forEach(name => { DOM.dropzone.addEventListener(name, (e) => { e.preventDefault(); DOM.dropzone.classList.add('drag-over'); }, false); });
        ['dragleave', 'drop'].forEach(name => { DOM.dropzone.preventDefault(); DOM.dropzone.classList.remove('drag-over'); }, false);
        DOM.dropzone.addEventListener('drop', (e) => { if (e.dataTransfer.files.length > 0) processMultipleFilesToDrive(Array.from(e.dataTransfer.files)); });
        
        if (DOM.clearAllBtn) {
            DOM.clearAllBtn.addEventListener('click', clearFileMatrixSystem);
        }
    }

    async function processMultipleFilesToDrive(newFiles) {
        DOM.submitBtn.setAttribute('disabled', 'true');
        const allowed = ['jpg', 'jpeg', 'png', 'pdf'];

        // 🟢 FIX B: Dropzone hamesha open rahega retap ke liye, aur list layout badlega
        DOM.dropzone.style.display = 'block'; 
        DOM.matrixWrapper.style.display = 'block';
        DOM.matrixStatusIcon.textContent = '⏳';
        DOM.matrixStatusText.textContent = `Processing selected files...`;

        for (let i = 0; i < newFiles.length; i++) {
            const file = newFiles[i];
            const ext = file.name.split('.').pop().toLowerCase();
            
            // Check max limits parameters
            if (validationState.fileUploadPayloads.length >= CONFIG.MAX_FILES) {
                alert(`Maximum ${CONFIG.MAX_FILES} sheets allowed context template limits.`);
                break;
            }

            if (!allowed.includes(ext)) {
                alert(`"${file.name}" is in an invalid format. Only JPG, PNG, PDF allowed.`);
                continue;
            }

            // Append new raw file array seamlessly inside state arrays tracking matrix
            validationState.fileUploadPayloads.push(file);

            const dynamicIndex = validationState.fileUploadPayloads.length - 1;
            const cardId = `file-slot-${dynamicIndex}`;
            
            DOM.matrixGrid.insertAdjacentHTML('beforeend', `
                <div class="matrix-card" id="${cardId}">
                    <span class="file-icon">${ext === 'pdf' ? '📕' : '🖼️'}</span>
                    <div class="file-info">
                        <p class="name">${file.name}</p>
                        <p class="meta" id="${cardId}-status" style="color: var(--accent-success); font-weight:700;">Verified</p>
                    </div>
                </div>`);
        }

        // Clean file input reference path string token
        DOM.fileInput.value = '';

        validationState.filesReadyToUpload = (validationState.fileUploadPayloads.length > 0);
        DOM.matrixStatusIcon.textContent = '✅';
        DOM.matrixStatusText.textContent = `${validationState.fileUploadPayloads.length} Sheets loaded. Tap area again to add more documents.`;
        evaluateGlobalFormValidity();
    }

    function clearFileMatrixSystem(e) {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        validationState.filesReadyToUpload = false; 
        validationState.fileUploadPayloads = []; 
        if (DOM.fileInput) DOM.fileInput.value = '';
        DOM.matrixGrid.innerHTML = ''; 
        DOM.matrixWrapper.style.display = 'none'; 
        DOM.dropzone.style.display = 'block'; 
        evaluateGlobalFormValidity();
    }

    function evaluateGlobalFormValidity() {
        const isValid = (validationState.q1Valid && validationState.q2Valid && validationState.q3Valid && validationState.q4Valid && validationState.filesReadyToUpload && validationState.complianceChecked);
        if (isValid) DOM.submitBtn.removeAttribute('disabled'); else DOM.submitBtn.setAttribute('disabled', 'true');
    }

    async function handleFormSubmissionPipeline(e) {
        e.preventDefault();
        if (DOM.submitBtn.hasAttribute('disabled')) return;

        DOM.submitBtn.setAttribute('disabled', 'true');
        if(DOM.btnSpinner) DOM.btnSpinner.style.display = 'inline-block';
        DOM.btnText.textContent = "Logging text answers in spreadsheet...";
        
        const userName = sessionStorage.getItem('tara_user_name') || "Anonymous FBO";
        const userEmail = sessionStorage.getItem('tara_user_email') || "No Email";

        const textualPayload = {
            userName: userName,
            userEmail: userEmail,
            watchConfirm: DOM.form.watch_confirm.value,
            biggestLearning: DOM.q2TextArea.value.trim(),
            actionImplementation: DOM.q3TextArea.value.trim(),
            importantPoints: DOM.q4TextArea.value.trim(),
            confidenceRating: DOM.confidenceSlider.value,
            sheetsCount: validationState.fileUploadPayloads.length
        };

        try {
            // A. Log text answers to Google Sheet
            await fetch(CONFIG.API_ENDPOINT, { 
                method: 'POST', 
                headers: { 'Content-Type': 'text/plain;charset=utf-8' }, 
                body: JSON.stringify(textualPayload) 
            });

            // B. Push files straight to Discord via Webhook Multipart Form Data
            const formData = new FormData();
            const embedPayload = {
                title: "📝 New Notes Verification Packet",
                color: 5814783,
                fields: [
                    { name: "👤 Candidate Name", value: userName, inline: true },
                    { name: "📧 Email Address", value: userEmail, inline: true },
                    { name: "📊 Total Attached Sheets", value: `${validationState.fileUploadPayloads.length} Page(s)`, inline: true },
                    { name: "📅 Date Submitted", value: new Date().toLocaleDateString('en-GB'), inline: true }
                ],
                footer: { text: "TARA LMS Security Engine" }
            };

            formData.append("payload_json", JSON.stringify({ embeds: [embedPayload] }));

            const totalFiles = validationState.fileUploadPayloads.length;
            for (let i = 0; i < totalFiles; i++) {
                DOM.btnText.textContent = `Uploading Notes Sheet ${i + 1}/${totalFiles}...`;
                formData.append(`file${i}`, validationState.fileUploadPayloads[i]);
            }

            await fetch(DISCORD_WEBHOOK_URL, {
                method: 'POST',
                body: formData
            });

            DOM.btnText.textContent = "Verification Complete! Finalizing...";
            sessionStorage.removeItem('tara_quiz_access_granted');
            transitionToSuccessCard();
        } catch (error) {
            console.error(error);
            alert("Connection timeout. The file bundle is too heavy or the network dropped. Retrying...");
            DOM.submitBtn.removeAttribute('disabled'); if(DOM.btnSpinner) DOM.btnSpinner.style.display = 'none'; DOM.btnText.textContent = "Complete Today's Learning";
        }
    }

    function transitionToSuccessCard() {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        DOM.formContainer.style.display = 'none'; DOM.successContainer.style.display = 'block';
        if(DOM.verificationStatus) DOM.verificationStatus.textContent = "Status: Processed & Discord Synced";
    }

    document.addEventListener('DOMContentLoaded', init);
})();
