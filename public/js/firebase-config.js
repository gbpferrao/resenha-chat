// Firebase configuration for Resenha Chat
const firebaseConfig = {
  apiKey: "AIzaSyCOomocXdJ5ljHnS_K-H_CBiOnuF3fpl5M",
  authDomain: "resenha-chat-206b0.firebaseapp.com",
  databaseURL: "https://resenha-chat-206b0-default-rtdb.firebaseio.com",
  projectId: "resenha-chat-206b0",
  storageBucket: "resenha-chat-206b0.firebasestorage.app",
  messagingSenderId: "678585981832",
  appId: "1:678585981832:web:b7a3ccc5b1cca4fa62b83d",
  measurementId: "G-D5TXNTZZN2"
};

// Enable detailed logging for debugging
localStorage.setItem('firebase:previous_websocket_failure', true);

// Initialize Firebase with retry mechanism
function initializeFirebase(retryCount = 0, maxRetries = 3) {
  try {
    // Check if Firebase SDK is loaded
    if (typeof firebase === 'undefined') {
      throw new Error("Firebase SDK não foi carregado corretamente");
    }
    
    // Initialize Firebase
    firebase.initializeApp(firebaseConfig);
    console.log("Firebase initialized successfully");
    
    // Make database globally accessible
    window.database = firebase.database();
    console.log("Database reference created");
    
    // Enable persistent connections
    window.database.goOnline();
    
    // Test database connection
    window.database.ref('.info/connected').on('value', (snapshot) => {
      const connected = snapshot.val();
      console.log("Firebase connection state:", connected ? "connected" : "disconnected");
      
      if (connected) {
        // Hide error message if it was displayed
        const firebaseError = document.getElementById('firebase-error');
        if (firebaseError) {
          firebaseError.style.display = 'none';
        }
      } else if (!connected && retryCount >= maxRetries) {
        // Show error message if not connected after max retries
        setTimeout(() => {
          const firebaseError = document.getElementById('firebase-error');
          if (firebaseError && !snapshot.val()) {
            firebaseError.style.display = 'block';
            const errorMsg = document.getElementById('firebase-error-message');
            if (errorMsg) {
              errorMsg.textContent = 'Erro ao conectar com o Firebase. Verifique sua conexão.';
            }
          }
        }, 5000);
      }
    });
    
    return true;
  } catch (error) {
    console.error("Error initializing Firebase:", error);
    
    if (retryCount < maxRetries) {
      console.log(`Retrying Firebase initialization (${retryCount + 1}/${maxRetries})...`);
      
      // Retry after delay
      setTimeout(() => {
        initializeFirebase(retryCount + 1, maxRetries);
      }, 3000); // 3 second delay between retries
      
      return false;
    } else {
      // Show error notification after all retries failed
      setTimeout(() => {
        const firebaseError = document.getElementById('firebase-error');
        if (firebaseError) {
          firebaseError.style.display = 'block';
          const errorMsg = document.getElementById('firebase-error-message');
          if (errorMsg) {
            errorMsg.textContent = 'Erro ao inicializar Firebase: ' + error.message;
          }
        }
      }, 1000);
      
      return false;
    }
  }
}

// Start Firebase initialization
initializeFirebase();

// Function to get the current master password
window.getMasterPasswordFromFirebase = async function() {
  try {
    if (!window.database) {
      throw new Error("Database not initialized");
    }
    
    const passwordRef = window.database.ref('adminSettings/masterPassword');
    const snapshot = await passwordRef.once('value');
    console.log("Password retrieved from Firebase:", snapshot.exists() ? "exists" : "does not exist");
    return snapshot.val() || 'resenha123'; // Default fallback
  } catch (error) {
    console.error('Error getting master password:', error);
    return 'resenha123'; // Default fallback on error
  }
}

// Function to set the master password in Firebase
window.setMasterPasswordInFirebase = async function(newPassword) {
  try {
    if (!window.database) {
      throw new Error("Database not initialized");
    }
    
    await window.database.ref('adminSettings/masterPassword').set(newPassword);
    console.log("Password successfully set in Firebase");
    return true;
  } catch (error) {
    console.error('Error setting master password:', error);
    return false;
  }
}