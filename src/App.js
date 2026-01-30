import React, { useRef, useState, useEffect } from "react";
import "./App.css";

import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  query,
  orderBy,
  limit,
  limitToLast,
  addDoc,
  serverTimestamp,
  getDocs,
  updateDoc,
  where,
} from "firebase/firestore";

import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
} from "firebase/auth";

import { useAuthState } from "react-firebase-hooks/auth";
import { useCollectionData } from "react-firebase-hooks/firestore";

/* 🔹 Firebase config */
const firebaseConfig = {
  apiKey: "AIzaSyC0WWw-y6UgnlPcnoGznokM4trWThG9eRY",
  authDomain: "chatapp-5847d.firebaseapp.com",
  projectId: "chatapp-5847d",
  storageBucket: "chatapp-5847d.appspot.com",
  messagingSenderId: "1058214781304",
  appId: "1:1058214781304:web:3222c10e277cefc608288d",
};

/* 🔹 Initialize Firebase */
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const firestore = getFirestore(app);

/* ================= APP ================= */

function App() {
  const [user] = useAuthState(auth);

  return (
    <div className="App">
      <header>
        <h1>Zero Chat</h1>
        <SignOut />
      </header>

      <section>{user ? <ChatRoom /> : <SignIn />}</section>
    </div>
  );
}

/* ================= SIGN IN ================= */

function SignIn() {
  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  return (
    <>
      <button className="sign-in" onClick={signInWithGoogle}>
        Sign in with Google
      </button>
      <p>Do not violate the community guidelines.</p>
    </>
  );
}

/* ================= SIGN OUT ================= */

function SignOut() {
  return (
    auth.currentUser && (
      <button className="sign-out" onClick={() => signOut(auth)}>
        Sign Out
      </button>
    )
  );
}

/* ================= CHAT ROOM ================= */

function ChatRoom() {
  const dummy = useRef();
  const [roomId, setRoomId] = useState(null);
  const [formValue, setFormValue] = useState("");

  /* 🔹 Find or create a room (MAX 2 USERS) */
  useEffect(() => {
    const getOrCreateRoom = async () => {
      const roomsRef = collection(firestore, "rooms");

      const q = query(
        roomsRef,
        where("usersCount", "<", 2),
        limit(1) // ✅ FIXED
      );

      const snapshot = await getDocs(q);

      if (!snapshot.empty) {
        const room = snapshot.docs[0];
        await updateDoc(room.ref, {
          usersCount: room.data().usersCount + 1,
        });
        setRoomId(room.id);
      } else {
        const newRoom = await addDoc(roomsRef, {
          usersCount: 1,
          createdAt: serverTimestamp(),
        });
        setRoomId(newRoom.id);
      }
    };

    getOrCreateRoom();
  }, []);

  /* ✅ Hooks must ALWAYS run */
  const messagesRef = roomId
    ? collection(firestore, "rooms", roomId, "messages")
    : null;

  const messagesQuery = messagesRef
    ? query(messagesRef, orderBy("createdAt"), limitToLast(100))
    : null;

  const [messages] = useCollectionData(messagesQuery, {
    idField: "id",
  });

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!roomId) return;

    const { uid, photoURL } = auth.currentUser;

    await addDoc(messagesRef, {
      text: formValue,
      createdAt: serverTimestamp(),
      uid,
      photoURL,
    });

    setFormValue("");
    dummy.current.scrollIntoView({ behavior: "smooth" });
  };

  if (!roomId) {
    return <p>Finding a chat partner...</p>;
  }

  return (
    <>
      <main>
        {messages &&
          messages.map((msg) => (
            <ChatMessage key={msg.id} message={msg} />
          ))}
        <span ref={dummy}></span>
      </main>

      <form onSubmit={sendMessage}>
        <input
          value={formValue}
          onChange={(e) => setFormValue(e.target.value)}
          placeholder="say something nice"
        />
        <button type="submit" disabled={!formValue}>
          🕊️
        </button>
      </form>
    </>
  );
}

/* ================= MESSAGE ================= */

function ChatMessage({ message }) {
  const { text, uid, photoURL } = message;
  const messageClass =
    uid === auth.currentUser.uid ? "sent" : "received";

  return (
    <div className={`message ${messageClass}`}>
      <img
        src={
          photoURL ||
          "https://api.dicebear.com/7.x/identicon/svg"
        }
        alt="avatar"
      />
      <p>{text}</p>
    </div>
  );
}

export default App;
