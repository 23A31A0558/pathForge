// frontend/js/groups.js

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch(`${API_BASE_URL}/users/me`, {
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });

        if (response.ok) {
            const data = await response.json();
            document.getElementById('userDisplay').textContent = data.username;
            loadAvailableGroups();
        } else {
            handle401Error(response);
        }
    } catch (error) {
        console.error('Error fetching user:', error);
    }
});

document.getElementById('createGroupForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('groupName').value.trim();
    const roadmap_type = document.getElementById('groupDomain').value;
    const msgDiv = document.getElementById('createGroupMsg');
    
    try {
        const res = await fetch(`${API_BASE_URL}/groups/create`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getToken()}`
            },
            body: JSON.stringify({ name, roadmap_type })
        });
        
        if (handle401Error(res)) return;
        
        if (res.ok) {
            msgDiv.innerHTML = `<span class="text-success">Group created successfully!</span>`;
            document.getElementById('groupName').value = '';
            loadAvailableGroups();
        } else {
            const data = await res.json();
            msgDiv.innerHTML = `<span class="text-danger">${data.detail}</span>`;
        }
    } catch (error) {
        msgDiv.innerHTML = `<span class="text-danger">Failed to create group.</span>`;
    }
});

async function loadAvailableGroups() {
    const container = document.getElementById('availableGroupsContainer');
    const selectBox = document.getElementById('myGroupsSelect');
    
    try {
        const res = await fetch(`${API_BASE_URL}/groups`, {
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        
        if (handle401Error(res)) return;
        
        if (res.ok) {
            const groups = await res.json();
            if (groups.length === 0) {
                container.innerHTML = '<div class="text-muted small text-center py-3">No groups available.</div>';
                selectBox.innerHTML = '<option value="">No groups</option>';
                return;
            }
            
            let html = '';
            let selectHtml = '<option value="">Select a group...</option>';
            
            groups.forEach(g => {
                html += `
                    <div class="list-group-item d-flex justify-content-between align-items-center px-2 py-3 border-bottom border-0">
                        <div>
                            <span class="fw-semibold text-dark">${g.name}</span>
                            <div class="small text-muted text-capitalize">${g.roadmap_type}</div>
                        </div>
                        <button class="btn btn-sm btn-outline-primary fw-medium rounded-pill px-3" onclick="joinGroup(${g.id})">Join</button>
                    </div>
                `;
                selectHtml += `<option value="${g.id}">${g.name}</option>`;
            });
            container.innerHTML = html;
            selectBox.innerHTML = selectHtml;
            
        }
    } catch (error) {
        container.innerHTML = '<div class="text-danger small">Error loading groups.</div>';
    }
}

window.joinGroup = async function(groupId) {
    try {
        const res = await fetch(`${API_BASE_URL}/groups/join`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getToken()}`
            },
            body: JSON.stringify({ group_id: groupId })
        });
        
        if (handle401Error(res)) return;
        
        if (res.ok) {
            alert('Successfully joined group!');
            document.getElementById('myGroupsSelect').value = groupId;
            document.getElementById('myGroupsSelect').dispatchEvent(new Event('change'));
        } else {
            const data = await res.json();
            if (data.detail === "Already a member") {
                document.getElementById('myGroupsSelect').value = groupId;
                document.getElementById('myGroupsSelect').dispatchEvent(new Event('change'));
            } else {
                alert(data.detail || 'Failed to join group.');
            }
        }
    } catch (error) {
        alert('Error joining group.');
    }
};

document.getElementById('myGroupsSelect').addEventListener('change', (e) => {
    const groupId = e.target.value;
    if (groupId) {
        const groupName = e.target.options[e.target.selectedIndex].text;
        document.getElementById('currentGroupName').textContent = `Progress: ${groupName}`;
        loadGroupProgress(groupId);
    } else {
        document.getElementById('currentGroupName').textContent = 'Select a group to view progress';
        document.getElementById('groupMembersContainer').innerHTML = '<tr><td colspan="4" class="text-muted text-center py-5">No group selected.</td></tr>';
    }
});

async function loadGroupProgress(groupId) {
    const container = document.getElementById('groupMembersContainer');
    
    container.innerHTML = '<tr><td colspan="4" class="text-center py-5"><div class="spinner-border text-primary speed-fast"></div></td></tr>';
    
    try {
        const res = await fetch(`${API_BASE_URL}/groups/${groupId}/progress`, {
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        
        if (handle401Error(res)) return;
        
        if (res.ok) {
            const members = await res.json();
            if (members.length === 0) {
                container.innerHTML = '<tr><td colspan="4" class="text-muted text-center py-5">No members found.</td></tr>';
                return;
            }
            
            let html = '';
            let rank = 1;
            members.forEach(m => {
                html += `
                    <tr>
                        <td class="fw-bold fs-5 text-muted">#${rank++}</td>
                        <td class="fw-semibold text-dark fs-6">${m.username}</td>
                        <td>
                            <span class="fw-bold fs-5" style="color: var(--accent-color);">${m.score}</span> 
                            <span class="text-muted small">pts</span>
                        </td>
                        <td>
                            <div class="d-flex align-items-center">
                                <div class="progress-bar-custom me-3">
                                    <div class="progress-bar-fill" style="width: ${m.progress_percentage}%"></div>
                                </div>
                                <span class="small fw-medium text-muted">${m.progress_percentage}%</span>
                            </div>
                        </td>
                    </tr>
                `;
            });
            container.innerHTML = html;
        }
    } catch (error) {
        container.innerHTML = '<tr><td colspan="4" class="text-danger text-center py-4">Error loading progress.</td></tr>';
    }
}
