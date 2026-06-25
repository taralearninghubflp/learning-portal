/**
 * TARA LMS - Quiz & Verification Module Engine Controller (Live Google Sheets Integration)
 * Author: Senior Full Stack Developer
 */

(function () {
    'use strict';

    // ==========================================
    // 🔒 SINGLE SECURITY ACCESS CHECK 🔒
    // ==========================================
    const hasAccessPass = sessionStorage.getItem('tara_quiz_access_granted');
    
    if (!hasAccessPass || hasAccessPass !== 'true') {
        alert("Access Denied: You must complete the video training module before accessing the evaluation portal.");
        window.location.replace('index.html');
        return;
    }

    const CONFIG = {
        // Aapka same Apps Script URL jo index.html use karta hai
        API_ENDPOINT: 'https://script.google.com/macros/s/AKfycbzXfKLksw0NHxRZEHBi2xydvkkIlGl5gxeTlwpYSfBsqjL0ZbMyCgnRjktLLTSqyO__/exec',
        TARGETS: { Q2_MIN_CHAR: 50, Q3_MIN_CHAR: 30, Q4_MIN_CHAR: 80 }
    };

    let validationState = {
        q1Valid: false, q2Valid: false, q3Valid: false, q4Valid: false,
        fileUploaded: false, complianceChecked: false,
        uploadedFileName: "", uploadedFileBase64: ""
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
        previewContainer: document.getElementById('file-preview-container'),
        previewFilename: document.getElementById('preview-filename'),
        previewFilesize: document.getElementById('preview-filesize'),
        previewIcon: document.getElementById('preview-icon'),
        removeFileBtn: document.getElementById('remove-file-btn')
    };

    function init() {
        bindInputTrackingEvents();
        bindDropzoneSystem();
    }

    function bindInputTrackingEvents() {
        document.getElementsByName('watch_confirm').forEach(radio => {
            radio.addEventListener('change', (e) => {
                validationState.q1Valid = (e.target.value === 'yes');
                evaluateGlobalFormValidity();
            });
        });

        DOM.q2TextArea.addEventListener('input', () => handleTextLengthValidation(DOM.q2TextArea, DOM.counterQ2, CONFIG.TARGETS.Q2_MIN_CHAR, 'q2Valid'));
        DOM.q3TextArea.addEventListener('input', () => handleTextLengthValidation(DOM.q3TextArea, DOM.counterQ3, CONFIG.TARGETS.Q3_MIN_CHAR, 'q3Valid'));
        DOM.q4TextArea.addEventListener('input', () => handleTextLengthValidation(DOM.q4TextArea, DOM.counterQ4, CONFIG.TARGETS.Q4_MIN_CHAR, 'q4Valid'));

        DOM.complianceCheck.addEventListener('change', (e) => {
            validationState.complianceChecked = e.target.checked;
            evaluateGlobalFormValidity();
        });

        DOM.confidenceSlider.addEventListener('input', (e) => {
            DOM.ratingOutput.textContent = e.target.value;
        });

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
        DOM.fileInput.addEventListener('change', (e) => { if (e.target.files.length > 0) processFileAttachment(e.target.files[0]); });

        ['dragenter', 'dragover'].forEach(name => { DOM.dropzone.addEventListener(name, (e) => { e.preventDefault(); DOM.dropzone.classList.add('drag-over'); }, false); });
        ['dragleave', 'drop'].forEach(name => { DOM.dropzone.addEventListener(name, (e) => { e.preventDefault(); DOM.dropzone.classList.remove('drag-over'); }, false); });

        DOM.dropzone.addEventListener('drop', (e) => { if (e.dataTransfer.files.length > 0) processFileAttachment(e.dataTransfer.files[0]); });
        DOM.removeFileBtn.addEventListener('click', clearFileAttachment);
    }

    function processFileAttachment(file) {
        const allowed = ['jpg', 'jpeg', 'png', 'pdf'];
        const ext = file.name.split('.').pop().toLowerCase();

        if (!allowed.includes(ext)) {
            alert('Invalid file format. Please upload JPG, PNG, JPEG or PDF files only.');
            return;
        }

        // Convert notes file to Base64 String so it can travel securely to Google Sheets
        const reader = new FileReader();
        reader.onload = function(e) {
            validationState.uploadedFileBase64 = e.target.result;
            validationState.uploadedFileName = file.name;
            validationState.fileUploaded = true;

            DOM.previewFilename.textContent = file.name;
            DOM.previewFilesize.textContent = (file.size / 1024).toFixed(2) + " KB";
            DOM.previewIcon.textContent = ext === 'pdf' ? '📕' : '🖼️';
            
            DOM.dropzone.style.display = 'none';
            DOM.previewContainer.style.display = 'block';
            evaluateGlobalFormValidity();
        };
        reader.readAsDataURL(file);
    }

    function clearFileAttachment(e) {
        e.stopPropagation();
        validationState.fileUploaded = false;
        validationState.uploadedFileBase64 = "";
        validationState.uploadedFileName = "";
        DOM.fileInput.value = '';
        DOM.previewContainer.style.display = 'none';
        DOM.dropzone.style.display = 'block';
        evaluateGlobalFormValidity();
    }

    function evaluateGlobalFormValidity() {
        const isValid = (validationState.q1Valid && validationState.q2Valid && validationState.q3Valid && validationState.q4Valid && validationState.fileUploaded && validationState.complianceChecked);
        if (isValid) DOM.submitBtn.removeAttribute('disabled'); else DOM.submitBtn.setAttribute('disabled', 'true');
    }

    async function handleFormSubmissionPipeline(e) {
        e.preventDefault();
        if (DOM.submitBtn.hasAttribute('disabled')) return;

        DOM.submitBtn.setAttribute('disabled', 'true');
        DOM.btnSpinner.style.display = 'inline-block';
        DOM.btnText.textContent = "Saving to Google Sheets...";

        const payload = {
            watchConfirm: DOM.form.watch_confirm.value,
            biggestLearning: DOM.q2TextArea.value.trim(),
            actionImplementation: DOM.q3TextArea.value.trim(),
            importantPoints: DOM.q4TextArea.value.trim(),
            confidenceRating: DOM.confidenceSlider.value,
            filePayload: validationState.uploadedFileBase64 // Sends base64 text of the notes
        };

        try {
            // Send the network request directly to Google Apps Script
            const response = await fetch(CONFIG.API_ENDPOINT, {
                method: 'POST',
                mode: 'no-cors', // Solves Google CORS redirect parameters cleanly
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            // Clean session on successful dispatch execution context
            sessionStorage.removeItem('tara_quiz_access_granted');
            transitionToSuccessCard();
        } catch (error) {
            console.error(error);
            alert("Network Sync Error. Please check your internet connection.");
            DOM.submitBtn.removeAttribute('disabled');
            DOM.btnSpinner.style.display = 'none';
            DOM.btnText.textContent = "Complete Today's Learning";
        }
    }

    function transitionToSuccessCard() {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        DOM.formContainer.style.display = 'none';
        DOM.successContainer.style.display = 'block';
        DOM.verificationStatus.textContent = "Status: Verified & Processed";
        DOM.verificationStatus.style.borderColor = "var(--accent-success)";
        DOM.verificationStatus.style.color = "var(--accent-success)";
    }

    document.addEventListener('DOMContentLoaded', init);
})();
