// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAgRcp2tShVPuAaO4t-BQ-jCjFoj1Jdl74",
  authDomain: "inventory-management-59738.firebaseapp.com",
  projectId: "inventory-management-59738",
  storageBucket: "inventory-management-59738.appspot.com",
  messagingSenderId: "1096655244136",
  appId: "1:1096655244136:web:ada9c9906abf76561a64dd",
  measurementId: "G-XWHSLEJS6H"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const firestore = getFirestore(app);
const auth = getAuth(app);

// Initialize Firebase Analytics (only in client environment)
let analytics;
if (typeof window !== "undefined") {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  }).catch((error) => {
    console.error("Firebase Analytics not supported:", error);
  });
}

export { firestore, auth, analytics };
