/**
 * TARA LMS - Quiz & Verification Module Engine Controller (Clean Single Security Layer)
 * Author: Senior Full Stack Developer
 */

(function () {
    'use strict';

    // ==========================================
    // 🔒 SINGLE SECURITY ACCESS CHECK 🔒
    // ==========================================
    // Agar browser memory mein video complete hone ka pass nahi milega, toh entry block ho jayegi.
    const hasAccessPass = sessionStorage.getItem('tara_quiz_access_granted');
    
    if (!hasAccessPass || hasAccessPass !== 'true') {
        alert("🚨 Security Block: Aap bina video complete kiye direct quiz page par nahi aa sakte!");
        window.location.replace('index.html');
        return; // Code ko yahi rok do
    }

    // Form Configuration Targets Constants
    const TARGETS = {
        Q2_MIN_CHAR: 50,
        Q3_MIN_CHAR: 30,
        Q4_MIN_CHAR: 80
    };

    // State Matrix Variables
    let validationState = {
        q1Valid: false,
        q2Valid: false,
        q3Valid: false,
        q4Valid: false,
        fileUploaded: false,
        complianceChecked: false,
        uploadedFileObject: null
    };

    // Core Cached DOM Registry Elements
    const DOM = {
        form: document.getElementById('quiz-form'),
        submitBtn: document.getElementById('submit-verification-btn'),
        btnSpinner: document.getElementById('btn-spinner'),
        btnText: document.getElementById('btn-text'),
        formContainer: document.getElementById('form-container'),
        successContainer: document.getElementById('success-container'),
        verificationStatus: document.getElementById('verification-status'),
        
        // Form Inputs
        q2TextArea: document.getElementById('biggest-learning'),
        q3TextArea: document.getElementById('action-implementation'),
        q4TextArea: document.getElementById('important-points'),
        fileInput: document.getElementById('file-input'),
        dropzone: document.getElementById('dropzone'),
        complianceCheck: document.getElementById('compliance-check'),
        confidenceSlider: document.getElementById('confidence-rating'),
        
        // Outputs & Real-Time Nodes
        counterQ2: document.getElementById('counter-q2'),
        counterQ3: document.getElementById('counter-q3'),
        counterQ4: document.getElementById('counter-q4'),
        ratingOutput: document.getElementById('rating-output'),
        previewContainer: document.getElementById('file-preview-container'),
        previewFilename: document.getElementById('preview-filename'),
        previewFilesize: document.getElementById('preview-filesize'),
        previewIcon: document.getElementById('preview-icon'),
        removeFileBtn: document.getElementById('remove-file-btn')
    };

    /**
     * Initialization Core Lifecycle Execution
     */
    function init() {
        bindInputTrackingEvents();
        bindDropzoneSystem();
    }

    /**
     * Register real-time change tracking metrics validation loops
     */
    function bindInputTrackingEvents() {
        // Radio input listener mutations
        document.getElementsByName('watch_confirm').forEach(radio => {
            radio.addEventListener('change', (e) => {
                validationState.q1Valid = (e.target.value === 'yes');
                evaluateGlobalFormValidity();
            });
        });

        // Live text length validation listeners
        DOM.q2TextArea.addEventListener('input', () => handleTextLengthValidation(DOM.q2TextArea, DOM.counterQ2, TARGETS.Q2_MIN_CHAR, 'q2Valid'));
        DOM.q3TextArea.addEventListener('input', () => handleTextLengthValidation(DOM.q3TextArea, DOM.counterQ3, TARGETS.Q3_MIN_CHAR, 'q3Valid'));
        DOM.q4TextArea.addEventListener('input', () => handleTextLengthValidation(DOM.q4TextArea, DOM.counterQ4, TARGETS.Q4_MIN_CHAR, 'q4Valid'));

        // Compliance acknowledgment box
        DOM.complianceCheck.addEventListener('change', (e) => {
            validationState.complianceChecked = e.target.checked;
            evaluateGlobalFormValidity();
        });

        // Realtime dynamic slider badge value updating loops
        DOM.confidenceSlider.addEventListener('input', (e) => {
            DOM.ratingOutput.textContent = e.target.value;
        });

        // Dispatched final validation pipeline submission listener
        DOM.form.addEventListener('submit', handleFormSubmissionPipeline);
    }

    /**
     * Text Character Counter Evaluation Module
     */
    function handleTextLengthValidation(element, counterElement, minLimit, stateProperty) {
        const length = element.value.trim().length;
        counterElement.textContent = `${length} / ${minLimit} characters`;

        if (length >= minLimit) {
            counterElement.classList.add('valid');
            validationState[stateProperty] = true;
        } else {
            counterElement.classList.remove('valid');
            validationState[stateProperty] = false;
        }
        evaluateGlobalFormValidity();
    }

    /**
     * Drag & Drop File Integration Upload Core Framework
     */
    function bindDropzoneSystem() {
        DOM.dropzone.addEventListener('click', () => DOM.fileInput.click());

        DOM.fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                processFileAttachment(e.target.files[0]);
            }
        });

        // Drag interaction visual status hooks
        ['dragenter', 'dragover'].forEach(eventName => {
            DOM.dropzone.addEventListener(eventName, (e) => {
                e.preventDefault();
                DOM.dropzone.classList.add('drag-over');
            }, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            DOM.dropzone.addEventListener(eventName, (e) => {
                e.preventDefault();
                DOM.dropzone.classList.remove('drag-over');
            }, false);
        });

        DOM.dropzone.addEventListener('drop', (e) => {
            const dt = e.dataTransfer;
            const files = dt.files;
            if (files.length > 0) {
                processFileAttachment(files[0]);
            }
        });

        DOM.removeFileBtn.addEventListener('click', clearFileAttachment);
    }

    /**
     * Validates and structural processes uploaded note files
     */
    function processFileAttachment(file) {
        const allowedExtensions = ['jpg', 'jpeg', 'png', 'pdf'];
        const fileExtension = file.name.split('.').pop().toLowerCase();

        if (!allowedExtensions.includes(fileExtension)) {
            alert('Please upload JPG, PNG, JPEG or PDF files only.');
            return;
        }

        validationState.fileUploaded = true;
        DOM.previewFilename.textContent = file.name;
        DOM.previewFilesize.textContent = formatBytes(file.size);
        DOM.previewIcon.textContent = fileExtension === 'pdf' ? '📕' : '🖼️';
        
        DOM.dropzone.style.display = 'none';
        DOM.previewContainer.style.display = 'block';

        evaluateGlobalFormValidity();
    }

    /**
     * Flushes note state files out entirely safely
     */
    function clearFileAttachment(e) {
        e.stopPropagation();
        validationState.fileUploaded = false;
        DOM.fileInput.value = '';
        DOM.previewContainer.style.display = 'none';
        DOM.dropzone.style.display = 'block';
        evaluateGlobalFormValidity();
    }

    function formatBytes(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }

    /**
     * Evaluate strict evaluation criteria matrix condition validations
     */
    function evaluateGlobalFormValidity() {
        const isFormValid = (
            validationState.q1Valid &&
            validationState.q2Valid &&
            validationState.q3Valid &&
            validationState.q4Valid &&
            validationState.fileUploaded &&
            validationState.complianceChecked
        );

        if (isFormValid) {
            DOM.submitBtn.removeAttribute('disabled');
        } else {
            DOM.submitBtn.setAttribute('disabled', 'true');
        }
    }

    /**
     * Form dispatching submission telemetry pipeline handler
     */
    function handleFormSubmissionPipeline(e) {
        e.preventDefault();
        if (DOM.submitBtn.hasAttribute('disabled')) return;

        DOM.submitBtn.setAttribute('disabled', 'true');
        DOM.btnSpinner.style.display = 'inline-block';
        DOM.btnText.textContent = "Processing Attendance Telemetry...";

        const dataPayloadMatrix = {
            watchConfirm: DOM.form.watch_confirm.value,
            biggestLearning: DOM.q2TextArea.value.trim(),
            actionImplementation: DOM.q3TextArea.value.trim(),
            importantPoints: DOM.q4TextArea.value.trim(),
            confidenceRating: DOM.confidenceSlider.value
        };

        setTimeout(() => {
            // Submission ke baad token delete kar do taaki dobara direct link kaam na kare
            sessionStorage.removeItem('tara_quiz_access_granted');
            executeGoogleAppsScriptSync(dataPayloadMatrix);
            dispatchDiscordNotificationMetrics(dataPayloadMatrix);
            recordAttendanceTimestamp();
            transitionToSuccessCard();
        }, 1800);
    }

    function transitionToSuccessCard() {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        DOM.formContainer.style.display = 'none';
        DOM.successContainer.style.display = 'block';
        DOM.verificationStatus.textContent = "Status: Verified & Processed";
        DOM.verificationStatus.style.borderColor = "var(--accent-success)";
        DOM.verificationStatus.style.color = "var(--accent-success)";
    }

    function executeGoogleAppsScriptSync(payload) {
        console.log("Future-Ready Hook Active: Prepared for Google Apps Script Sheet Array Sync.", payload);
    }

    function dispatchDiscordNotificationMetrics(payload) {
        console.log("Future-Ready Hook Active: Prepared for Discord webhook updates.");
    }

    function recordAttendanceTimestamp() {
        console.log("Future-Ready Hook Active: Internal persistence sequence checkpoint created.");
    }

    document.addEventListener('DOMContentLoaded', init);

})();
