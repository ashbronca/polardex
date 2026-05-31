import { initializeApp } from 'firebase/app';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  getFirestore,
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'AIzaSyAvolx_iWjJjYVgi4cf9q1fgOs-_lQiE8g',
  authDomain: 'polardex-prod.firebaseapp.com',
  projectId: 'polardex-prod',
  storageBucket: 'polardex-prod.firebasestorage.app',
  messagingSenderId: '475965315646',
  appId: '1:475965315646:web:60a279d7e747c2575d4f6f',
};

const firebase = initializeApp(firebaseConfig);

// Offline persistence: cards hydrate instantly from IndexedDB on return visits,
// and only deltas hit the network instead of re-reading the whole collection.
// Falls back to the default in-memory cache where IndexedDB is unavailable
// (private browsing, unsupported browsers).
function createFirestore() {
  try {
    return initializeFirestore(firebase, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    });
  } catch (err) {
    console.warn('[firestore] persistent cache unavailable, using memory cache', err);
    return getFirestore(firebase);
  }
}

export const firestore = createFirestore();
export const auth = getAuth(firebase);
