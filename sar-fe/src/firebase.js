import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAMT8k7-LAMkhDumz2ma3f0uP-yTlD6JIM",
  authDomain: "sar-5ea5c.firebaseapp.com",
  projectId: "sar-5ea5c",
  storageBucket: "sar-5ea5c.appspot.com",
  messagingSenderId: "424545969457",
  appId: "1:424545969457:web:4558d52dedf7b7215ffc10"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
