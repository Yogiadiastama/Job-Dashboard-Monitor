// --- MOCK DATA ---
// Data awal untuk mensimulasikan database yang sudah ada.

export type User = {
    uid: string;
    email: string | null;
};

let USERS = [
  { id: 'admin_uid', uid: 'admin_uid', nama: 'Admin Utama', email: 'admin@proapp.local', noWhatsapp: '081234567890', role: 'admin', photoURL: 'https://i.pravatar.cc/150?u=admin' },
  { id: 'pimpinan_uid', uid: 'pimpinan_uid', nama: 'Budi Pimpinan', email: 'budi@example.com', noWhatsapp: '081234567891', role: 'pimpinan', photoURL: 'https://i.pravatar.cc/150?u=pimpinan' },
  { id: 'pegawai_1_uid', uid: 'pegawai_1_uid', nama: 'Ani Pegawai', email: 'ani@example.com', noWhatsapp: '081234567892', role: 'pegawai', photoURL: 'https://i.pravatar.cc/150?u=pegawai1' },
  { id: 'pegawai_2_uid', uid: 'pegawai_2_uid', nama: 'Candra Pegawai', email: 'candra@example.com', noWhatsapp: '081234567893', role: 'pegawai', photoURL: 'https://i.pravatar.cc/150?u=pegawai2' },
];

let TASKS = [
  { id: 'task_1', title: 'Desain Mockup Aplikasi', description: 'Membuat desain hi-fi untuk fitur baru.', assignedTo: 'pegawai_1_uid', dueDate: '2025-09-15', priority: 'High', status: 'On Progress', rating: 0 },
  { id: 'task_2', title: 'Riset Pasar', description: 'Menganalisis kompetitor.', assignedTo: 'pegawai_2_uid', dueDate: '2025-09-10', priority: 'Mid', status: 'Completed', rating: 5 },
  { id: 'task_3', title: 'Setup Server Staging', description: 'Konfigurasi lingkungan server untuk testing.', assignedTo: 'pegawai_1_uid', dueDate: '2025-08-25', priority: 'High', status: 'Pending', rating: 0 },
  { id: 'task_4', title: 'Laporan Keuangan Bulanan', description: 'Menyusun laporan keuangan untuk bulan Agustus.', assignedTo: 'pimpinan_uid', dueDate: '2025-09-05', priority: 'Mid', status: 'Completed', rating: 4 },
];

let EVENTS = [
    { id: 'event_1', title: 'Rapat Tim Mingguan', date: '2025-09-08', description: 'Pembahasan progres mingguan.', createdBy: 'admin_uid' },
    { id: 'event_2', title: 'Presentasi Klien', date: '2025-09-20', description: 'Demo produk ke klien X.', createdBy: 'pimpinan_uid' },
];

let SETTINGS: { [key: string]: any } = {
    theme: {
        headerTitle: 'ProFlow (Demo)',
        accentColor: '#4F46E5',
        loginBgUrl: 'https://images.unsplash.com/photo-1559028006-44d5a2b3e3f3?q=80&w=2574&auto=format&fit=crop',
    }
};

// --- MOCK IMPLEMENTATION ---

export const isConfigured = true;

export const firebaseConfig = {
    apiKey: "AIzaSy_MOCK_API_KEY_FOR_DEMO",
    authDomain: "proflow-demo.firebaseapp.com",
    projectId: "proflow-demo",
    storageBucket: "proflow-demo.appspot.com",
    messagingSenderId: "1234567890",
    appId: "1:1234567890:web:1234567890abcdef"
};

// -- Mock Auth --
let currentUser: User | null = null;
const authStateListeners: ((user: User | null) => void)[] = [];

const mockAuth = {
    onAuthStateChanged: (callback: (user: User | null) => void) => {
        authStateListeners.push(callback);
        callback(currentUser);
        return () => {
            const index = authStateListeners.indexOf(callback);
            if (index > -1) authStateListeners.splice(index, 1);
        };
    },
    signInWithEmailAndPassword: async (_auth: any, email: string, pass: string) => {
        let userToLogin = null;
        if (email === 'admin@proapp.local' && pass === 'Admin123') {
            userToLogin = USERS.find(u => u.role === 'admin');
        } else {
            userToLogin = USERS.find(u => u.email === email);
        }

        if (userToLogin) {
            currentUser = { uid: userToLogin.uid, email: userToLogin.email } as User;
            authStateListeners.forEach(listener => listener(currentUser));
            return { user: currentUser };
        } else {
            throw { code: 'auth/invalid-credential', message: 'Invalid credentials' };
        }
    },
    createUserWithEmailAndPassword: async (_auth: any, email: string, _pass: string) => {
        if (USERS.some(u => u.email === email)) {
            throw { code: 'auth/email-already-in-use' };
        }
        const uid = `new_user_${Date.now()}`;
        return { user: { uid, email } as User };
    },
    signOut: async () => {
        currentUser = null;
        authStateListeners.forEach(listener => listener(null));
    },
     sendPasswordResetEmail: async (email: string) => {
        if (USERS.some(u => u.email === email)) {
            window.alert(`(MOCK) Email reset password telah dikirim ke ${email}.`);
            return;
        }
        throw new Error("User not found");
    },
};

export const auth = mockAuth;
export const getAuth = () => mockAuth;
export const signOut = mockAuth.signOut;
export const onAuthStateChanged = mockAuth.onAuthStateChanged;
export const signInWithEmailAndPassword = mockAuth.signInWithEmailAndPassword;
export const createUserWithEmailAndPassword = mockAuth.createUserWithEmailAndPassword;
export const sendPasswordResetEmail = mockAuth.sendPasswordResetEmail;

// -- Mock Firestore --
const firestoreListeners: { [path: string]: Function[] } = {};

const notifyListeners = (path: string, data: any) => {
    if (firestoreListeners[path]) {
        const isDoc = !!data && typeof data === 'object' && !Array.isArray(data);
        firestoreListeners[path].forEach(cb => {
            if (isDoc) {
                cb({ id: data.id, exists: () => true, data: () => data });
            } else if (data === null) { // Document deleted
                 cb({ id: path.split('/').pop(), exists: () => false, data: () => undefined });
            } else { // Collection
                cb({
                    docs: data.map((doc: any) => ({
                        id: doc.id,
                        data: () => doc,
                    })),
                });
            }
        });
    }
};

const mockFirestoreInstance = { _isMock: true };
export const db = mockFirestoreInstance;
export const getFirestore = () => mockFirestoreInstance;

// -- Mock Firestore Functions --
export const collection = (_db: any, path: string) => {
    let collectionRef: any[] = [];
    if (path === 'users') collectionRef = USERS;
    if (path === 'tasks') collectionRef = TASKS;
    if (path === 'events') collectionRef = EVENTS;
    
    return { path, _data: collectionRef };
};

export const doc = (db_or_ref: any, path_or_id: string, id_maybe?: string) => {
    const isRefFirst = typeof db_or_ref._data !== 'undefined';
    const collectionRef = isRefFirst ? db_or_ref._data : null;
    const path = isRefFirst ? db_or_ref.path : path_or_id;
    const id = isRefFirst ? path_or_id : id_maybe!;
    
    let sourceData = collectionRef;
    if (!sourceData) {
        if (path === 'users') sourceData = USERS;
        if (path === 'tasks') sourceData = TASKS;
        if (path === 'events') sourceData = EVENTS;
        if (path === 'settings') {
             return { path: `${path}/${id}`, id, _collectionPath: path, _data: SETTINGS[id] };
        }
    }

    const docData = sourceData ? sourceData.find((d: any) => d.id === id || d.uid === id) : undefined;
    return { path: `${path}/${id}`, id, _collectionPath: path, _data: docData };
};

export const onSnapshot = (ref: any, callback: Function) => {
    const path = ref.path || ref._collectionPath;
    const isDocRef = !!ref.id;
    const listenPath = isDocRef ? ref.path : path;

    if (!firestoreListeners[listenPath]) firestoreListeners[listenPath] = [];
    firestoreListeners[listenPath].push(callback);

    let currentData = ref._data;
    if (!isDocRef) { // collection
        if(path === 'users') currentData = USERS;
        if(path === 'tasks') currentData = TASKS;
        if(path === 'events') currentData = EVENTS;
    }

    if (isDocRef) callback({ id: ref.id, exists: () => !!currentData, data: () => currentData });
    else callback({ docs: (currentData || []).map((doc: any) => ({ id: doc.id, data: () => doc })) });

    return () => {
        const index = firestoreListeners[listenPath].indexOf(callback);
        if (index > -1) firestoreListeners[listenPath].splice(index, 1);
    };
};

export const getDocs = async (collectionRef: any) => ({
    docs: collectionRef._data.map((doc: any) => ({ id: doc.id, data: () => doc })),
    empty: collectionRef._data.length === 0,
});

export const getDoc = async (docRef: any) => ({
    id: docRef.id,
    exists: () => !!docRef._data,
    data: () => docRef._data,
});

export const deleteDoc = async (docRef: any) => {
    let collectionData;
    if (docRef._collectionPath === 'users') { USERS = USERS.filter(u => u.uid !== docRef.id); collectionData = USERS; }
    if (docRef._collectionPath === 'tasks') { TASKS = TASKS.filter(t => t.id !== docRef.id); collectionData = TASKS; }
    if (docRef._collectionPath === 'events') { EVENTS = EVENTS.filter(e => e.id !== docRef.id); collectionData = EVENTS; }
    
    notifyListeners(docRef._collectionPath, collectionData);
    notifyListeners(docRef.path, null);
};

export const updateDoc = async (docRef: any, data: any) => {
    let target;
    let collectionData;
    if (docRef._collectionPath === 'users') { target = USERS.find(u => u.uid === docRef.id); collectionData = USERS; }
    if (docRef._collectionPath === 'tasks') { target = TASKS.find(t => t.id === docRef.id); collectionData = TASKS; }
    if (docRef._collectionPath === 'events') { target = EVENTS.find(e => e.id === docRef.id); collectionData = EVENTS; }
    
    if (target) Object.assign(target, data);
    
    notifyListeners(docRef._collectionPath, collectionData);
    notifyListeners(docRef.path, target);
};

export const setDoc = async (docRef: any, data: any, options?: any) => {
    let collectionRef: any[] | null = null, idField = 'id', collectionData;
    if (docRef._collectionPath === 'users') { collectionRef = USERS; idField = 'uid'; collectionData = USERS; }
    if (docRef._collectionPath === 'tasks') { collectionRef = TASKS; collectionData = TASKS; }
    if (docRef._collectionPath === 'events') { collectionRef = EVENTS; collectionData = EVENTS; }
    if (docRef._collectionPath === 'settings') {
        SETTINGS[docRef.id] = (options && options.merge) ? { ...SETTINGS[docRef.id], ...data } : data;
        notifyListeners(docRef.path, SETTINGS[docRef.id]);
        return;
    }

    if (collectionRef) {
        const index = collectionRef.findIndex(d => d[idField] === docRef.id);
        let newDocData;
        if (index > -1) {
            newDocData = collectionRef[index] = (options && options.merge) ? { ...collectionRef[index], ...data } : { ...data, [idField]: docRef.id, id: docRef.id };
        } else {
            newDocData = { ...data, [idField]: docRef.id, id: docRef.id };
            collectionRef.push(newDocData);
        }
        notifyListeners(docRef._collectionPath, collectionData);
        notifyListeners(docRef.path, newDocData);
    }
};

export const addDoc = async (collectionRef: any, data: any) => {
    const newId = `new_${collectionRef.path}_${Date.now()}`;
    const newData = { ...data, id: newId };
    collectionRef._data.push(newData);
    notifyListeners(collectionRef.path, collectionRef._data);
    return doc(collectionRef, newId);
};

// -- Mock Storage --
export const getStorage = () => ({ _isMock: true });
export const ref = (_storage: any, path: string) => ({ _path: path });
export const uploadBytes = async (ref: any, file: File) => {
    const url = URL.createObjectURL(file);
    return { ref: { ...ref, _url: url } };
};
export const getDownloadURL = async (ref: any) => ref._url || `https://via.placeholder.com/150/0000FF/FFFFFF?text=MockFile`;
export const deleteObject = async(ref: any) => console.log(`(MOCK) Deleted object at ${ref._path}`);
export const storage = getStorage();

// Other exports for compatibility
export const initializeApp = (config: any, name?: string) => ({ name: name || '[MOCK_APP]' });
export const deleteApp = async (app: any) => {
    console.log(`(MOCK) App ${app.name || 'instance'} has been deleted.`);
};
export const enableIndexedDbPersistence = async () => {};
export const CACHE_SIZE_UNLIMITED = -1;
