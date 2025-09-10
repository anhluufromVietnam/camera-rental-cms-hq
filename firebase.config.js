import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyBXleX6MFgS12IsTj9h3QG8p8viE4uy7aE",
  authDomain: "bookingcamera.firebaseapp.com",
  databaseURL: "https://bookingcamera-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "bookingcamera",
  storageBucket: "bookingcamera.firebasestorage.app",
  messagingSenderId: "448364758633",
  appId: "1:448364758633:web:0d3a0e33adfacd129a44f8",
  measurementId: "G-M7NGSE56VF"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app)
export { app, db }