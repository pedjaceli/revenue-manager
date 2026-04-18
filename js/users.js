// ─── Users page ───────────────────────────────────────────────
let bsAddUserModal = null;

function initUsersModal() {
  if (!bsAddUserModal) {
    bsAddUserModal = new bootstrap.Modal(document.getElementById('addUserModal'));
  }
}

// Afficher le nom de l'utilisateur connecté + afficher/cacher le menu admin
async function loadCurrentUser() {
  try {
    const data = await apiFetch('/api/me');
    const el = document.getElementById('currentUsername');
    if (el) el.textContent = data.username;

    // Afficher le menu "Utilisateurs" uniquement pour l'admin
    const usersNavBtn = document.querySelector('.nav-item[data-page="users"]');
    if (usersNavBtn) {
      usersNavBtn.style.display = data.is_admin ? '' : 'none';
    }
  } catch (e) {}
}

// Charger et afficher la liste des utilisateurs
async function renderUsers() {
  const tbody = document.getElementById('usersList');
  tbody.innerHTML = `<tr><td colspan="3" class="text-center text-muted py-4">${t('users_loading')}</td></tr>`;
  try {
    const users = await apiFetch('/api/users');
    if (!users.length) {
      tbody.innerHTML = `<tr><td colspan="3" class="text-center text-muted py-4">${t('users_none')}</td></tr>`;
      return;
    }
    tbody.innerHTML = users.map(u => `
      <tr>
        <td>
          <i class="bi bi-person-circle me-2 text-muted"></i>
          <strong>${escHtml(u.username)}</strong>
          ${u.is_admin ? `<span class="badge bg-warning text-dark ms-2"><i class="bi bi-shield-fill me-1"></i>Admin</span>` : ''}
          ${u.is_me ? `<span class="badge bg-primary ms-2">${t('users_me_badge')}</span>` : ''}
        </td>
        <td class="text-muted small">${formatDateShort(u.created_at)}</td>
        <td class="text-end">
          ${!u.is_me ? `
            <button class="btn btn-outline-danger btn-sm" onclick="confirmDeleteUser('${u.id}', '${escHtml(u.username)}')">
              <i class="bi bi-trash3"></i>
            </button>
          ` : '<span class="text-muted small">—</span>'}
        </td>
      </tr>
    `).join('');
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="3" class="text-danger text-center py-3">${t('users_error')}</td></tr>`;
  }
}

// Ouvrir le modal d'ajout
function openAddUserModal() {
  initUsersModal();
  document.getElementById('newUsername').value = '';
  document.getElementById('newUserPassword').value = '';
  document.getElementById('newUserPassword2').value = '';
  document.getElementById('addUserAlert').innerHTML = '';
  bsAddUserModal.show();
}

// Soumettre la création d'un utilisateur
async function submitAddUser() {
  const username  = document.getElementById('newUsername').value.trim();
  const password  = document.getElementById('newUserPassword').value;
  const password2 = document.getElementById('newUserPassword2').value;
  const alertEl   = document.getElementById('addUserAlert');

  if (!username || !password) {
    alertEl.innerHTML = alertHtml('Tous les champs sont obligatoires.');
    return;
  }
  if (password.length < 6) {
    alertEl.innerHTML = alertHtml('Le mot de passe doit contenir au moins 6 caractères.');
    return;
  }
  if (password !== password2) {
    alertEl.innerHTML = alertHtml('Les mots de passe ne correspondent pas.');
    return;
  }

  try {
    await apiFetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    bsAddUserModal.hide();
    showToast(t('toast_user_created'), 'success');
    renderUsers();
  } catch (e) {
    alertEl.innerHTML = alertHtml(e.message || 'Erreur lors de la création.');
  }
}

// Confirmer la suppression d'un utilisateur
function confirmDeleteUser(id, username) {
  document.getElementById('confirmText').textContent =
    t('confirm_delete_user').replace('{name}', username);
  document.getElementById('confirmOkBtn').onclick = async () => {
    bsConfirmModal.hide();
    try {
      await apiFetch(`/api/users/${id}`, { method: 'DELETE' });
      showToast(t('toast_user_deleted'), 'success');
      renderUsers();
    } catch (e) {
      showToast(e.message || t('toast_delete_error'), 'danger');
    }
  };
  bsConfirmModal.show();
}

// Changer son propre mot de passe
async function changeMyPassword() {
  const newPwd  = document.getElementById('newPassword').value;
  const confirm = document.getElementById('confirmPassword').value;
  const alertEl = document.getElementById('pwdAlert');

  if (!newPwd) {
    alertEl.innerHTML = alertHtml('Veuillez saisir un nouveau mot de passe.');
    return;
  }
  if (newPwd.length < 6) {
    alertEl.innerHTML = alertHtml('Le mot de passe doit contenir au moins 6 caractères.');
    return;
  }
  if (newPwd !== confirm) {
    alertEl.innerHTML = alertHtml('Les mots de passe ne correspondent pas.');
    return;
  }

  try {
    await apiFetch('/api/me/password', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: newPwd }),
    });
    alertEl.innerHTML = `<div class="alert alert-success py-2 mb-3">${t('pwd_success')}</div>`;
    document.getElementById('newPassword').value = '';
    document.getElementById('confirmPassword').value = '';
  } catch (e) {
    alertEl.innerHTML = alertHtml(e.message || 'Erreur.');
  }
}

// Helpers
function alertHtml(msg) {
  return `<div class="alert alert-danger py-2 mb-3"><i class="bi bi-exclamation-circle me-2"></i>${escHtml(msg)}</div>`;
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDateShort(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}
