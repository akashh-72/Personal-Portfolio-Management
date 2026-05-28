import { initializeApp } from "firebase/app";
import { getDatabase, ref } from "firebase/database";

// Firebase configuration provided by the user
const firebaseConfig = {
  apiKey: "AIzaSyBQcEQUb_mH0DkxPLA8xIlKvDd6oDR79Ww",
  authDomain: "stock-market-13e36.firebaseapp.com",
  databaseURL: "https://stock-market-13e36-default-rtdb.firebaseio.com",
  projectId: "stock-market-13e36",
  storageBucket: "stock-market-13e36.firebasestorage.app",
  messagingSenderId: "311468119751",
  appId: "1:311468119751:web:00669b68691f81e8d250e2"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Realtime Database
const db = getDatabase(app);

export { app, db, ref };
