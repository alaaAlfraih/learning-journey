// Configure Firebase in firebase-config.js first. This module is optional:
// without valid configuration the study dashboard still works locally.
import { firebaseConfig } from "./firebase-config.js";
const status = document.getElementById("syncStatus");
const login = document.getElementById("loginBtn");
const logout = document.getElementById("logoutBtn");
const KEY = "learning-journey-v1";
if (!firebaseConfig?.apiKey || firebaseConfig.apiKey.startsWith("PASTE_")) {
  status.textContent = "وضع محلي · فعّلي Firebase";
  login.onclick = () => alert("أضيفي إعدادات مشروع Firebase في ملف firebase-config.js أولًا.");
} else {
  const [{ initializeApp }, { getAuth, GoogleAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, onAuthStateChanged, signOut }, { getFirestore, doc, getDoc, setDoc, onSnapshot }] = await Promise.all([
    import("https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js"),
    import("https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js"),
    import("https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js")
  ]);
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);
  const provider = new GoogleAuthProvider();
  let user = null, unsubscribe = null, timer = null, applyingRemote = false, lastRemote = "";
  const setStatus = msg => status.textContent = msg;
  login.onclick = async () => {
    try {
      await signInWithPopup(auth, provider);
    } catch (e) {
      if (e.code === "auth/popup-blocked") {
        await signInWithRedirect(auth, provider);
      } else {
        alert("تعذّر تسجيل الدخول: " + e.message);
      }
    }
  };
  logout.onclick = async () => {
    if (unsubscribe) unsubscribe();
    await signOut(auth);
    location.reload();
  };
  getRedirectResult(auth).catch(e => setStatus("خطأ تسجيل الدخول: " + e.code));
  const remoteRef = uid => doc(db, "users", uid, "private", "learningJourney");
  onAuthStateChanged(auth, async current => {
    user = current;
    if (unsubscribe) { unsubscribe(); unsubscribe = null; }
    if (!user) {
      login.classList.remove("hidden");
      logout.classList.add("hidden");
      setStatus("وضع محلي · سجّلي الدخول للمزامنة");
      return;
    }
    login.classList.add("hidden");
    logout.classList.remove("hidden");
    setStatus("جارٍ تحميل تقدمك...");
    try {
      const ref = remoteRef(user.uid);
      const snap = await getDoc(ref);
      if (snap.exists() && snap.data().progress) {
        // On first login, cloud data is authoritative if it exists.
        const remote = snap.data().progress;
        applyingRemote = true;
        localStorage.setItem(KEY, JSON.stringify(remote));
        lastRemote = JSON.stringify(remote);
        applyingRemote = false;
        setStatus("تمت المزامنة · " + (user.displayName || "حسابك"));
        if (sessionStorage.getItem("journey-loaded-" + user.uid) !== lastRemote) {
          sessionStorage.setItem("journey-loaded-" + user.uid, lastRemote);
          location.reload();
          return;
        }
      }
      const local = JSON.parse(localStorage.getItem(KEY) || "{}");
      if (!snap.exists()) await setDoc(ref, { progress: local, updatedAt: new Date().toISOString() });
      lastRemote = JSON.stringify(local);
      setStatus("تم حفظ تقدمك بالسحابة");
      unsubscribe = onSnapshot(ref, snapshot => {
        const remote = snapshot.data()?.progress;
        if (!remote) return;
        const encoded = JSON.stringify(remote);
        if (encoded !== lastRemote && !timer) {
          applyingRemote = true;
          localStorage.setItem(KEY, encoded);
          applyingRemote = false;
          location.reload();
        }
      }, err => setStatus("مشكلة مزامنة: " + err.code));
    } catch (e) {
      setStatus("تعذرت المزامنة: " + (e.code || e.message));
    }
  });
  window.addEventListener("journey:changed", () => {
    if (!user || applyingRemote) return;
    clearTimeout(timer);
    timer = setTimeout(async () => {
      try {
        const progress = JSON.parse(localStorage.getItem(KEY) || "{}");
        lastRemote = JSON.stringify(progress);
        setStatus("جارٍ حفظ التقدم...");
        await setDoc(remoteRef(user.uid), { progress, updatedAt: new Date().toISOString() });
        setStatus("تمت المزامنة ✓");
      } catch (e) { setStatus("لم تُحفظ التغييرات بالسحابة: " + (e.code || e.message)); }
      finally { timer = null; }
    }, 900);
  });
}
