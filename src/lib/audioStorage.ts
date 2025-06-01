// Function to initialize the audio storage database
export function initAudioStorage(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('parrotAudioDB', 1);
    
    request.onerror = (event) => {
      reject('Error opening IndexedDB');
    };
    
    request.onsuccess = (event) => {
      resolve(request.result);
    };
    
    request.onupgradeneeded = (event) => {
      const db = request.result;
      // Create an object store for the audio blobs
      if (!db.objectStoreNames.contains('audioBlobs')) {
        const store = db.createObjectStore('audioBlobs', { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });
}

// Function to save audio to IndexedDB
export function saveAudioToStorage(audioBlob: Blob): Promise<string> {
  return new Promise(async (resolve, reject) => {
    try {
      const db = await initAudioStorage();
      const transaction = db.transaction(['audioBlobs'], 'readwrite');
      const store = transaction.objectStore('audioBlobs');
      
      // Generate a unique ID
      const id = `audio_${Date.now()}`;
      const audioRecord = {
        id,
        blob: audioBlob,
        timestamp: Date.now(),
      };
      
      const request = store.add(audioRecord);
      
      request.onsuccess = () => {
        // Return the ID so it can be saved to localStorage for quick retrieval
        resolve(id);
      };
      
      request.onerror = () => {
        reject('Error saving audio to storage');
      };
    } catch (error) {
      reject(error);
    }
  });
}

// Function to get audio from IndexedDB by ID
export function getAudioFromStorage(id: string): Promise<Blob | null> {
  return new Promise(async (resolve, reject) => {
    try {
      const db = await initAudioStorage();
      const transaction = db.transaction(['audioBlobs'], 'readonly');
      const store = transaction.objectStore('audioBlobs');
      
      const request = store.get(id);
      
      request.onsuccess = () => {
        if (request.result) {
          resolve(request.result.blob);
        } else {
          resolve(null);
        }
      };
      
      request.onerror = () => {
        reject('Error retrieving audio from storage');
      };
    } catch (error) {
      reject(error);
    }
  });
}

// Function to delete audio from IndexedDB by ID
export function deleteAudioFromStorage(id: string): Promise<void> {
  return new Promise(async (resolve, reject) => {
    try {
      const db = await initAudioStorage();
      const transaction = db.transaction(['audioBlobs'], 'readwrite');
      const store = transaction.objectStore('audioBlobs');
      
      const request = store.delete(id);
      
      request.onsuccess = () => {
        resolve();
      };
      
      request.onerror = () => {
        reject('Error deleting audio from storage');
      };
    } catch (error) {
      reject(error);
    }
  });
}

// Function to clear all data from the audio store
export function clearAudioStorage(): Promise<void> {
  return new Promise(async (resolve, reject) => {
    try {
      const db = await initAudioStorage();
      const transaction = db.transaction(['audioBlobs'], 'readwrite');
      const store = transaction.objectStore('audioBlobs');
      
      const request = store.clear();
      
      request.onsuccess = () => {
        resolve();
      };
      
      request.onerror = () => {
        reject('Error clearing audio storage');
      };
    } catch (error) {
      reject(error);
    }
  });
}
