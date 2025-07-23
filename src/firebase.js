// src/firebase.js
import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyDrrk8HnmLTE8BfGIp4qog0pRVDgiM1xAM",
  authDomain: "radiosignaldb.firebaseapp.com",
  databaseURL: "https://radiosignaldb-default-rtdb.europe-west1.firebasedatabase.app/", // ← REQUIRED
  projectId: "radiosignaldb",
  storageBucket: "radiosignaldb.firebasestorage.app",
  messagingSenderId: "710694962829",
  appId: "1:710694962829:web:91848c520db09eb90b84c4",
  measurementId: "G‑RRJFQXCGVC"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
