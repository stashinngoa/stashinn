import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCf5PRjKlC7UYEbT06fqJhEvgANqRNJ8tM",
  authDomain: "stashinndev-36eb8.firebaseapp.com",
  projectId: "stashinndev-36eb8",
  storageBucket: "stashinndev-36eb8.firebasestorage.app",
  messagingSenderId: "71295919073",
  appId: "1:71295919073:web:d32f0a9ddf7227e67ca8a0",
  measurementId: "G-W4077CKZ6F"
};

// Initialize Firebase (singleton)
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);

export { app, auth };
