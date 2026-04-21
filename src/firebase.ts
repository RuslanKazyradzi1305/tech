import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyANC4Yh3w9iJ9YoRDJ3hN8ATWmnSVldgvs",
  authDomain: "techspec-app.firebaseapp.com",
  projectId: "techspec-app",
  storageBucket: "techspec-app.firebasestorage.app",
  messagingSenderId: "10773674177",
  appId: "1:10773674177:web:92fb1ca6381094d75e3c40",
  measurementId: "G-XL4K8PQ0EC"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app); // Uses the default database for this Firebase project
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Optional Analytics, ignoring errors if run in environment without web APIs enabled securely
if (typeof window !== "undefined") {
  try {
    getAnalytics(app);
  } catch (e) {
    // Ignore analytics init errors
  }
}

export const loginWithGoogle = () => signInWithPopup(auth, googleProvider);
export const logout = () => signOut(auth);
