import { initializeApp, getApps, getApp } from "firebase/app"
import { getDatabase, type Database } from "firebase/database"
import { getStorage, type FirebaseStorage } from "firebase/storage"

const firebaseConfig = {
  apiKey: "AIzaSyBXleX6MFgS12IsTj9h3QG8p8viE4uy7aE",
  authDomain: "bookingcamera.firebaseapp.com",
  databaseURL: "https://bookingcamera-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "bookingcamera",
  storageBucket: "bookingcamera.firebasestorage.app",
  messagingSenderId: "448364758633",
  appId: "1:448364758633:web:0d3a0e33adfacd129a44f8",
  measurementId: "G-M7NGSE56VF",
}

// ✅ Kiểm tra nếu app đã được khởi tạo, dùng lại app cũ — tránh duplicate
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp()

export const database: Database = getDatabase(app)
export const storage: FirebaseStorage = getStorage(app)

export { app }
