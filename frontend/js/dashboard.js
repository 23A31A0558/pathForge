// frontend/js/dashboard.js

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch(`${API_BASE_URL}/users/me`, {
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });

        if (response.ok) {
            const data = await response.json();
            document.getElementById('userDisplay').textContent = data.username;
            document.getElementById('welcomeName').textContent = data.username;
            fetchDashboardScore();
        } else {
            handle401Error(response);
        }
    } catch (error) {
        console.error('Error fetching user:', error);
    }
});

async function fetchDashboardScore() {
    try {
        const response = await fetch(`${API_BASE_URL}/progress/score`, {
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        
        if (handle401Error(response)) return;
        
        if (response.ok) {
            const data = await response.json();
            document.getElementById('dashboardScore').textContent = data.score;
            
            // If score is 0, user might not have a roadmap, redirect to questionnaire if roadmap is empty
            if (data.score === 0) {
                const rmRes = await fetch(`${API_BASE_URL}/roadmap`, {
                    headers: { 'Authorization': `Bearer ${getToken()}` }
                });
                
                if (handle401Error(rmRes)) return;
                
                if (rmRes.ok) {
                    const roadmaps = await rmRes.json();
                    if (roadmaps.length === 0) {
                        window.location.href = 'questionnaire.html';
                    }
                }
            }
        }
    } catch (error) {
        console.error('Error fetching score:', error);
    }
}
