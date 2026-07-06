/**
 * TARA LMS - Learning Verification Module Core System (Enterprise Edition)
 * Feature: Safe-Execution Telemetry, Multi-Upload System & Theme Sync
 * Component: quiz.js (Robust Version)
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
        verifiedFiles: []
    };

    // DOM References Cache with Safe Check helper
    const getEl = (id) => document.getElementById(id);

    const DOM = {
        get html() { return document.documentElement; },
        get themeToggle() { return getEl('theme-toggle'); },
        get themeIcon() { return getEl('theme-icon'); },
        
        // Form Fields
        get biggestLearning() { return getEl('biggest-learning'); },
        get actionImplementation() { return getEl('action-implementation'); },
        get importantPoints() { return getEl('important-points'); },
        get confidenceSlider() { return getEl('confidence-slider'); },
        get confidenceRating() { return getEl('confidence-rating'); },
        get confirmationCheckbox() { return getEl('confirmation-checkbox'); },
        get submitBtn() { return getEl('submit-btn'); },
        get quizForm() { return getEl('quiz-form'); },
        
        // Character Counters
        get blCounter() { return getEl('bl-counter'); },
        get aiCounter() { return getEl('ai-counter'); },
        get ipCounter() { return getEl('ip-counter'); },
        
        // Dropzone & Multi-upload Components
        get dropzone() { return getEl('dropzone'); },
        get fileInput() { return getEl('notes-file'); },
        get uploadMatrix() { return getEl('upload-matrix'); },
        get matrixStatusIcon() { return getEl('matrix-status-icon'); },
        get matrixStatusText() { return getEl('matrix-status-text'); },
        get fileGrid() { return getEl('file-grid'); },
        get removeAllBtn() { return getEl('clear-all-sheets'); }
    };

    /**
     * Subsystem 1: Theme Management (Safe Check Integrated)
     */
    function initThemeEngine() {
        const savedTheme = localStorage.getItem('tara-quiz-theme') || 'dark';
        setSystemTheme(savedTheme);

        if (DOM.themeToggle) {
            DOM.themeToggle.addEventListener('click', (e) => {
                e.preventDefault();
                const targetTheme = appState.theme === 'dark' ? 'light' : 'dark';
                setSystemTheme(targetTheme);
            });
        }
    }

    function setSystemTheme(theme) {
        appState.theme = theme;
        if (DOM.html) {
            DOM.html.setAttribute('data-theme', theme);
        }
        localStorage.setItem('tara-quiz-theme', theme);
        
        if (DOM.themeIcon) {
            DOM.themeIcon.textContent = theme === 'dark' ? '☀️' : '🌙';
        }
    }

    /**
     * Subsystem 2: Character Counters & Form State Telemetry
     */
    function initFormTelemetry() {
        if (DOM.confidenceSlider && DOM.confidenceRating) {
            DOM.confidenceSlider.addEventListener('input', (e) => {
                DOM.confidenceRating.textContent = e.target.value;
            });
        }

        setupCharCounter(DOM.biggestLearning, DOM.blCounter);
        setupCharCounter(DOM.actionImplementation, DOM.aiCounter);
        setupCharCounter(DOM.importantPoints, DOM.ipCounter);

        if (DOM.quizForm) {
            ['input', 'change'].forEach(eventType => {
                DOM.quizForm.addEventListener(eventType, validateFormState);
            });
        }
        
        // Dynamic state refresh
        validateFormState();
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
        updateCounter();
    }

    function validateFormState() {
        if (!DOM.submitBtn) return;

        const isBlValid = (DOM.biggestLearning?.value.trim().length || 0) >= CONFIG.MIN_CHAR_COUNT;
        const isAiValid = (DOM.actionImplementation?.value.trim().length || 0) >= CONFIG.MIN_CHAR_COUNT;
        const isIpValid = (DOM.importantPoints?.value.trim().length || 0) >= CONFIG.MIN_CHAR_COUNT;
        const isConfirmed = DOM.confirmationCheckbox ? DOM.confirmationCheckbox.checked : false;
        const hasFiles = appState.verifiedFiles.length > 0;

        const isFormValid = isBlValid && isAiValid && isIpValid && isConfirmed && hasFiles;
        DOM.submitBtn.disabled = !isFormValid;
    }

    /**
     * Subsystem 3: Dropzone & Upload Matrix Controller
     */
    function initDropzoneEngine() {
        if (!DOM.dropzone || !DOM.fileInput) return;

        DOM.dropzone.addEventListener('click', () => DOM.fileInput.click());

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
                DOM.fileInput.value = '';
            }
        });

        // FIXED: Clear All Working Trigger Handler
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
                alert(`Maximum upload limit reached (${CONFIG.MAX_FILES} files allowed).`);
                return;
            }

            if (!file.type.startsWith('image/') && !file.name.endsWith('.pdf')) {
                alert('Invalid format. Please upload images/screenshots or PDFs.');
                return;
            }

            const reader = new FileReader();
            reader.onload = function (event) {
                const base64Content = event.target.result.split(',')[1];
                
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
        if (!DOM.uploadMatrix || !DOM.fileGrid) return;

        if (appState.verifiedFiles.length === 0) {
            DOM.uploadMatrix.style.display = 'none';
            DOM.fileGrid.innerHTML = '';
            return;
        }

        DOM.uploadMatrix.style.display = 'block';
        
        if (DOM.matrixStatusIcon) DOM.matrixStatusIcon.textContent = '✅';
        if (DOM.matrixStatusText) {
            DOM.matrixStatusText.textContent = `${appState.verifiedFiles.length} Sheets verified. Ready to submit.`;
        }

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

    function clearUploadMatrixPipeline() {
        appState.verifiedFiles = [];
        if (DOM.fileInput) DOM.fileInput.value = '';
        renderUploadMatrixUI();
        validateFormState();
    }

    /**
     * Subsystem 4: API Form Transmission Engine
     */
    function initSubmissionPipeline() {
        if (!DOM.quizForm) return;

        DOM.quizForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (DOM.submitBtn && DOM.submitBtn.disabled) return;

            setFormProcessingState(true);

            try {
                const sheetCount = appState.verifiedFiles.length;
                
                for (let i = 0; i < sheetCount; i++) {
                    const activeFile = appState.verifiedFiles[i];
                    
                    if (DOM.submitBtn) {
                        DOM.submitBtn.innerHTML = `<div class="spinner-icon"></div> Uploading Notes Sheet ${i + 1}/${sheetCount}...`;
                    }

                    const payload = {
                        biggestLearning: DOM.biggestLearning?.value.trim() || '',
                        actionImplementation: DOM.actionImplementation?.value.trim() || '',
                        importantPoints: DOM.importantPoints?.value.trim() || '',
                        confidenceRating: parseInt(DOM.confidenceSlider?.value || '5', 10),
                        fileName: activeFile.name,
                        fileData: activeFile.base64,
                        currentContextIndex: i + 1,
                        totalContextLength: sheetCount
                    };

                    await fetch(CONFIG.API_ENDPOINT, {
                        method: 'POST',
                        mode: 'no-cors',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });
                }

                window.location.href = 'quiz.html?status=success_telemetry_confirmed';

            } catch (error) {
                console.error('Submission error:', error);
                alert('Connection error while uploading. Please check your network.');
                setFormProcessingState(false);
            }
        });
    }

    function setFormProcessingState(isProcessing) {
        if (!DOM.submitBtn) return;

        if (isProcessing) {
            DOM.submitBtn.disabled = true;
            DOM.submitBtn.innerHTML = '<div class="spinner-icon"></div> Connecting to Cloud Uplink...';
            
            [DOM.biggestLearning, DOM.actionImplementation, DOM.importantPoints, DOM.confidenceSlider, DOM.confirmationCheckbox, DOM.removeAllBtn].forEach(el => {
                if (el) el.disabled = true;
            });
            if (DOM.dropzone) DOM.dropzone.style.pointerEvents = 'none';
        } else {
            validateFormState();
            DOM.submitBtn.innerHTML = 'Submit Learning Verification Matrix';
            
            [DOM.biggestLearning, DOM.actionImplementation, DOM.importantPoints, DOM.confidenceSlider, DOM.confirmationCheckbox, DOM.removeAllBtn].forEach(el => {
                if (el) el.disabled = false;
            });
            if (DOM.dropzone) DOM.dropzone.style.pointerEvents = 'auto';
        }
    }

    // Safe DOM Bootloader
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            initThemeEngine();
            initFormTelemetry();
            initDropzoneEngine();
            initSubmissionPipeline();
        });
    } else {
        initThemeEngine();
        initFormTelemetry();
        initDropzoneEngine();
        initSubmissionPipeline();
    }

})();
