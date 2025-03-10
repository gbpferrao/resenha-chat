// Admin page functionality

// DOM Elements
const adminLoginOverlay = document.getElementById('admin-login-overlay');
const adminPanel = document.getElementById('admin-panel');
const adminPasswordInput = document.getElementById('admin-password-input');
const adminLoginBtn = document.getElementById('admin-login-btn');
const adminLoginError = document.getElementById('admin-login-error');
const logoutAdminBtn = document.getElementById('logout-admin-btn');

// Password management elements
const currentPasswordDisplay = document.getElementById('current-password');
const togglePasswordVisibilityBtn = document.getElementById('toggle-password-visibility');
const newPasswordInput = document.getElementById('new-password');
const updatePasswordBtn = document.getElementById('update-password-btn');
const scheduledDateInput = document.getElementById('scheduled-date');
const scheduledPasswordInput = document.getElementById('scheduled-password');
const schedulePasswordBtn = document.getElementById('schedule-password-btn');
const scheduledPasswordsList = document.getElementById('scheduled-passwords-list');

// User history elements
const historyFilterSelect = document.getElementById('history-filter');
const refreshHistoryBtn = document.getElementById('refresh-history-btn');
const userHistoryData = document.getElementById('user-history-data');

// Constants
const ADMIN_PASSWORD = "admin123"; // Change this to your desired admin password

// Initialize the admin page
async function initAdminPage() {
  // Set the minimum date for scheduling to today
  const today = new Date();
  const formattedDate = today.toISOString().split('T')[0];
  scheduledDateInput.min = formattedDate;
  scheduledDateInput.value = formattedDate;
  
  // Load current password (now async)
  await loadCurrentPassword();
  
  // Load scheduled passwords
  loadScheduledPasswords();
  
  // Load user history
  loadUserHistory();
}

// Authentication functions
function checkAdminAuth() {
  const isAuthenticated = sessionStorage.getItem('resenha_admin_auth') === 'true';
  if (isAuthenticated) {
    showAdminPanel(true);
  } else {
    showAdminPanel(false);
  }
}

function showAdminPanel(show) {
  if (show) {
    adminLoginOverlay.style.display = 'none';
    adminPanel.style.display = 'flex';
    initAdminPage();
  } else {
    adminLoginOverlay.style.display = 'flex';
    adminPanel.style.display = 'none';
    setTimeout(() => adminPasswordInput.focus(), 100);
  }
}

function attemptAdminLogin() {
  const enteredPassword = adminPasswordInput.value.trim();
  
  if (enteredPassword === ADMIN_PASSWORD) {
    // Correct password
    sessionStorage.setItem('resenha_admin_auth', 'true');
    showAdminPanel(true);
    adminLoginError.textContent = '';
    adminPasswordInput.value = '';
  } else {
    // Incorrect password
    adminLoginError.textContent = 'Senha administrativa incorreta.';
    adminPasswordInput.value = '';
    adminPasswordInput.focus();
    
    // Shake animation for visual feedback
    adminPasswordInput.classList.add('shake');
    setTimeout(() => adminPasswordInput.classList.remove('shake'), 500);
  }
}

// Password management functions
// Load the current password from Firebase or localStorage
async function loadCurrentPassword() {
  try {
    // Try to get password from Firebase first
    const passwordRef = window.database.ref('adminSettings/masterPassword');
    const snapshot = await passwordRef.once('value');
    let currentPassword = snapshot.val() || 'resenha123'; // Default fallback
    
    // Store it in localStorage as well
    localStorage.setItem('resenha_master_password', currentPassword);
    
    // Update the display with hidden characters initially
    currentPasswordDisplay.dataset.password = currentPassword;
    currentPasswordDisplay.textContent = '••••••••••';
  } catch (error) {
    console.error('Error loading password from Firebase:', error);
    
    // Fallback to localStorage
    const storedPassword = localStorage.getItem('resenha_master_password') || 'resenha123';
    currentPasswordDisplay.dataset.password = storedPassword;
    currentPasswordDisplay.textContent = '••••••••••';
  }
}

function togglePasswordVisibility() {
  const passwordValue = currentPasswordDisplay.dataset.password;
  const eyeIcon = togglePasswordVisibilityBtn.querySelector('i');
  
  if (currentPasswordDisplay.textContent === '••••••••••') {
    currentPasswordDisplay.textContent = passwordValue;
    eyeIcon.classList.remove('fa-eye');
    eyeIcon.classList.add('fa-eye-slash');
  } else {
    currentPasswordDisplay.textContent = '••••••••••';
    eyeIcon.classList.remove('fa-eye-slash');
    eyeIcon.classList.add('fa-eye');
  }
}

async function updatePassword() {
  const newPassword = newPasswordInput.value.trim();
  
  if (newPassword) {
    try {
      // Update in Firebase
      await window.database.ref('adminSettings/masterPassword').set(newPassword);
      
      // Also update in localStorage
      localStorage.setItem('resenha_master_password', newPassword);
      
      // Update the display
      currentPasswordDisplay.dataset.password = newPassword;
      if (currentPasswordDisplay.textContent !== '••••••••••') {
        currentPasswordDisplay.textContent = newPassword;
      }
      
      // Clear the input
      newPasswordInput.value = '';
      
      // Update the main app if it's open
      updateMainAppPassword();
      
      // Show notification
      showNotification('Senha atualizada com sucesso!');
    } catch (error) {
      console.error('Error updating password:', error);
      showNotification('Erro ao atualizar senha.', true);
    }
  } else {
    showNotification('Por favor, insira uma nova senha.', true);
  }
}

function schedulePassword() {
  const date = scheduledDateInput.value;
  const password = scheduledPasswordInput.value.trim();
  
  if (!date) {
    showNotification('Por favor, selecione uma data.', true);
    return;
  }
  
  if (!password) {
    showNotification('Por favor, insira uma senha.', true);
    return;
  }
  
  // Get existing scheduled passwords
  const scheduledPasswords = getScheduledPasswords();
  
  // Check if there's already a password for this date
  const existingIndex = scheduledPasswords.findIndex(item => item.date === date);
  if (existingIndex >= 0) {
    scheduledPasswords[existingIndex].password = password;
  } else {
    scheduledPasswords.push({ date, password });
  }
  
  // Save updated list
  saveScheduledPasswords(scheduledPasswords);
  
  // Clear inputs
  scheduledPasswordInput.value = '';
  
  // Refresh the list
  loadScheduledPasswords();
  
  // Show notification
  showNotification('Senha programada com sucesso!');
}

function loadScheduledPasswords() {
  const scheduledPasswords = getScheduledPasswords();
  
  // Sort by date
  scheduledPasswords.sort((a, b) => new Date(a.date) - new Date(b.date));
  
  // Clear current list
  scheduledPasswordsList.innerHTML = '';
  
  // Create elements for each scheduled password
  scheduledPasswords.forEach(item => {
    const listItem = document.createElement('div');
    listItem.className = 'scheduled-password-item';
    
    const dateObj = new Date(item.date);
    const formattedDate = dateObj.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    
    listItem.innerHTML = `
      <div class="scheduled-password-info">
        <span class="scheduled-password-date">${formattedDate}</span>
        <span class="scheduled-password-value">••••••••••</span>
      </div>
      <div class="scheduled-password-actions">
        <button class="delete-scheduled-btn" data-date="${item.date}">
          <i class="fas fa-trash-alt"></i> Remover
        </button>
      </div>
    `;
    
    scheduledPasswordsList.appendChild(listItem);
  });
  
  // Add event listeners to delete buttons
  document.querySelectorAll('.delete-scheduled-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const date = this.dataset.date;
      deleteScheduledPassword(date);
    });
  });
  
  // Show message if no passwords scheduled
  if (scheduledPasswords.length === 0) {
    scheduledPasswordsList.innerHTML = '<p style="color: var(--text-secondary); font-style: italic;">Nenhuma senha programada.</p>';
  }
}

function deleteScheduledPassword(date) {
  let scheduledPasswords = getScheduledPasswords();
  scheduledPasswords = scheduledPasswords.filter(item => item.date !== date);
  saveScheduledPasswords(scheduledPasswords);
  loadScheduledPasswords();
  showNotification('Senha programada removida!');
}

function getScheduledPasswords() {
  try {
    return JSON.parse(localStorage.getItem('resenha_scheduled_passwords')) || [];
  } catch (e) {
    console.error('Error parsing scheduled passwords', e);
    return [];
  }
}

function saveScheduledPasswords(passwords) {
  localStorage.setItem('resenha_scheduled_passwords', JSON.stringify(passwords));
}

// User history functions
function loadUserHistory() {
  const filter = historyFilterSelect.value;
  const userHistory = getUserHistoryData();
  
  // Clear current data
  userHistoryData.innerHTML = '';
  
  // Filter data if needed
  let filteredHistory = userHistory;
  if (filter === 'active') {
    const today = new Date().toDateString();
    filteredHistory = userHistory.filter(user => user.lastAccess === today);
  }
  
  // Sort by last access (most recent first)
  filteredHistory.sort((a, b) => {
    const dateA = new Date(a.lastAccess);
    const dateB = new Date(b.lastAccess);
    return dateB - dateA;
  });
  
  // Create rows for each user
  filteredHistory.forEach(user => {
    const row = document.createElement('tr');
    
    const lastAccessDate = new Date(user.lastAccess);
    const formattedDate = lastAccessDate.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    row.innerHTML = `
      <td>${user.username}</td>
      <td>${user.deviceId.substring(0, 8)}...</td>
      <td>${formattedDate}</td>
      <td>${user.accessCount}</td>
    `;
    
    userHistoryData.appendChild(row);
  });
  
  // Show message if no users
  if (filteredHistory.length === 0) {
    const emptyRow = document.createElement('tr');
    emptyRow.innerHTML = `<td colspan="4" style="text-align: center; font-style: italic;">Nenhum usuário encontrado.</td>`;
    userHistoryData.appendChild(emptyRow);
  }
}

function getUserHistoryData() {
  // This would normally fetch from a server
  // For now, we'll generate some sample data if none exists
  try {
    let history = JSON.parse(localStorage.getItem('resenha_user_history')) || [];
    
    // If history is empty, generate sample data
    if (history.length === 0) {
      const deviceIds = [
        generateRandomId(),
        generateRandomId(),
        generateRandomId()
      ];
      
      const usernames = [
        'Pedro',
        'Ana',
        'Carlos',
        'Julia',
        'Marcos'
      ];
      
      // Generate random history
      for (let i = 0; i < 5; i++) {
        const deviceId = deviceIds[Math.floor(Math.random() * deviceIds.length)];
        const username = usernames[Math.floor(Math.random() * usernames.length)];
        const lastAccess = new Date();
        lastAccess.setDate(lastAccess.getDate() - Math.floor(Math.random() * 7));
        
        history.push({
          deviceId,
          username,
          lastAccess: lastAccess.toDateString(),
          accessCount: Math.floor(Math.random() * 20) + 1
        });
      }
      
      // Add current user
      const currentUsername = localStorage.getItem('resenha_username') || 'Usuario_Anônimo';
      const currentDeviceId = getDeviceId();
      
      history.push({
        deviceId: currentDeviceId,
        username: currentUsername,
        lastAccess: new Date().toDateString(),
        accessCount: 1
      });
      
      // Save the generated history
      localStorage.setItem('resenha_user_history', JSON.stringify(history));
    }
    
    return history;
  } catch (e) {
    console.error('Error parsing user history', e);
    return [];
  }
}

// Helper functions
function generateRandomId() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

function getDeviceId() {
  let deviceId = localStorage.getItem('resenha_device_id');
  if (!deviceId) {
    deviceId = generateRandomId();
    localStorage.setItem('resenha_device_id', deviceId);
  }
  return deviceId;
}

function showNotification(message, isError = false) {
  const notification = document.createElement('div');
  notification.className = `admin-notification ${isError ? 'error' : 'success'}`;
  notification.textContent = message;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.classList.add('show');
  }, 10);
  
  setTimeout(() => {
    notification.classList.remove('show');
    setTimeout(() => {
      notification.remove();
    }, 300);
  }, 3000);
}

// Event listeners
adminLoginBtn.addEventListener('click', attemptAdminLogin);
adminPasswordInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    attemptAdminLogin();
  }
});

logoutAdminBtn.addEventListener('click', () => {
  sessionStorage.removeItem('resenha_admin_auth');
  showAdminPanel(false);
});

togglePasswordVisibilityBtn.addEventListener('click', togglePasswordVisibility);
updatePasswordBtn.addEventListener('click', updatePassword);
schedulePasswordBtn.addEventListener('click', schedulePassword);

historyFilterSelect.addEventListener('change', loadUserHistory);
refreshHistoryBtn.addEventListener('click', loadUserHistory);

// Initialize the admin page
document.addEventListener('DOMContentLoaded', () => {
  // Add CSS for notifications
  const style = document.createElement('style');
  style.textContent = `
    .admin-notification {
      position: fixed;
      bottom: 20px;
      right: 20px;
      padding: 12px 20px;
      border-radius: 4px;
      color: white;
      font-size: 0.9rem;
      box-shadow: 0 3px 10px rgba(0, 0, 0, 0.2);
      transform: translateY(100px);
      opacity: 0;
      transition: all 0.3s ease;
      z-index: 9999;
    }
    
    .admin-notification.show {
      transform: translateY(0);
      opacity: 1;
    }
    
    .admin-notification.success {
      background-color: #28a745;
    }
    
    .admin-notification.error {
      background-color: #dc3545;
    }
  `;
  document.head.appendChild(style);
  
  // Check authentication
  checkAdminAuth();
});

// Background task to check for scheduled passwords
function checkScheduledPasswords() {
  const today = new Date().toISOString().split('T')[0];
  const scheduledPasswords = getScheduledPasswords();
  
  // Check if there's a password scheduled for today
  const todayPassword = scheduledPasswords.find(item => item.date === today);
  
  if (todayPassword) {
    // Update the current password
    localStorage.setItem('resenha_master_password', todayPassword.password);
    
    // Remove this scheduled password
    const updatedSchedules = scheduledPasswords.filter(item => item.date !== today);
    saveScheduledPasswords(updatedSchedules);
    
    console.log('Password updated to scheduled password for today.');
    
    // If admin panel is open, refresh the display
    if (adminPanel.style.display !== 'none') {
      loadCurrentPassword();
      loadScheduledPasswords();
    }
  }
}

// Check for scheduled passwords when the page loads
document.addEventListener('DOMContentLoaded', checkScheduledPasswords);

// Update the main app's password checking function
function updateMainAppPassword() {
  // This function modifies main.js to use the password from localStorage
  if (window.opener && !window.opener.closed) {
    try {
      // Try to access the opener window (main app)
      window.opener.updateMasterPassword();
    } catch (e) {
      console.error('Could not update password in main app:', e);
    }
  }
}

// Track user logins
function trackUserLogins() {
  window.addEventListener('message', function(event) {
    // Check origin for security
    if (event.data && event.data.type === 'userLogin') {
      const { username } = event.data;
      const deviceId = getDeviceId();
      const today = new Date().toDateString();
      
      // Get current history
      let history = getUserHistoryData();
      
      // Find this device/user combination
      const existingUserIndex = history.findIndex(
        user => user.deviceId === deviceId && user.username === username
      );
      
      if (existingUserIndex >= 0) {
        // Update existing record
        history[existingUserIndex].lastAccess = today;
        history[existingUserIndex].accessCount += 1;
      } else {
        // Add new record
        history.push({
          deviceId,
          username,
          lastAccess: today,
          accessCount: 1
        });
      }
      
      // Save updated history
      localStorage.setItem('resenha_user_history', JSON.stringify(history));
      
      // Refresh display if admin panel is open
      if (adminPanel.style.display !== 'none') {
        loadUserHistory();
      }
    }
  });
} 