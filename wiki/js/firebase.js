// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { initializeFirestore, collection, setDoc, addDoc, getDocs, getDoc, doc, Timestamp, query, orderBy, getCountFromServer, startAfter, limit, deleteDoc, updateDoc, where } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getStorage, ref, getDownloadURL, deleteObject, uploadBytes, uploadBytesResumable } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged, createUserWithEmailAndPassword, sendPasswordResetEmail, sendEmailVerification } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyBm2NkGGMEo_TN0u7VRgNhZmTvflJlfOzY",
    authDomain: "nemuwiki-f3a72.firebaseapp.com",
    projectId: "nemuwiki-f3a72",
    storageBucket: "nemuwiki-f3a72.appspot.com",
    messagingSenderId: "125964020971",
    appId: "1:125964020971:web:63803427ae9165e43e22ae",
    measurementId: "G-PCFNLEDQ00"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = initializeFirestore(app, { experimentalForceLongPolling: true });
const storage = getStorage(app, "gs://nemuwiki-f3a72.appspot.com");
const auth = getAuth();
const fb = {}
let authListner;


//문서
fb.post = {
    random: async () => {
        let count = Math.min((await getCountFromServer(collection(db, "postList"))).data().count, 100);
        let result = await getDocs(query(
            collection(db, "postList"),
            where('hidden', '==', false),
            orderBy('timestamp'),
            limit(count)
        ));
        return result.docs[Math.round(Math.random() * (result.docs.length - 1))].id;
    },
    insertOne: async data => {
        try {
            if (data && data.timestamp) data.timestamp = Timestamp.fromDate(data.timestamp);
            return await addDoc(collection(db, "postList"), {
                board_name: "",
                category: "",
                title: "",
                contents: [],
                hidden: false,
                use: true,
                timestamp: Timestamp.fromDate(new Date()),
                ...data
            });
        } catch (e) {
            dev.error("Error adding document: ", e);
        }
    },
    deleteOne: async id => await deleteDoc(doc(db, "postList", id)),
    updateOne: async (id, data) => {
        if (data && data.timestamp) data.timestamp = Timestamp.fromDate(data.timestamp);
        if (data && data.updated_timestamp) data.updated_timestamp = Timestamp.fromDate(data.updated_timestamp);
        return await updateDoc(doc(db, "postList", id), data)
    },
    selectOne: async id => await getDoc(doc(db, "postList", id)),
    list: (search = {}, hidden = false, operator = 'contains') => {
        let param_base = [
            collection(db, "postList"),
            where('hidden', '==', hidden)
        ], params, documentSnapshots, isEnd = false;
        for (let field in search) {
            if (search[field] == '' || search[field] == undefined) continue;
            switch (operator) {
                case 'contains':
                    param_base.push(where(field, '>=', search[field]));
                    param_base.push(where(field, '<=', search[field] + "\uf8ff"));
                    break;
                case 'equal':
                    param_base.push(where(field, '==', search[field]));
                    break;
                default:
                    param_base.push(where(field, operator, search[field]));
                    break;
            }
        }

        return {
            next: async (docs = documentSnapshots?.docs) => {
                if (isEnd) return [];
                params = param_base.slice();
                if (docs && docs?.length != 0) params.push(startAfter(docs[docs.length - 1]));
                params.push(limit(25));
                documentSnapshots = await getDocs(query.apply(undefined, params));
                if (documentSnapshots.docs.length < 25) isEnd = true;
                return documentSnapshots.docs;
            }
        }
    }
};

//분류명
fb.board = {
    insertOne: async data => {
        try {
            return await addDoc(collection(db, "boardList"), {
                hidden: false,
                type: 0,
                name: "",
                depth: 1,
                parent: "",
                use: true,
                ...data
            });
        } catch (e) {
            dev.error("Error adding document: ", e);
        }
    },
    deleteOne: async id => await deleteDoc(doc(db, "boardList", id)),
    updateOne: async (id, data) => await updateDoc(doc(db, "boardList", id), data),
    list: async () => await getDocs(collection(db, "boardList")),
    list_paginator: (search = {}) => {
        let param_base = [
            collection(db, "boardList")
        ], params, documentSnapshots, isEnd = false;
        for (let field in search) {
            if (search[field] == '') continue;
            param_base.push(where(field, '>=', search[field]));
            param_base.push(where(field, '<=', search[field] + "\uf8ff"));

        }

        return {
            next: async (docs = documentSnapshots?.docs) => {
                if (isEnd) return [];
                params = param_base.slice();
                if (docs && docs?.length != 0) params.push(startAfter(docs[docs.length - 1]));
                params.push(limit(25));
                documentSnapshots = await getDocs(query.apply(undefined, params));
                if (documentSnapshots.docs.length < 25) isEnd = true;
                return documentSnapshots.docs;
            }
        }
    }
}

//공지사항
fb.notice = {
    insertOne: async data => {
        try {
            return await addDoc(collection(db, "notice"), {
                title: '',
                content: '',
                timestamp: Timestamp.fromDate(new Date()),
                use: true,
                ...data
            });
        } catch (e) {
            dev.error("Error adding document: ", e);
        }
    },
    updateOne: async (id, data) => await updateDoc(doc(db, "notice", id), data),
    deleteOne: async id => await deleteDoc(doc(db, "notice", id)),
    getNewest: async () => await getDocs(query(collection(db, "notice"), where('use', '==', true), orderBy('timestamp'), limit(1))),
    list: () => {
        let documentSnapshots, isEnd = false;

        return {
            next: async (docs = documentSnapshots?.docs) => {
                if (isEnd) return [];
                let params = [collection(db, "notice"), orderBy('timestamp')];
                if (docs && docs?.length != 0) params.push(startAfter(docs[docs.length - 1]));
                params.push(limit(25));
                documentSnapshots = await getDocs(query.apply(undefined, params));
                if (documentSnapshots.docs.length < 25) isEnd = true;
                return documentSnapshots.docs;
            }
        }
    }
}

//카테고리
fb.categories = {
    insertOne: async data => {
        try {
            return await addDoc(collection(db, "categories"), {
                hidden: false,
                name: "",
                use: true,
                ...data
            });
        } catch (e) {
            dev.error("Error adding document: ", e);
        }
    },
    deleteOne: async id => await deleteDoc(doc(db, "categories", id)),
    updateOne: async (id, data) => await updateDoc(doc(db, "categories", id), data),
    list: async () => await getDocs(collection(db, "categories")),
    list_paginator: (search = {}) => {
        let param_base = [
            collection(db, "categories")
        ], params, documentSnapshots, isEnd = false;
        for (let field in search) {
            if (search[field] == '') continue;
            param_base.push(where(field, '>=', search[field]));
            param_base.push(where(field, '<=', search[field] + "\uf8ff"));

        }

        return {
            next: async (docs = documentSnapshots?.docs) => {
                if (isEnd) return [];
                params = param_base.slice();
                if (docs && docs?.length != 0) params.push(startAfter(docs[docs.length - 1]));
                params.push(limit(25));
                documentSnapshots = await getDocs(query.apply(undefined, params));
                if (documentSnapshots.docs.length < 25) isEnd = true;
                return documentSnapshots.docs;
            }
        }
    }
}

//저장소
fb.storage = {
    getUrl: async fileName => await getDownloadURL(ref(storage, fileName)),
    delete: async fileName => await deleteObject(ref(storage, fileName)),
    upload: async (fileName, file) => await uploadBytes(ref(storage, fileName), file),
    uploadResumable: (fileName, file) => uploadBytesResumable(ref(storage, fileName), file)
};

//인증
fb.auth = {
    login: async (email, password) => await signInWithEmailAndPassword(auth, email, password),
    logout: async () => await signOut(auth),
    check: (signInCallback, signOutCallback) => {
        if (typeof authListner == 'function') authListner();
        authListner = onAuthStateChanged(auth, (user) => {
            if (user) signInCallback(user);
            else signOutCallback();
        });
    },
    checkAdmin: (callback) => {
        if (typeof authListner == 'function') authListner();
        authListner = onAuthStateChanged(auth, async (user) => {
            try {
                let infos;
                if (user == undefined) return callback(false, user);
                if ((infos = await getDoc(doc(db, "users", user.uid))) == undefined) return callback(false, user);
                if (infos.data().level !== 0) return callback(false, user);
                return callback(true, user);
            } catch (e) {
                firebaseErrorHandler(e);
            }
        });
    },
    signup: async (email, password) => {
        let creditional = await createUserWithEmailAndPassword(auth, email, password);
        let user = creditional?.user;
        if (user == undefined) throw { code: 'signup failed...' };
        await setDoc(doc(db, "users", user.uid), {
            email: email,
            level: 5
        });
        return user;
    },
    users: (search = {}) => {
        let param_base = [
            collection(db, "users")
        ], params, documentSnapshots, isEnd = false;
        for (let field in search) {
            if (search[field] == '') continue;
            param_base.push(where(field, '>=', search[field]));
            param_base.push(where(field, '<=', search[field] + "\uf8ff"));

        }

        return {
            next: async (docs = documentSnapshots?.docs) => {
                if (isEnd) return [];
                params = param_base.slice();
                if (docs && docs?.length != 0) params.push(startAfter(docs[docs.length - 1]));
                params.push(limit(25));
                documentSnapshots = await getDocs(query.apply(undefined, params));
                if (documentSnapshots.docs.length < 25) isEnd = true;
                return documentSnapshots.docs;
            }
        }
    },
    getUser: async () => await getDoc(doc(db, "users", auth.currentUser?.uid)),
    getAuth: () => auth.currentUser,
    updateUser: async (id, data) => await updateDoc(doc(db, "users", id), data),
    sendPasswordResetEmail: async email => await sendPasswordResetEmail(auth, email),
    sendEmailVerification: async () => await sendEmailVerification(auth.currentUser)
}

export default fb;