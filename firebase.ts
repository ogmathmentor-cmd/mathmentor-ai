import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAKa7rc7cYEDxPfqdqnX86BTz_xiBElPnI",
  authDomain: "ogmathmentor-f1a1f.firebaseapp.com",
  databaseURL: "https://ogmathmentor-f1a1f-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "ogmathmentor-f1a1f",
  storageBucket: "ogmathmentor-f1a1f.firebasestorage.app",
  messagingSenderId: "183490665926",
  appId: "1:183490665926:web:ee5af9a2cb11bbf5a866c7"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);