import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyBbvUsli8itCUvKv9gJFyQXJmibVN_YgkM",
  authDomain: "guia-inteligente-f9a9d.firebaseapp.com",
  projectId: "guia-inteligente-f9a9d",
  storageBucket: "guia-inteligente-f9a9d.firebasestorage.app",
  messagingSenderId: "141668624775",
  appId: "1:141668624775:web:76eb355b6abede92a94b22"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

// Test connection
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("Firebase Connection verified successfully!");
  } catch (error) {
    if (error instanceof Error && error.message.includes('offline')) {
      console.error("Firebase is offline. Check credentials or network:", error);
    }
  }
}
testConnection();

