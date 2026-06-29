/**
 * TARA LMS - Quiz & Verification Module Engine Controller (Enterprise Cloud Sync Edition)
 */

(function () {
    'use strict';

    const hasAccessPass = sessionStorage.getItem('tara_quiz_access_granted');
    if (!hasAccessPass || hasAccessPass !== 'true') {
        alert("Access Denied: You must complete the video training module before accessing the evaluation portal.");
        window.location.replace('index.html');
        return; 
    }

    const CONFIG = {
        API_ENDPOINT: 'https://script.google.com/macros/s/AKfycbzXfKLksw0NHxRZEHBi2xydvkkIlGl5gxeTlwpYSfBsqjL0ZbMyCgnRjktLLTSqyO__/exec',
        TARGETS: { Q2_MIN_CHAR: 50, Q3_MIN_CHAR: 30, Q4_MIN_CHAR: 80 }
    };

    let validationState = {
        q1Valid: false, q2Valid: false, q3Valid: false, q4Valid: false,
        filesReadyToUpload: false, complianceChecked: false, fileUploadPayloads: []
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
        
        // Matrix Upload Components
        matrixWrapper: document.getElementById('file-upload-matrix'),
        matrixGrid: document.getElementById('file-preview-grid'),
        matrixStatusIcon: document.getElementById('matrix-status-icon'),
        matrixStatusText: document.getElementById('matrix-status-text'),
        clearAllBtn: document.getElementById('remove-all-files-btn')
    };

    function init() {
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
        DOM.dropzone.addEventListener('click', () => DOM.fileInput.click());
        DOM.fileInput.addEventListener('change', (e) => { if (e.target.files.length > 0) processMultipleFilesToDrive(Array.from(e.target.files)); });
        ['dragenter', 'dragover'].forEach(name => { DOM.dropzone.addEventListener(name, (e) => { e.preventDefault(); DOM.dropzone.classList.add('drag-over'); }, false); });
        ['dragleave', 'drop'].forEach(name => { DOM.dropzone.addEventListener(name, (e) => { e.preventDefault(); DOM.dropzone.classList.remove('drag-over'); }, false); });
        DOM.dropzone.addEventListener('drop', (e) => { if (e.dataTransfer.files.length > 0) processMultipleFilesToDrive(Array.from(e.dataTransfer.files)); });
        DOM.clearAllBtn.addEventListener('click', clearFileMatrixSystem);
    }

    // --- NEW: Cloud Drive Sync Module Handling Multiple Sheets ---
    async function processMultipleFilesToDrive(files) {
        // Clear previous state and grid
        validationState.fileUploadPayloads = [];
        validationState.filesReadyToUpload = false;
        DOM.matrixGrid.innerHTML = '';
        DOM.submitBtn.setAttribute('disabled', 'true'); // Temporarily disable submit while converting

        const allowed = ['jpg', 'jpeg', 'png', 'pdf'];
        
        if (files.length === 0) return;

        // Transition UI to Matrix view
        DOM.dropzone.style.display = 'none';
        DOM.matrixWrapper.style.display = 'block';
        DOM.matrixStatusIcon.textContent = '⏳';
        DOM.matrixStatusText.style.color = 'var(--accent-warning)';
        DOM.matrixStatusText.textContent = `Converting 0/${files.length} sheets for Cloud Sync...`;

        const userEmail = sessionStorage.getItem('tara_user_email') || 'anonymous_fbo';
        
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const ext = file.name.split('.').pop().toLowerCase();
            
            // Create Dynamic File Slot Card
            const cardId = `file-slot-${i}`;
            const fileSlotHtml = `
                <div class="matrix-card" id="${cardId}">
                    <span class="file-icon">${ext === 'pdf' ? '📕' : '🖼️'}</span>
                    <div class="file-info">
                        <p class="name">${file.name}</p>
                        <p class="meta" id="${cardId}-status">Preparing...</p>
                    </div>
                </div>`;
            DOM.matrixGrid.insertAdjacentHTML('beforeend', fileSlotHtml);
            const slotStatusText = document.getElementById(`${cardId}-status`);

            if (!allowed.includes(ext)) {
                slotStatusText.textContent = "Error: Format Not Supported";
                slotStatusText.style.color = "var(--accent-danger)";
                DOM.matrixStatusText.textContent = `Format error detected. Sheets invalidated.`;
                validationState.fileUploadPayloads = []; // Nuke payloads on single error for strict integrity
                evaluateGlobalFormValidity();
                return; // Critical failure, halt processing
            }

            // Convert file to Base64 String internally without native capture triggers
            try {
                const base64String = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result.split(',')[1]);
                    reader.onerror = () => reject(reader.error);
                    reader.readAsDataURL(file);
                });

                validationState.fileUploadPayloads.push({
                    fileName: `${userEmail}_sheet_${Date.now()}_${i+1}.${ext}`,
                    mimeType: file.type,
                    base64Data: base64String
                });
                slotStatusText.textContent = "Verified, Ready for Sync";
                slotStatusText.style.color = "var(--accent-success)";

                DOM.matrixStatusText.textContent = `Converting ${i + 1}/${files.length} sheets for Cloud Sync...`;

            } catch (error) {
                console.error("Internal conversion crash:", error);
                DOM.matrixStatusText.textContent = `System conversion error. Retry upload.`;
                validationState.fileUploadPayloads = [];
                evaluateGlobalFormValidity();
                return;
            }
        }

        validationState.filesReadyToUpload = (validationState.fileUploadPayloads.length > 0);
        DOM.matrixStatusIcon.textContent = '✅';
        DOM.matrixStatusText.style.color = 'var(--accent-success)';
        DOM.matrixStatusText.textContent = `${validationState.fileUploadPayloads.length} Sheets secured internally. Awaiting Session Complete command.`;
        evaluateGlobalFormValidity();
    }

    function clearFileMatrixSystem(e) {
        if (e) e.stopPropagation();
        validationState.filesReadyToUpload = false; validationState.fileUploadPayloads = []; DOM.fileInput.value = '';
        DOM.matrixGrid.innerHTML = ''; DOM.matrixWrapper.style.display = 'none'; DOM.dropzone.style.display = 'block'; 
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
        DOM.btnSpinner.style.display = 'inline-block';
        DOM.btnText.textContent = "Synchronizing Sheets with Google Drive...";

        // Split submission into parallel Drive uploads and single text sheet log
        const fileUploadPromises = validationState.fileUploadPayloads.map(payload => {
            return fetch(`${CONFIG.API_ENDPOINT}?action=driveUpload`, { 
                method: 'POST', 
                headers: { 'Content-Type': 'text/plain' }, // Bypass CORS preflight for faster direct POST
                body: JSON.stringify(payload) 
            });
        });

        // 🟢 Apps Script doPOST handles regular log if action not specified
        const quizLogPayload = {
            userName: sessionStorage.getItem('tara_user_name') || "Anonymous FBO",
            userEmail: sessionStorage.getItem('tara_user_email') || "No Email",
            watchConfirm: DOM.form.watch_confirm.value,
            biggestLearning: DOM.q2TextArea.value.trim(),
            actionImplementation: DOM.q3TextArea.value.trim(),
            importantPoints: DOM.q4TextArea.value.trim(),
            confidenceRating: DOM.confidenceSlider.value,
            sheetsCount: validationState.fileUploadPayloads.length
        };

        const quizLogPromise = fetch(CONFIG.API_ENDPOINT, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(quizLogPayload) });

        DOM.matrixStatusIcon.textContent = '📤';
        DOM.matrixStatusText.textContent = `Pushing Sheets to Drive...`;

        try {
            // Execution Matrix Parallel Dispatch
            await Promise.all([...fileUploadPromises, quizLogPromise]);
            
            sessionStorage.removeItem('tara_quiz_access_granted');
            transitionToSuccessCard();
        } catch (error) {
            console.error("Cloud push failed:", error);
            alert("Network Error during Drive synchronization. Your textual answers are safe, but sheets were not fully secured. Please re-submit.");
            DOM.submitBtn.removeAttribute('disabled'); DOM.btnSpinner.style.display = 'none'; DOM.btnText.textContent = "Resubmit Learning Verification";
        }
    }

    function transitionToSuccessCard() {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        DOM.formContainer.style.display = 'none'; DOM.successContainer.style.display = 'block';
        DOM.verificationStatus.textContent = "Status: Verified & Processed";
        DOM.verificationStatus.style.borderColor = "var(--accent-success)"; DOM.verificationStatus.style.color = "var(--accent-success)";
    }

    document.addEventListener('DOMContentLoaded', init);
})();
