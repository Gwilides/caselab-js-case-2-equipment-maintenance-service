document.addEventListener('DOMContentLoaded', () => {
  const alertBox = document.getElementById('alertBox');
  const statusIndicator = document.querySelector('.status-indicator');
  const statusText = document.getElementById('statusText');
  const equipmentSelect = document.getElementById('equipmentSelect');
  const createRequestForm = document.getElementById('createRequestForm');
  const createEquipmentForm = document.getElementById('createEquipmentForm');
  const requestsTableBody = document.getElementById('requestsTableBody');
  const filterStatus = document.getElementById('filterStatus');
  const filterPriority = document.getElementById('filterPriority');
  const refreshBtn = document.getElementById('refreshBtn');

  // Карта оборудования { [id]: name }
  const equipmentMap = new Map();

  function showAlert(message, type = 'success') {
    alertBox.textContent = message;
    alertBox.className = `alert ${type}`;
    alertBox.classList.remove('hidden');
    setTimeout(() => {
      alertBox.classList.add('hidden');
    }, 5000);
  }

  async function checkHealth() {
    try {
      const res = await fetch('/api/health');
      if (res.ok) {
        statusIndicator.className = 'status-indicator online';
        statusText.textContent = 'API доступен онлайн';
      } else {
        throw new Error('API offline');
      }
    } catch {
      statusIndicator.className = 'status-indicator offline';
      statusText.textContent = 'Сервер недоступен';
    }
  }

  async function loadEquipment() {
    try {
      const res = await fetch('/api/equipment?limit=100');
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Ошибка загрузки');

      equipmentSelect.innerHTML = '<option value="">-- Выберите оборудование --</option>';
      equipmentMap.clear();

      json.data.forEach((eq) => {
        equipmentMap.set(eq.id, eq.name);
        const option = document.createElement('option');
        option.value = eq.id;
        option.textContent = `${eq.name} (${eq.serialNumber}) [${eq.type}]`;
        equipmentSelect.appendChild(option);
      });
    } catch (err) {
      equipmentSelect.innerHTML = '<option value="">Ошибка загрузки списка</option>';
      showAlert(err.message, 'error');
    }
  }

  async function loadRequests() {
    try {
      const params = new URLSearchParams();
      params.set('limit', '50');
      if (filterStatus.value) params.set('status', filterStatus.value);
      if (filterPriority.value) params.set('priority', filterPriority.value);

      const res = await fetch(`/api/requests?${params.toString()}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Ошибка загрузки');

      renderRequests(json.data);
    } catch (err) {
      requestsTableBody.innerHTML = `<tr><td colspan="7" class="empty-state">Ошибка: ${err.message}</td></tr>`;
    }
  }

  function renderRequests(requests) {
    if (!requests || requests.length === 0) {
      requestsTableBody.innerHTML =
        '<tr><td colspan="7" class="empty-state">Заявок не найдено</td></tr>';
      return;
    }

    requestsTableBody.innerHTML = '';
    requests.forEach((req) => {
      const tr = document.createElement('tr');

      const eqName = equipmentMap.get(req.equipmentId) || req.equipmentId.slice(0, 8);
      const planned = req.plannedAt ? new Date(req.plannedAt).toLocaleString('ru-RU') : '—';
      const created = new Date(req.createdAt).toLocaleString('ru-RU');

      // Кнопки управления статусом в зависимости от текущего состояния
      let actionButtons = '';
      if (req.status === 'new') {
        actionButtons = `
          <button class="btn-action progress" data-id="${req.id}" data-action="in_progress">В работу</button>
          <button class="btn-action reject" data-id="${req.id}" data-action="rejected">Отклонить</button>
        `;
      } else if (req.status === 'in_progress') {
        actionButtons = `
          <button class="btn-action done" data-id="${req.id}" data-action="done">Завершить</button>
          <button class="btn-action reject" data-id="${req.id}" data-action="rejected">Отклонить</button>
        `;
      } else {
        actionButtons = `<span style="color: var(--text-muted); font-size: 0.75rem;">Завершено</span>`;
      }

      tr.innerHTML = `
        <td><strong>${escapeHtml(req.title)}</strong><br><small style="color: var(--text-muted);">${req.id.slice(0, 8)}...</small></td>
        <td>${escapeHtml(eqName)}</td>
        <td><span class="badge badge-priority-${req.priority}">${req.priority}</span></td>
        <td><span class="badge badge-status-${req.status}">${req.status}</span></td>
        <td>${planned}</td>
        <td>${created}</td>
        <td>${actionButtons}</td>
      `;

      requestsTableBody.appendChild(tr);
    });

    // Навешиваем слушатели на кнопки смены статуса
    document.querySelectorAll('.btn-action').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        const id = e.target.dataset.id;
        const targetStatus = e.target.dataset.action;
        await changeRequestStatus(id, targetStatus);
      });
    });
  }

  async function changeRequestStatus(id, status) {
    try {
      const res = await fetch(`/api/requests/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Ошибка обновления статуса');

      showAlert(`Статус заявки изменён на "${status}"`, 'success');
      await loadRequests();
    } catch (err) {
      showAlert(err.message, 'error');
    }
  }

  createRequestForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(createRequestForm);
    const body = {
      equipmentId: formData.get('equipmentId'),
      title: formData.get('title'),
      description: formData.get('description'),
      priority: formData.get('priority')
    };

    const plannedAt = formData.get('plannedAt');
    if (plannedAt) {
      body.plannedAt = new Date(plannedAt).toISOString();
    }

    try {
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const json = await res.json();
      if (!res.ok) {
        const detailMsg = json.error?.details?.map((d) => `${d.field}: ${d.message}`).join(', ');
        throw new Error(
          detailMsg
            ? `${json.error.message} (${detailMsg})`
            : json.error?.message || 'Ошибка создания'
        );
      }

      showAlert('Заявка успешно зарегистрирована!', 'success');
      createRequestForm.reset();
      await loadRequests();
    } catch (err) {
      showAlert(err.message, 'error');
    }
  });

  createEquipmentForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(createEquipmentForm);
    const body = {
      name: formData.get('name'),
      type: formData.get('type'),
      serialNumber: formData.get('serialNumber'),
      location: {
        lat: parseFloat(formData.get('lat')),
        lon: parseFloat(formData.get('lon'))
      },
      installedAt: new Date().toISOString().split('T')[0]
    };

    try {
      const res = await fetch('/api/equipment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'Ошибка создания оборудования');

      showAlert(`Оборудование "${json.data.name}" успешно добавлено!`, 'success');
      createEquipmentForm.reset();
      await loadEquipment();
    } catch (err) {
      showAlert(err.message, 'error');
    }
  });

  filterStatus.addEventListener('change', loadRequests);
  filterPriority.addEventListener('change', loadRequests);
  refreshBtn.addEventListener('click', loadRequests);

  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(
      /[&<>'"]/g,
      (tag) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[tag] || tag
    );
  }

  // Первоначальная загрузка данных
  checkHealth();
  loadEquipment().then(() => loadRequests());
});
