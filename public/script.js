const API_BASE = '';

let allScooters = [];
let allViagens = [];
let allManutencoes = [];

document.addEventListener('DOMContentLoaded', () => {
    setupNavigation();
    loadAllData();
});

function setupNavigation() {
    const navBtns = document.querySelectorAll('.nav-btn');
    navBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const page = btn.dataset.page;
            showPage(page);
            navBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });
}

function showPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(`${pageId}-page`).classList.add('active');
}

async function loadAllData() {
    await Promise.all([
        loadScooters(),
        loadViagens(),
        loadManutencoes()
    ]);
    updateMetrics();
}

async function loadScooters() {
    try {
        const response = await fetch(`${API_BASE}/api/scooters`);
        allScooters = await response.json();
        renderScootersTable();
        renderAvailableScooters();
        updateRentScooterOptions();
    } catch (error) {
        console.error('Erro ao carregar scooters:', error);
    }
}

async function loadViagens() {
    try {
        const response = await fetch(`${API_BASE}/api/viagens`);
        allViagens = await response.json();
        renderViagensTable();
    } catch (error) {
        console.error('Erro ao carregar viagens:', error);
    }
}

function updateMetrics() {
    const total = allScooters.length;
    const available = allScooters.filter(s => s.status === 'livre').length;
    const inUse = allScooters.filter(s => s.status === 'ocupado').length;
    const maintenance = allScooters.filter(s => s.status === 'manutencao').length;
    const lowBattery = allScooters.filter(s => s.bateria <= 20).length;
    const activeTrips = allViagens.filter(v => !v.dataFim).length;
    
    document.getElementById('total-scooters').textContent = total;
    document.getElementById('available-scooters').textContent = available;
    document.getElementById('in-use-scooters').textContent = inUse;
    document.getElementById('maintenance-scooters').textContent = maintenance;
    document.getElementById('low-battery-scooters').textContent = lowBattery;
    document.getElementById('active-trips').textContent = activeTrips;
}

function renderAvailableScooters() {
    const container = document.getElementById('available-scooters-list');
    const available = allScooters.filter(s => s.status === 'livre' && s.bateria > 20);
    
    if (available.length === 0) {
        container.innerHTML = '<div class="empty-state">Nenhuma scooter disponivel para aluguel no momento.</div>';
        return;
    }
    
    container.innerHTML = available.map(s => `
        <div class="scooter-card" data-testid="card-scooter-${s.id}">
            <div class="scooter-card-header">
                <div>
                    <div class="scooter-modelo">${escapeHtml(s.modelo)}</div>
                    <div class="scooter-id">${s.id.slice(0, 8)}...</div>
                </div>
                <span class="status-badge ${s.status}">${formatStatus(s.status)}</span>
            </div>
            <div class="scooter-card-body">
                <div class="scooter-info">
                    <span class="scooter-info-label">Localizacao</span>
                    <span>${escapeHtml(s.localizacao)}</span>
                </div>
                <div class="scooter-info">
                    <span class="scooter-info-label">Bateria</span>
                    ${renderBatteryIndicator(s.bateria)}
                </div>
            </div>
        </div>
    `).join('');
}

function renderScootersTable() {
    const tbody = document.getElementById('scooters-table-body');
    const statusFilter = document.getElementById('status-filter').value;
    const searchFilter = document.getElementById('search-filter').value.toLowerCase();
    
    let filtered = allScooters;
    
    if (statusFilter) {
        filtered = filtered.filter(s => s.status === statusFilter);
    }
    
    if (searchFilter) {
        filtered = filtered.filter(s => 
            s.modelo.toLowerCase().includes(searchFilter) ||
            s.localizacao.toLowerCase().includes(searchFilter)
        );
    }
    
    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-state">Nenhuma scooter encontrada.</td></tr>';
        return;
    }
    
    tbody.innerHTML = filtered.map(s => `
        <tr data-testid="row-scooter-${s.id}">
            <td class="id-cell">${s.id.slice(0, 8)}...</td>
            <td>${escapeHtml(s.modelo)}</td>
            <td><span class="status-badge ${s.status}">${formatStatus(s.status)}</span></td>
            <td>${renderBatteryIndicator(s.bateria)}</td>
            <td>${escapeHtml(s.localizacao)}</td>
            <td class="actions-cell">
                <button class="btn btn-secondary btn-sm" onclick="openEditScooterModal('${s.id}')" data-testid="button-edit-${s.id}">Editar</button>
                <button class="btn btn-secondary btn-sm" onclick="openBatteryModal('${s.id}', ${s.bateria})" data-testid="button-battery-${s.id}">Bateria</button>
            </td>
        </tr>
    `).join('');
}

function renderViagensTable() {
    const tbody = document.getElementById('viagens-table-body');
    const statusFilter = document.getElementById('trip-status-filter').value;
    
    let filtered = allViagens;
    
    if (statusFilter === 'ativa') {
        filtered = filtered.filter(v => !v.dataFim);
    } else if (statusFilter === 'finalizada') {
        filtered = filtered.filter(v => v.dataFim);
    }
    
    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-state">Nenhuma viagem encontrada.</td></tr>';
        return;
    }
    
    tbody.innerHTML = filtered.map(v => {
        const scooter = allScooters.find(s => s.id === v.scooterId);
        const isActive = !v.dataFim;
        
        return `
            <tr data-testid="row-viagem-${v.id}">
                <td class="id-cell">${v.id.slice(0, 8)}...</td>
                <td>${escapeHtml(v.usuarioNome)}</td>
                <td>${scooter ? escapeHtml(scooter.modelo) : v.scooterId.slice(0, 8)}</td>
                <td>${formatDate(v.dataInicio)}</td>
                <td>${v.dataFim ? formatDate(v.dataFim) : '<span class="status-badge ocupado">Em andamento</span>'}</td>
                <td>${v.distanciaKm ? `${v.distanciaKm} km` : '-'}</td>
                <td class="actions-cell">
                    ${isActive ? `<button class="btn btn-primary btn-sm" onclick="openFinalizeModal('${v.id}')" data-testid="button-finalize-${v.id}">Finalizar</button>` : ''}
                </td>
            </tr>
        `;
    }).join('');
}

function filterScooters() {
    renderScootersTable();
}

function filterTrips() {
    renderViagensTable();
}

function renderBatteryIndicator(level) {
    let colorClass = 'high';
    if (level <= 20) colorClass = 'low';
    else if (level <= 50) colorClass = 'medium';
    
    return `
        <div class="battery-indicator">
            <div class="battery-bar">
                <div class="battery-fill ${colorClass}" style="width: ${level}%"></div>
            </div>
            <span>${level}%</span>
        </div>
    `;
}

function formatStatus(status) {
    const map = {
        livre: 'Livre',
        ocupado: 'Ocupado',
        manutencao: 'Manutencao'
    };
    return map[status] || status;
}

function formatDate(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function openScooterModal(scooterId = null) {
    const modal = document.getElementById('scooter-modal');
    const title = document.getElementById('scooter-modal-title');
    const form = document.getElementById('scooter-form');
    
    form.reset();
    document.getElementById('scooter-id').value = '';
    
    if (scooterId) {
        const scooter = allScooters.find(s => s.id === scooterId);
        if (scooter) {
            title.textContent = 'Editar Scooter';
            document.getElementById('scooter-id').value = scooter.id;
            document.getElementById('scooter-modelo').value = scooter.modelo;
            document.getElementById('scooter-localizacao').value = scooter.localizacao;
            document.getElementById('scooter-bateria').value = scooter.bateria;
            document.getElementById('scooter-status').value = scooter.status;
        }
    } else {
        title.textContent = 'Nova Scooter';
    }
    
    modal.classList.add('active');
}

function openEditScooterModal(scooterId) {
    openScooterModal(scooterId);
}

function closeScooterModal() {
    document.getElementById('scooter-modal').classList.remove('active');
}

async function saveScooter(event) {
    event.preventDefault();
    
    const id = document.getElementById('scooter-id').value;
    const data = {
        modelo: document.getElementById('scooter-modelo').value,
        localizacao: document.getElementById('scooter-localizacao').value,
        bateria: parseInt(document.getElementById('scooter-bateria').value),
        status: document.getElementById('scooter-status').value
    };
    
    try {
        const url = id ? `${API_BASE}/api/scooters/${id}` : `${API_BASE}/api/scooters`;
        const method = id ? 'PATCH' : 'POST';
        
        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        if (response.ok) {
            closeScooterModal();
            await loadAllData();
        } else {
            const error = await response.json();
            alert(error.message || 'Erro ao salvar scooter');
        }
    } catch (error) {
        console.error('Erro ao salvar scooter:', error);
        alert('Erro ao salvar scooter');
    }
}

function openRentModal() {
    const modal = document.getElementById('rent-modal');
    document.getElementById('rent-form').reset();
    document.getElementById('rent-error').classList.remove('visible');
    updateRentScooterOptions();
    modal.classList.add('active');
}

function closeRentModal() {
    document.getElementById('rent-modal').classList.remove('active');
}

function updateRentScooterOptions() {
    const select = document.getElementById('rent-scooter');
    const available = allScooters.filter(s => s.status === 'livre' && s.bateria > 20);
    
    select.innerHTML = available.length === 0 
        ? '<option value="">Nenhuma scooter disponivel</option>'
        : available.map(s => `<option value="${s.id}">${s.modelo} - ${s.localizacao} (${s.bateria}%)</option>`).join('');
}

async function rentScooter(event) {
    event.preventDefault();
    
    const errorDiv = document.getElementById('rent-error');
    errorDiv.classList.remove('visible');
    
    const data = {
        scooterId: document.getElementById('rent-scooter').value,
        usuarioNome: document.getElementById('rent-usuario').value
    };
    
    if (!data.scooterId) {
        errorDiv.textContent = 'Selecione uma scooter disponivel';
        errorDiv.classList.add('visible');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/api/alugar`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        if (response.ok) {
            closeRentModal();
            await loadAllData();
            showPage('viagens');
            document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
            document.querySelector('[data-page="viagens"]').classList.add('active');
        } else {
            const error = await response.json();
            errorDiv.textContent = error.message || 'Erro ao alugar scooter';
            errorDiv.classList.add('visible');
        }
    } catch (error) {
        console.error('Erro ao alugar scooter:', error);
        errorDiv.textContent = 'Erro ao processar aluguel';
        errorDiv.classList.add('visible');
    }
}

function openFinalizeModal(tripId) {
    const modal = document.getElementById('finalize-modal');
    document.getElementById('finalize-trip-id').value = tripId;
    document.getElementById('finalize-distancia').value = '0';
    modal.classList.add('active');
}

function closeFinalizeModal() {
    document.getElementById('finalize-modal').classList.remove('active');
}

async function finalizeTrip(event) {
    event.preventDefault();
    
    const tripId = document.getElementById('finalize-trip-id').value;
    const distanciaKm = document.getElementById('finalize-distancia').value;
    
    try {
        const response = await fetch(`${API_BASE}/api/viagens/${tripId}/finalizar`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ distanciaKm })
        });
        
        if (response.ok) {
            closeFinalizeModal();
            await loadAllData();
        } else {
            const error = await response.json();
            alert(error.message || 'Erro ao finalizar viagem');
        }
    } catch (error) {
        console.error('Erro ao finalizar viagem:', error);
        alert('Erro ao finalizar viagem');
    }
}

function openBatteryModal(scooterId, currentLevel) {
    const modal = document.getElementById('battery-modal');
    document.getElementById('battery-scooter-id').value = scooterId;
    document.getElementById('battery-level').value = currentLevel;
    modal.classList.add('active');
}

function closeBatteryModal() {
    document.getElementById('battery-modal').classList.remove('active');
}

async function updateBattery(event) {
    event.preventDefault();
    
    const scooterId = document.getElementById('battery-scooter-id').value;
    const bateria = parseInt(document.getElementById('battery-level').value);
    
    try {
        const response = await fetch(`${API_BASE}/api/scooters/${scooterId}/bateria`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ bateria })
        });
        
        if (response.ok) {
            closeBatteryModal();
            await loadAllData();
        } else {
            const error = await response.json();
            alert(error.message || 'Erro ao atualizar bateria');
        }
    } catch (error) {
        console.error('Erro ao atualizar bateria:', error);
        alert('Erro ao atualizar bateria');
    }
}

async function loadManutencoes() {
    try {
        const response = await fetch(`${API_BASE}/api/manutencoes`);
        allManutencoes = await response.json();
        renderManutencaoTable();
        updateMaintenanceScooterOptions();
    } catch (error) {
        console.error('Erro ao carregar manutencoes:', error);
    }
}

function renderManutencaoTable() {
    const tbody = document.getElementById('manutencao-table-body');
    if (!tbody) return;
    
    const statusFilter = document.getElementById('maintenance-status-filter')?.value || '';
    const priorityFilter = document.getElementById('maintenance-priority-filter')?.value || '';
    
    let filtered = allManutencoes;
    
    if (statusFilter) {
        filtered = filtered.filter(m => m.status === statusFilter);
    }
    
    if (priorityFilter) {
        filtered = filtered.filter(m => m.prioridade === priorityFilter);
    }
    
    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="empty-state">Nenhuma manutencao encontrada.</td></tr>';
        return;
    }
    
    tbody.innerHTML = filtered.map(m => {
        const scooter = allScooters.find(s => s.id === m.scooterId);
        const canStart = m.status === 'pendente';
        const canComplete = m.status === 'pendente' || m.status === 'em_andamento';
        const canCancel = m.status !== 'concluida' && m.status !== 'cancelada';
        
        return `
            <tr data-testid="row-manutencao-${m.id}">
                <td class="id-cell">${m.id.slice(0, 8)}...</td>
                <td>${scooter ? escapeHtml(scooter.modelo) : m.scooterId.slice(0, 8)}</td>
                <td>${escapeHtml(m.tecnicoNome)}</td>
                <td>${escapeHtml(m.descricao)}</td>
                <td><span class="priority-badge ${m.prioridade}">${formatPriority(m.prioridade)}</span></td>
                <td><span class="status-badge ${m.status}">${formatMaintenanceStatus(m.status)}</span></td>
                <td>${formatDate(m.dataAgendada)}</td>
                <td class="actions-cell">
                    ${canStart ? `<button class="btn btn-secondary btn-sm" onclick="startMaintenance('${m.id}')" data-testid="button-start-${m.id}">Iniciar</button>` : ''}
                    ${canComplete ? `<button class="btn btn-primary btn-sm" onclick="openCompleteMaintenanceModal('${m.id}')" data-testid="button-complete-${m.id}">Concluir</button>` : ''}
                    ${canCancel ? `<button class="btn btn-secondary btn-sm" onclick="cancelMaintenance('${m.id}')" data-testid="button-cancel-${m.id}">Cancelar</button>` : ''}
                </td>
            </tr>
        `;
    }).join('');
}

function filterMaintenance() {
    renderManutencaoTable();
}

function formatPriority(priority) {
    const map = {
        baixa: 'Baixa',
        media: 'Media',
        alta: 'Alta',
        urgente: 'Urgente'
    };
    return map[priority] || priority;
}

function formatMaintenanceStatus(status) {
    const map = {
        pendente: 'Pendente',
        em_andamento: 'Em Andamento',
        concluida: 'Concluida',
        cancelada: 'Cancelada'
    };
    return map[status] || status;
}

function updateMaintenanceScooterOptions() {
    const select = document.getElementById('maintenance-scooter');
    if (!select) return;
    
    select.innerHTML = allScooters.length === 0 
        ? '<option value="">Nenhuma scooter cadastrada</option>'
        : allScooters.map(s => `<option value="${s.id}">${s.modelo} - ${s.localizacao}</option>`).join('');
}

function openMaintenanceModal() {
    const modal = document.getElementById('maintenance-modal');
    const form = document.getElementById('maintenance-form');
    
    form.reset();
    document.getElementById('maintenance-id').value = '';
    document.getElementById('maintenance-modal-title').textContent = 'Nova Manutencao';
    
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    document.getElementById('maintenance-data').value = now.toISOString().slice(0, 16);
    
    updateMaintenanceScooterOptions();
    modal.classList.add('active');
}

function closeMaintenanceModal() {
    document.getElementById('maintenance-modal').classList.remove('active');
}

async function saveMaintenance(event) {
    event.preventDefault();
    
    const data = {
        scooterId: document.getElementById('maintenance-scooter').value,
        tecnicoNome: document.getElementById('maintenance-tecnico').value,
        descricao: document.getElementById('maintenance-descricao').value,
        prioridade: document.getElementById('maintenance-prioridade').value,
        dataAgendada: new Date(document.getElementById('maintenance-data').value).toISOString()
    };
    
    try {
        const response = await fetch(`${API_BASE}/api/manutencoes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        if (response.ok) {
            closeMaintenanceModal();
            await loadAllData();
        } else {
            const error = await response.json();
            alert(error.message || 'Erro ao agendar manutencao');
        }
    } catch (error) {
        console.error('Erro ao agendar manutencao:', error);
        alert('Erro ao agendar manutencao');
    }
}

async function startMaintenance(maintenanceId) {
    try {
        const response = await fetch(`${API_BASE}/api/manutencoes/${maintenanceId}/iniciar`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' }
        });
        
        if (response.ok) {
            await loadAllData();
        } else {
            const error = await response.json();
            alert(error.message || 'Erro ao iniciar manutencao');
        }
    } catch (error) {
        console.error('Erro ao iniciar manutencao:', error);
        alert('Erro ao iniciar manutencao');
    }
}

function openCompleteMaintenanceModal(maintenanceId) {
    const modal = document.getElementById('complete-maintenance-modal');
    document.getElementById('complete-maintenance-id').value = maintenanceId;
    document.getElementById('maintenance-observacoes').value = '';
    modal.classList.add('active');
}

function closeCompleteMaintenanceModal() {
    document.getElementById('complete-maintenance-modal').classList.remove('active');
}

async function completeMaintenance(event) {
    event.preventDefault();
    
    const maintenanceId = document.getElementById('complete-maintenance-id').value;
    const observacoes = document.getElementById('maintenance-observacoes').value;
    
    try {
        const response = await fetch(`${API_BASE}/api/manutencoes/${maintenanceId}/concluir`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ observacoes })
        });
        
        if (response.ok) {
            closeCompleteMaintenanceModal();
            await loadAllData();
        } else {
            const error = await response.json();
            alert(error.message || 'Erro ao concluir manutencao');
        }
    } catch (error) {
        console.error('Erro ao concluir manutencao:', error);
        alert('Erro ao concluir manutencao');
    }
}

async function cancelMaintenance(maintenanceId) {
    if (!confirm('Tem certeza que deseja cancelar esta manutencao?')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/api/manutencoes/${maintenanceId}/cancelar`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' }
        });
        
        if (response.ok) {
            await loadAllData();
        } else {
            const error = await response.json();
            alert(error.message || 'Erro ao cancelar manutencao');
        }
    } catch (error) {
        console.error('Erro ao cancelar manutencao:', error);
        alert('Erro ao cancelar manutencao');
    }
}

setInterval(loadAllData, 30000);
