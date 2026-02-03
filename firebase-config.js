// Инициализация Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import { getDatabase, ref, set, onValue, push, update, remove, get, child } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";

// Конфигурация Firebase
const firebaseConfig = {
    apiKey: "AIzaSyC-rP_14WecIFKWJHGvlszK16voEKNQ1Gw",
    authDomain: "chessproject-3d878.firebaseapp.com",
    projectId: "chessproject-3d878",
    storageBucket: "chessproject-3d878.firebasestorage.app",
    messagingSenderId: "735951507631",
    appId: "1:735951507631:web:587083ce4d0f34e01f845a"
};

// Инициализация Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);

// Экспорт модулей Firebase
export { 
    auth, 
    database, 
    GoogleAuthProvider, 
    signInWithPopup, 
    signOut,
    ref, 
    set, 
    onValue, 
    push, 
    update, 
    remove, 
    get, 
    child 
};
