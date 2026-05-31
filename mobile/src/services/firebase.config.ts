import { initializeApp } from 'firebase/app';
import { initializeFirestore } from 'firebase/firestore';
import { initializeAuth, type Persistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

// getReactNativePersistence ships only in firebase/auth's React Native build, so
// it's missing from the default type defs — require + cast to use it.
const { getReactNativePersistence } = require('firebase/auth') as {
  getReactNativePersistence: (storage: unknown) => Persistence;
};

// Same project as the web app — the mobile app reads the same Firestore data.
const firebaseConfig = {
  apiKey: 'AIzaSyAvolx_iWjJjYVgi4cf9q1fgOs-_lQiE8g',
  authDomain: 'polardex-prod.firebaseapp.com',
  projectId: 'polardex-prod',
  storageBucket: 'polardex-prod.firebasestorage.app',
  messagingSenderId: '475965315646',
  appId: '1:475965315646:web:60a279d7e747c2575d4f6f',
};

const app = initializeApp(firebaseConfig);

// Force long-polling: Firestore's default WebChannel transport is unreliable in
// React Native / Expo Go, which can leave listeners hanging. Long-polling works.
export const firestore = initializeFirestore(app, {
  experimentalForceLongPolling: true,
});

// Persist the auth session across app restarts via AsyncStorage (RN has no
// default persistence). getReactNativePersistence is only typed in firebase's
// .rn build, hence the cast.
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage),
});
