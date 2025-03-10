// Password Protection
const MASTER_PASSWORD = "resenha123"; // Default password
const passwordOverlay = document.getElementById('password-overlay');
const appContainer = document.getElementById('app-container');
const passwordInput = document.getElementById('password-input');
const unlockBtn = document.getElementById('unlock-btn');
const passwordError = document.getElementById('password-error');

// Check if authentication is needed
function checkAuthStatus() {
  const lastAuth = localStorage.getItem('resenha_last_auth');
  const currentDate = new Date().toDateString();
  
  if (!lastAuth || lastAuth !== currentDate) {
    // New day or first visit, show password overlay
    showPasswordOverlay(true);
  } else {
    // Already authenticated today
    showPasswordOverlay(false);
    
    // Track user login
    trackUserLogin();
  }
}

// Show or hide password overlay
function showPasswordOverlay(show) {
  if (show) {
    passwordOverlay.style.display = 'flex';
    appContainer.style.display = 'none';
    // Focus on password input
    setTimeout(() => passwordInput.focus(), 100);
  } else {
    passwordOverlay.style.display = 'none';
    appContainer.style.display = 'flex';
  }
}

// Handle unlock button click
unlockBtn.addEventListener('click', attemptUnlock);

// Handle enter key on password input
passwordInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    attemptUnlock();
  }
});

// Get the current master password (from Firebase or default)
async function getMasterPassword() {
  const storedPassword = localStorage.getItem('resenha_master_password');
  if (storedPassword) {
    return storedPassword;
  }
  
  try {
    const firebasePassword = await window.getMasterPasswordFromFirebase();
    localStorage.setItem('resenha_master_password', firebasePassword);
    return firebasePassword;
  } catch (error) {
    console.error('Error getting master password:', error);
    return MASTER_PASSWORD; // Fallback to default
  }
}

// Update master password (called from admin panel)
async function updateMasterPassword(newPassword) {
  if (!newPassword || typeof newPassword !== 'string' || newPassword.trim().length === 0) {
    console.error('Invalid password format');
    return false;
  }
  
  try {
    // Update in Firebase
    const success = await window.setMasterPasswordInFirebase(newPassword.trim());
    
    if (success) {
      // Also update in localStorage
      localStorage.setItem('resenha_master_password', newPassword.trim());
      console.log('Password updated successfully');
      return true;
    } else {
      console.error('Failed to update password in Firebase');
      return false;
    }
  } catch (error) {
    console.error('Error updating master password:', error);
    return false;
  }
}

// Attempt to unlock with entered password
async function attemptUnlock() {
  try {
    console.log("Attempting to unlock...");
    const enteredPassword = passwordInput.value.trim();
    console.log("Password entered:", enteredPassword ? "***" : "(empty)");
    
    const currentMasterPassword = await getMasterPassword();
    console.log("Master password retrieved:", currentMasterPassword ? "***" : "(empty)");
    
    if (enteredPassword === currentMasterPassword) {
      console.log("Password correct, unlocking...");
      // Correct password
      const currentDate = new Date().toDateString();
      localStorage.setItem('resenha_last_auth', currentDate);
      showPasswordOverlay(false);
      passwordError.textContent = '';
      passwordInput.value = '';
      
      // Track user login
      trackUserLogin();
      
      console.log("Authentication successful");
    } else {
      console.log("Password incorrect");
      // Incorrect password
      passwordError.textContent = 'Senha incorreta. Tente novamente.';
      passwordInput.value = '';
      passwordInput.focus();
      
      // Shake animation for visual feedback
      passwordInput.classList.add('shake');
      setTimeout(() => passwordInput.classList.remove('shake'), 500);
    }
  } catch (error) {
    console.error("Error during authentication:", error);
    passwordError.textContent = 'Erro ao verificar senha. Tente novamente.';
  }
}

// Track user login for admin panel
function trackUserLogin() {
  const username = usernameInput.value.trim();
  
  // Generate device ID if none exists
  if (!localStorage.getItem('resenha_device_id')) {
    const deviceId = Math.random().toString(36).substring(2, 15) + 
                     Math.random().toString(36).substring(2, 15);
    localStorage.setItem('resenha_device_id', deviceId);
  }
  
  // Send message to admin panel if open
  if (window.opener && !window.opener.closed) {
    try {
      window.opener.postMessage({
        type: 'userLogin',
        username: username
      }, '*');
    } catch (e) {
      console.error('Error sending login data to admin panel:', e);
    }
  }
  
  // Store login in history
  try {
    const deviceId = localStorage.getItem('resenha_device_id');
    const today = new Date().toDateString();
    
    let history = JSON.parse(localStorage.getItem('resenha_user_history')) || [];
    
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
    
    localStorage.setItem('resenha_user_history', JSON.stringify(history));
  } catch (e) {
    console.error('Error updating user history:', e);
  }
}

// Check auth status when page loads
document.addEventListener('DOMContentLoaded', checkAuthStatus);

// DOM Elements
const messagesContainer = document.getElementById('messages-container');
const messageInput = document.getElementById('message-input');
const sendMessageBtn = document.getElementById('send-message-btn');
const usernameInput = document.getElementById('username-input');

// Initialize with a random username if none exists
const storedUsername = localStorage.getItem('resenha_username');
if (storedUsername) {
  usernameInput.value = storedUsername;
} else {
  const defaultUsername = `Usuario_${Math.floor(Math.random() * 10000)}`;
  usernameInput.value = defaultUsername;
  localStorage.setItem('resenha_username', defaultUsername);
}

// Initialize sent messages array in localStorage if it doesn't exist
if (!localStorage.getItem('resenha_sent_message_ids')) {
  localStorage.setItem('resenha_sent_message_ids', JSON.stringify([]));
}

// Get list of message IDs sent by this user
function getSentMessageIds() {
  const stored = localStorage.getItem('resenha_sent_message_ids');
  return stored ? JSON.parse(stored) : [];
}

// Save username to localStorage when changed
usernameInput.addEventListener('change', () => {
  const newUsername = usernameInput.value.trim();
  if (newUsername) {
    localStorage.setItem('resenha_username', newUsername);
  }
});

// API calls replaced with Firebase functions
async function fetchMessages() {
  try {
    const messagesRef = window.database.ref('messages');
    const snapshot = await messagesRef.once('value');
    let messages = [];
    
    snapshot.forEach((childSnapshot) => {
      const message = childSnapshot.val();
      message.id = childSnapshot.key;
      messages.push(message);
    });
    
    // Sort by timestamp (newest last)
    messages.sort((a, b) => a.timestamp - b.timestamp);
    
    // Remove messages older than 24 hours
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    messages = messages.filter(msg => msg.timestamp > oneDayAgo);
    
    return messages;
  } catch (error) {
    console.error('Error fetching messages:', error);
    showError('Falha ao carregar mensagens. Por favor, tente novamente mais tarde.');
    return [];
  }
}

async function sendMessage(content) {
  try {
    const username = usernameInput.value.trim();
    if (!username) {
      showError('Por favor, defina seu nome de usuário.');
      return;
    }
    
    const newMessageRef = window.database.ref('messages').push();
    
    // Add message ID to sent messages BEFORE sending the message
    const sentMessageIds = getSentMessageIds();
    sentMessageIds.push(newMessageRef.key);
    localStorage.setItem('resenha_sent_message_ids', JSON.stringify(sentMessageIds));
    
    await newMessageRef.set({
      content: content,
      username: username,
      timestamp: Date.now()
    });
    
    return newMessageRef.key;
  } catch (error) {
    console.error('Error sending message:', error);
    showError('Falha ao enviar mensagem. Por favor, tente novamente mais tarde.');
    return null;
  }
}

// UI functions
function renderMessages(messages) {
  // Clear loading indicator
  messagesContainer.innerHTML = '';
  
  if (messages.length === 0) {
    const emptyEl = document.createElement('div');
    emptyEl.className = 'loading-messages';
    emptyEl.innerHTML = `
      <i class="fas fa-comments"></i>
      <p>Nenhuma mensagem ainda. Seja o primeiro a dizer algo!</p>
    `;
    messagesContainer.appendChild(emptyEl);
    return;
  }
  
  // Sort messages by timestamp (newest first)
  const sortedMessages = [...messages].sort((a, b) => 
    new Date(b.timestamp) - new Date(a.timestamp)
  );
  
  // Get current username for styling
  const currentUsername = usernameInput.value.trim();
  
  // Get sent message IDs from localStorage
  const sentMessageIds = getSentMessageIds();
  
  // Render each message
  sortedMessages.forEach(message => {
    const messageWrapper = document.createElement('div');
    
    // Check if this message was sent by the current user
    // Either by matching username OR if the message ID is in our sent messages array
    const isOwnMessage = 
      currentUsername === message.username || 
      sentMessageIds.includes(message.id);
    
    messageWrapper.className = `message-wrapper ${isOwnMessage ? 'my-message-wrapper' : 'other-message-wrapper'}`;
    
    const timestamp = new Date(message.timestamp);
    const formattedTime = formatTimestamp(timestamp);
    
    messageWrapper.innerHTML = `
      <div class="message ${isOwnMessage ? 'my-message' : 'other-message'}">
        <div class="message-time">${formattedTime}</div>
        <div class="message-user">${escapeHTML(message.username)}</div>
        <div class="message-content">${escapeHTML(message.content)}</div>
      </div>
    `;
    
    messagesContainer.appendChild(messageWrapper);
  });
}

function formatTimestamp(timestamp) {
  const messageDate = new Date(timestamp);
  
  // Retorna apenas a hora no formato HH:MM
  return messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function escapeHTML(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function showError(message) {
  const errorEl = document.createElement('div');
  errorEl.className = 'error-toast';
  errorEl.textContent = message;
  
  document.body.appendChild(errorEl);
  
  // Remove the error after 3 seconds
  setTimeout(() => {
    errorEl.remove();
  }, 3000);
}

function showNotification(message) {
  const notificationEl = document.createElement('div');
  notificationEl.className = 'notification';
  notificationEl.textContent = message;
  
  document.body.appendChild(notificationEl);
  
  // Remove the notification after 3 seconds
  setTimeout(() => {
    notificationEl.classList.add('fade-out');
    setTimeout(() => {
      notificationEl.remove();
    }, 500);
  }, 3000);
}

// Event listeners
sendMessageBtn.addEventListener('click', async () => {
  const content = messageInput.value.trim();
  
  if (!content) return;
  
  messageInput.value = '';
  
  const result = await sendMessage(content);
  
  if (result) {
    // Reload messages to show the new one
    loadMessages();
  }
});

messageInput.addEventListener('keydown', async (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessageBtn.click();
  }
});

// Add notification styles
const styleEl = document.createElement('style');
styleEl.textContent = `
  .error-toast {
    position: fixed;
    top: 20px;
    right: 20px;
    background-color: var(--error-color);
    color: white;
    padding: 10px 20px;
    border-radius: 5px;
    z-index: 1000;
    animation: slideIn 0.3s ease-out;
    border-left: 3px solid #a03030;
  }
  
  .notification {
    position: fixed;
    bottom: 20px;
    right: 20px;
    background-color: var(--accent-color);
    color: white;
    padding: 10px 20px;
    border-radius: 5px;
    z-index: 1000;
    animation: slideIn 0.3s ease-out;
    border-left: 3px solid rgba(120, 140, 190, 0.7);
  }
  
  .notification.fade-out {
    opacity: 0;
    transition: opacity 0.5s ease-out;
  }
  
  @keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
`;
document.head.appendChild(styleEl);

// Add real-time updates
function setupRealTimeUpdates() {
  const messagesRef = window.database.ref('messages');
  
  messagesRef.on('child_added', (snapshot) => {
    const message = snapshot.val();
    message.id = snapshot.key;
    
    // Only render if it's a new message and not initial load
    if (document.querySelector(`.message-wrapper[data-id="${message.id}"]`)) {
      return;
    }
    
    // Check if message is less than 24 hours old
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    if (message.timestamp > oneDayAgo) {
      renderSingleMessage(message);
      
      // Scroll to bottom if user was already at bottom
      const isAtBottom = messagesContainer.scrollTop + messagesContainer.clientHeight >= messagesContainer.scrollHeight - 100;
      if (isAtBottom) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }
    }
  });
  
  // Remove expired messages (older than 24 hours)
  setInterval(() => {
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    const messageElements = document.querySelectorAll('.message-wrapper');
    
    messageElements.forEach(element => {
      const timestamp = parseInt(element.getAttribute('data-timestamp'), 10);
      if (timestamp < oneDayAgo) {
        element.remove();
      }
    });
  }, 60000); // Check every minute
}

// Add a helper function to render a single message
function renderSingleMessage(message) {
  const sentMessageIds = getSentMessageIds();
  const isMyMessage = sentMessageIds.includes(message.id);
  
  const messageWrapper = document.createElement('div');
  messageWrapper.className = `message-wrapper ${isMyMessage ? 'my-message-wrapper' : 'other-message-wrapper'}`;
  messageWrapper.setAttribute('data-id', message.id);
  messageWrapper.setAttribute('data-timestamp', message.timestamp);
  
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${isMyMessage ? 'my-message' : 'other-message'}`;
  
  const usernameDiv = document.createElement('div');
  usernameDiv.className = 'message-user';
  usernameDiv.textContent = message.username;
  
  const contentDiv = document.createElement('div');
  contentDiv.className = 'message-content';
  contentDiv.textContent = message.content;
  
  const timeDiv = document.createElement('div');
  timeDiv.className = 'message-time';
  timeDiv.textContent = formatTimestamp(message.timestamp);
  
  messageDiv.appendChild(usernameDiv);
  messageDiv.appendChild(contentDiv);
  messageDiv.appendChild(timeDiv);
  messageWrapper.appendChild(messageDiv);
  
  // Add to DOM
  messagesContainer.insertBefore(messageWrapper, messagesContainer.firstChild);
}

// Clean up old messages periodically
async function cleanupOldMessages() {
  try {
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    const messagesRef = window.database.ref('messages');
    const snapshot = await messagesRef.once('value');
    
    const deletePromises = [];
    snapshot.forEach((childSnapshot) => {
      const message = childSnapshot.val();
      if (message.timestamp < oneDayAgo) {
        deletePromises.push(messagesRef.child(childSnapshot.key).remove());
      }
    });
    
    await Promise.all(deletePromises);
    console.log(`Cleaned up ${deletePromises.length} old messages`);
  } catch (error) {
    console.error('Error cleaning up old messages:', error);
  }
}

// Load messages function
async function loadMessages() {
  const messages = await fetchMessages();
  renderMessages(messages);
}

// Initialize the application
function init() {
  // Load messages right away
  loadMessages();
  
  // Set up real-time updates
  setupRealTimeUpdates();
  
  // Focus the message input for immediate typing
  messageInput.focus();
  
  // Set up message cleanup
  setInterval(cleanupOldMessages, 3600000); // Every hour
  
  // Set up retry button for Firebase connection
  const retryBtn = document.getElementById('retry-firebase-btn');
  if (retryBtn) {
    retryBtn.addEventListener('click', function() {
      // Hide the error message
      const firebaseError = document.getElementById('firebase-error');
      if (firebaseError) {
        firebaseError.style.display = 'none';
      }
      
      // Try to reinitialize Firebase
      if (typeof initializeFirebase === 'function') {
        console.log("Retrying Firebase connection...");
        initializeFirebase(0, 3);
      }
    });
  }
}

// Start the application
init(); 