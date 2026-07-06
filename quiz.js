/**
 * TARA LMS - Learning Verification Module Core System (Enterprise Edition)
 * Feature: Advanced File Processing, Light/Dark Theme Sync, UI Telemetry & State Matrix
 * Component: quiz.js
 */

(function () {
    'use strict';

    // Global Configuration Matrix
    const CONFIG = {
        API_ENDPOINT: 'https://script.google.com/macros/s/AKfycbzXfKLksw0NHxRZEHBi2xydvkkI1Gl5gxeTlwpYSfBsqjl0ZbMyCgnRjktLLTSqyO__/exec',
        MIN_CHAR_COUNT: 10,
        MAX_FILES: 5
    };

    // System Application State
    let appState = {
        theme: 'dark',
        verifiedFiles: [] // Stores uploaded file metadata object matrix
    };

    // DOM References Cache
    const DOM = {
        html: document.documentElement,
        themeToggle: document.getElementById('theme-toggle'),
        themeIcon: document.getElementById('theme-icon'),
        
        // Form Fields
        biggestLearning: document.getElementById('biggest-learning'),
        actionImplementation: document.getElementById('action-implementation'),
        importantPoints: document.getElementById('important-points'),
        confidenceSlider: document.getElementById('confidence-slider'),
        confidenceRating: document.getElementById('confidence-rating'),
        confirmationCheckbox: document.getElementById('confirmation-checkbox'),
        submitBtn: document.getElementById('submit-btn'),
        quizForm: document.getElementById('quiz-form'),
        
        // Character Counters
        blCounter: document.getElementById('bl-counter'),
        aiCounter: document.getElementById('ai-counter'),
        ipCounter: document.getElementById('ip-counter'),
        
        // Dropzone & Multi-upload Matrix Components
        dropzone: document.getElementById('dropzone'),
        fileInput: document.getElementById('notes-file'),
        uploadMatrix: document.getElementById('upload-matrix'),
        matrixStatusIcon: document.getElementById('matrix-status-icon'),
        matrixStatusText: document.getElementById('matrix-status-text'),
        fileGrid: document.getElementById('file-grid'),
        removeAllBtn: document.getElementById('clear-all-sheets') // Maps to "Clear All Sheets" Action trigger
    };

    /**
     * Core Subsystem 1: Theme Management (Dark/Light Engine Integration)
     */
    function initThemeEngine() {
        const savedTheme = localStorage.getItem('tara-quiz-theme') || 'dark';
        setSystemTheme(savedTheme);

        if (DOM.themeToggle) {
            DOM.themeToggle.addEventListener('click', () => {
                const targetTheme = appState.theme === 'dark' ? 'light' : 'dark';
                setSystemTheme(targetTheme);
            });
        }
    }

    function setSystemTheme(theme) {
        appState.theme = theme;
        DOM.html.setAttribute('data-theme', theme);
        localStorage.setItem('tara-quiz-theme', theme);
        
        if (DOM.themeIcon) {
            DOM.themeIcon.textContent = theme === 'dark' ? '☀️' : '🌙';
        }
    }

    /**
     * Core Subsystem 2: Dynamic Input & Form Validation Telemetry
     */
    function initFormTelemetry() {
        // Dynamic Slider Real-time Update
        if (DOM.confidenceSlider && DOM.confidenceRating) {
            DOM.confidenceSlider.addEventListener('input', (e) => {
                DOM.confidenceRating.textContent = e.target.value;
            });
        }

        // Live Character Counters Setup
        setupCharCounter(DOM.biggestLearning, DOM.blCounter);
        setupCharCounter(DOM.actionImplementation, DOM.aiCounter);
        setupCharCounter(DOM.importantPoints, DOM.ipCounter);

        // Global Event Delegation for Dynamic Form Interactivity Validation
        if (DOM.quizForm) {
            ['input', 'change'].forEach(eventType => {
                DOM.quizForm.addEventListener(eventType, validateFormState);
            });
        }
    }

    function setupCharCounter(inputEl, counterEl) {
        if (!inputEl || !counterEl) return;
        
        const updateCounter = () => {
            const length = inputEl.value.trim().length;
            counterEl.textContent = `${length}/${CONFIG.MIN_CHAR_COUNT} min chars`;
            
            if (length >= CONFIG.MIN_CHAR_COUNT) {
                counterEl.classList.add('valid');
            } else {
                counterEl.classList.remove('valid');
            }
        };

        inputEl.addEventListener('input', updateCounter);
        updateCounter(); // Initial invocation context lifecycle run
    }

    function validateFormState() {
        if (!DOM.submitBtn) return;

        const isBlValid = (DOM.biggestLearning?.value.trim().length || 0) >= CONFIG.MIN_CHAR_COUNT;
        const isAiValid = (DOM.actionImplementation?.value.trim().length || 0) >= CONFIG.MIN_CHAR_COUNT;
        const isIpValid = (DOM.importantPoints?.value.trim().length || 0) >= CONFIG.MIN_CHAR_COUNT;
        const isConfirmed = DOM.confirmationCheckbox ? DOM.confirmationCheckbox.checked : false;
        const hasFiles = appState.verifiedFiles.length > 0;

        const isFormStructurallyValid = isBlValid && isAiValid && isIpValid && isConfirmed && hasFiles;
        DOM.submitBtn.disabled = !isFormStructurallyValid;
    }

    /**
     * Core Subsystem 3: Industrial Dropzone & Upload Matrix Engine
     */
    function initDropzoneEngine() {
        if (!DOM.dropzone || !DOM.fileInput) return;

        // Click trigger mapping
        DOM.dropzone.addEventListener('click', () => DOM.fileInput.click());

        // Drag & Drop animations context
        DOM.dropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            DOM.dropzone.classList.add('drag-over');
        });

        ['dragleave', 'drop'].forEach(eventType => {
            DOM.dropzone.addEventListener(eventType, () => {
                DOM.dropzone.classList.remove('drag-over');
            });
        });

        DOM.dropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            if (e.dataTransfer.files.length > 0) {
                processIncomingFiles(e.dataTransfer.files);
            }
        });

        DOM.fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                processIncomingFiles(e.target.files);
                DOM.fileInput.value = ''; // Reset input target channel parameters
            }
        });

        // FIXED: Clear All Sheets button implementation logic matrix mapping
        if (DOM.removeAllBtn) {
            DOM.removeAllBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                clearUploadMatrixPipeline();
            });
        }
    }

    function processIncomingFiles(fileList) {
        Array.from(fileList).forEach(file => {
            if (appState.verifiedFiles.length >= CONFIG.MAX_FILES) {
                alert(`Maximum upload boundary reached (${CONFIG.MAX_FILES} files allowed).`);
                return;
            }

            // Accept images/screenshots or documents safely
            if (!file.type.startsWith('image/') && !file.name.endsWith('.pdf')) {
                alert('Invalid file format signature detected. Please upload screenshots/images or PDF parameters.');
                return;
            }

            const reader = new FileReader();
            reader.onload = function (event) {
                const base64Content = event.target.result.split(',')[1];
                
                // Construct clean immutable component record parameters
                const fileMetadata = {
                    id: 'file-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
                    name: file.name,
                    size: (file.size / 1024).toFixed(1) + ' KB',
                    base64: base64Content
                };

                appState.verifiedFiles.push(fileMetadata);
                renderUploadMatrixUI();
                validateFormState();
            };
            reader.readAsDataURL(file);
        });
    }

    function renderUploadMatrixUI() {
        if (!DOM.uploadMatrix || !DOM.fileGrid || !DOM.matrixStatusText || !DOM.matrixStatusIcon) return;

        if (appState.verifiedFiles.length === 0) {
            DOM.uploadMatrix.style.display = 'none';
            DOM.fileGrid.innerHTML = '';
            return;
        }

        // Display current upload validation statistics structural layout mapping
        DOM.uploadMatrix.style.display = 'block';
        DOM.matrixStatusIcon.textContent = '✅';
        DOM.matrixStatusText.textContent = `${appState.verifiedFiles.length} Sheets verified. Ready to submit.`;

        // Render cards loop logic execution
        DOM.fileGrid.innerHTML = appState.verifiedFiles.map(file => `
            <div class="matrix-card" data-id="${file.id}">
                <div class="file-icon">📄</div>
                <div class="file-info">
                    <div class="name" title="${file.name}">${file.name}</div>
                    <div class="meta">${file.size} | <span style="color: var(--accent-success); font-weight: 700;">Verified</span></div>
                </div>
            </div>
        `).join('');
    }

    // FIXED: Complete reset logic execution channel implementation pipeline
    function clearUploadMatrixPipeline() {
        appState.verifiedFiles = [];
        if (DOM.fileInput) DOM.fileInput.value = '';
        renderUploadMatrixUI();
        validateFormState();
    }

    /**
     * Core Subsystem 4: API Form Transmission Engine Pipeline
     */
    function initSubmissionPipeline() {
        if (!DOM.quizForm) return;

        DOM.quizForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // Double layer protection verification sequence
            if (DOM.submitBtn.disabled) return;

            // UI Transition to processing lockdown phase state parameters
            setFormProcessingState(true);

            try {
                // Multi-sheet payload compilation sequence
                const sheetCount = appState.verifiedFiles.length;
                
                // Submit each verified file in sequence array stack parameters mapping
                for (let i = 0; i < sheetCount; i++) {
                    const activeFile = appState.verifiedFiles[i];
                    
                    // Update submission telemetry interface indicators safely
                    if (DOM.submitBtn) {
                        DOM.submitBtn.innerHTML = `<div class="spinner-icon"></div> Uploading Notes Sheet ${i + 1}/${sheetCount}...`;
                    }

                    const payload = {
                        biggestLearning: DOM.biggestLearning.value.trim(),
                        actionImplementation: DOM.actionImplementation.value.trim(),
                        importantPoints: DOM.importantPoints.value.trim(),
                        confidenceRating: parseInt(DOM.confidenceSlider.value, 10),
                        fileName: activeFile.name,
                        fileData: activeFile.base64,
                        currentContextIndex: i + 1,
                        totalContextLength: sheetCount
                    };

                    const response = await fetch(CONFIG.API_ENDPOINT, {
                        method: 'POST',
                        mode: 'no-cors', // Integration context boundary execution compatibility architecture
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });
                }

                // Redirect to production target success routing window page framework layout location parameters
                window.location.href = 'quiz.html?status=success_telemetry_confirmed';

            } catch (error) {
                console.error('LMS Telemetry Critical Transmission Error Failure:', error);
                alert('Critical connectivity error while uploading system parameters array matrix. Please verify internet stack configurations.');
                setFormProcessingState(false);
            }
        });
    }

    function setFormProcessingState(isProcessing) {
        if (!DOM.submitBtn) return;

        if (isProcessing) {
            DOM.submitBtn.disabled = true;
            DOM.submitBtn.innerHTML = '<div class="spinner-icon"></div> Initiating Cloud Pipeline Secure Uplink...';
            
            // Lock form components input nodes pipeline safely
            [DOM.biggestLearning, DOM.actionImplementation, DOM.importantPoints, DOM.confidenceSlider, DOM.confirmationCheckbox, DOM.removeAllBtn].forEach(el => {
                if (el) el.disabled = true;
            });
            if (DOM.dropzone) DOM.dropzone.style.pointerEvents = 'none';
        } else {
            validateFormState();
            DOM.submitBtn.innerHTML = 'Submit Learning Verification Matrix';
            
            // Unlock elements nodes structure elements array parameters channel
            [DOM.biggestLearning, DOM.actionImplementation, DOM.importantPoints, DOM.confidenceSlider, DOM.confirmationCheckbox, DOM.removeAllBtn].forEach(el => {
                if (el) el.disabled = false;
            });
            if (DOM.dropzone) DOM.dropzone.style.pointerEvents = 'auto';
        }
    }

    /**
     * Application Module Lifecycle Boot Initialization Sequence Integration Core Matrix
     */
    document.addEventListener('DOMContentLoaded', () => {
        initThemeEngine();
        initFormTelemetry();
        initDropzoneEngine();
        initSubmissionPipeline();
    });

})();
