// /lib/firebase.ts
import { initializeApp, getApps, getApp } from "firebase/app"
import { getDatabase } from "firebase/database"
import { getStorage } from "firebase/storage"
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration

const firebaseConfig = {
  apiKey: "AIzaSyBXleX6MFgS12IsTj9h3QG8p8viE4uy7aE",
  authDomain: "bookingcamera.firebaseapp.com",
  databaseURL: "https://bookingcamera-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "bookingcamera",
  storageBucket: "bookingcamera.appspot.com",
  messagingSenderId: "448364758633",
  appId: "1:448364758633:web:0d3a0e33adfacd129a44f8",
  measurementId: "G-M7NGSE56VF",
}

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp()

export const db = getDatabase(app)
export const storage = getStorage(app)
export const auth = getAuth(app);

export { app }
