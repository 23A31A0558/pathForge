// frontend/js/roadmap.js

document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('roadmapContainer');
    const loading = document.getElementById('loadingIndicator');
    const progressBar = document.getElementById('progressBar');
    const userScore = document.getElementById('userScore');

    let roadmapData = [];
    let progressData = [];
    let totalScore = 0;

    async function init() {
        await loadRoadmap();
        await loadProgress();
        await loadScore();
        updateUI();
    }

    async function loadRoadmap() {
        try {
            let response = await fetch(`${API_BASE_URL}/roadmap`, {
                method: 'GET',
                headers: { 
                    "Content-Type": "application/json",
                    "Authorization": "Bearer " + getToken() 
                }
            });

            if (handle401Error(response)) return;

            if (!response.ok) throw new Error('Failed to fetch roadmap.');

            roadmapData = await response.json();
            
            if (roadmapData.length === 0) {
                const genRes = await fetch(`${API_BASE_URL}/generate-roadmap`, {
                    method: 'POST',
                    headers: { "Authorization": "Bearer " + getToken() }
                });
                if (handle401Error(genRes)) return;
                
                if (genRes.ok) {
                    const retryRes = await fetch(`${API_BASE_URL}/roadmap`, {
                        headers: { "Authorization": "Bearer " + getToken() }
                    });
                    roadmapData = await retryRes.json();
                }
            }
        } catch (error) {
            if (loading) loading.innerHTML = `<div class="alert alert-danger">${error.message}</div>`;
        }
    }

    async function loadProgress() {
        try {
            let response = await fetch(`${API_BASE_URL}/progress`, {
                headers: { "Authorization": "Bearer " + getToken() }
            });
            if (handle401Error(response)) return;
            if (response.ok) {
                progressData = await response.json();
            }
        } catch (error) {
            console.error(error);
        }
    }
    
    async function loadScore() {
        try {
            let response = await fetch(`${API_BASE_URL}/progress/score`, {
                headers: { "Authorization": "Bearer " + getToken() }
            });
            if (handle401Error(response)) return;
            if (response.ok) {
                const data = await response.json();
                totalScore = data.score;
            }
        } catch (error) {
            console.error(error);
        }
    }

    window.markStepComplete = async function(stepId, btnElement) {
        if (btnElement.disabled) return;
        btnElement.disabled = true;
        
        try {
            let response = await fetch(`${API_BASE_URL}/progress/complete`, {
                method: 'POST',
                headers: {
                    "Authorization": "Bearer " + getToken(),
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ micro_step_id: stepId })
            });
            
            if (handle401Error(response)) return;
            
            if (response.ok) {
                progressData.push({ micro_step_id: stepId, is_completed: true });
                await loadScore(); // update score
                updateUI();
            } else {
                alert("Failed to mark complete.");
                btnElement.disabled = false;
            }
        } catch (error) {
            alert("Error: " + error.message);
            btnElement.disabled = false;
        }
    };

    function updateUI() {
        if (loading) loading.classList.add('d-none');
        if (!container) return;
        container.innerHTML = '';
        
        if (!roadmapData || roadmapData.length === 0) {
            container.innerHTML = '<div class="alert alert-info">No roadmap found. Please complete the questionnaire first.</div>';
            return;
        }

        const completedIds = new Set(progressData.filter(p => p.is_completed).map(p => p.micro_step_id));
        
        let totalSteps = 0;
        let completedSteps = 0;

        roadmapData.forEach((rmap) => {
            const col = document.createElement('div');
            col.className = 'col-lg-8 mx-auto mb-5';

            let macrosHtml = '';
            rmap.macro_steps.forEach((macro) => {
                let microsHtml = '';
                
                macro.micro_steps.forEach(micro => {
                    totalSteps++;
                    const isCompleted = completedIds.has(micro.id);
                    if (isCompleted) completedSteps++;
                    
                    const btnHtml = isCompleted 
                        ? `<button class="btn btn-sm btn-success" disabled>✓ Completed</button>`
                        : `<button class="btn btn-sm btn-outline-primary" onclick="markStepComplete(${micro.id}, this)">Mark Complete</button>`;

                    const bgClass = isCompleted ? 'bg-success bg-opacity-10' : 'bg-white';

                    microsHtml += `
                        <li class="list-group-item d-flex justify-content-between align-items-start p-3 ${bgClass}" id="micro-step-${micro.id}">
                            <div class="ms-2 me-auto">
                                <div class="fw-bold text-dark fs-5">${micro.title}</div>
                                <small class="text-muted d-block mt-1">${micro.description}</small>
                            </div>
                            <div class="d-flex flex-column align-items-end gap-2">
                                <span class="badge ${getDifficultyBadgeClass(micro.difficulty)} rounded-pill px-3 py-2 shadow-sm">${micro.difficulty}</span>
                                ${btnHtml}
                            </div>
                        </li>
                    `;
                });

                macrosHtml += `
                    <div class="card mb-4 shadow border-0" style="border-radius: 12px; overflow: hidden;">
                        <div class="card-header bg-primary py-3 border-0">
                            <h5 class="mb-0 text-white fw-bold">
                                Step ${macro.order_index}: ${macro.title}
                            </h5>
                        </div>
                        <ul class="list-group list-group-flush">
                            ${microsHtml}
                        </ul>
                    </div>
                `;
            });

            col.innerHTML = `
                <div class="roadmap-content">
                    <div class="text-center mb-4">
                        <span class="badge bg-warning text-dark px-3 py-2 rounded-pill fw-bold text-uppercase mb-2 shadow-sm">
                            ${rmap.type.replace('_', ' ')}
                        </span>
                        <h2 class="fw-bold" style="color: var(--primary-color)">${rmap.title}</h2>
                    </div>
                    ${macrosHtml}
                </div>
            `;
            container.appendChild(col);
        });

        // Update score
        if (userScore) userScore.innerText = totalScore;
        
        // Update progress bar
        if (progressBar && totalSteps > 0) {
            const pct = Math.round((completedSteps / totalSteps) * 100);
            progressBar.style.width = pct + '%';
            progressBar.innerText = pct + '%';
            progressBar.setAttribute('aria-valuenow', pct);
        }
    }

    function getDifficultyBadgeClass(difficulty) {
        if (!difficulty) return 'bg-secondary';
        const d = difficulty.toLowerCase();
        if (d === 'easy') return 'bg-success';
        if (d === 'medium') return 'bg-warning text-dark';
        if (d === 'hard') return 'bg-danger';
        return 'bg-secondary';
    }

    init();
});
