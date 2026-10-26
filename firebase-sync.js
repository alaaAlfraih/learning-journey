import { firebaseConfig } from './firebase-config.js';
const KEY = 'learning-journey-v1';
const status = document.getElementById('syncStatus');
const login = document.getElementById('loginBtn');
const logout = document.getElementById('logoutBtn');
const setStatus = text => { status.textContent = text; };
const readLocal = () => JSON.parse(localStorage.getItem(KEY) || '{}');
const stable = value => JSON.stringify(value);
function applyProgress(progress) {
  localStorage.setItem(KEY, stable(progress));
  window.dispatchEvent(new CustomEvent('journey:remote', { detail: progress }));
}
function downloadBackup(progress) {
  const a = document.createElement('a');
  const blob = new Blob([JSON.stringify(progress, null, 2)], {type:'application/json'});
  a.href = URL.createObjectURL(blob);
  a.download = 'learning-journey-before-sync.json';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
if (!firebaseConfig?.apiKey || firebaseConfig.apiKey.startsWith('PASTE_')) {
  setStatus('وضع محلي · فعّلي Firebase');
  login.onclick = () => alert('أضيفي إعدادات Firebase أولًا.');
} else {
  const [{initializeApp}, authApi, dbApi] = await Promise.all([
    import('https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js'),
    import('https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js'),
    import('https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js')
  ]);
  const app = initializeApp(firebaseConfig);
  const auth = authApi.getAuth(app);
  const db = dbApi.getFirestore(app);
  const provider = new authApi.GoogleAuthProvider();
  let user = null;
  let unsubscribe = null;
  let timer = null;
  let loading = false;
  let lastSynced = '';
  let pendingLocal = false;
  const refFor = uid => dbApi.doc(db, 'users', uid, 'private', 'learningJourney');
  login.onclick = async () => {
    try { await authApi.signInWithPopup(auth, provider); }
    catch (e) {
      if (e.code === 'auth/popup-blocked') await authApi.signInWithRedirect(auth, provider);
      else alert('تعذّر تسجيل الدخول: ' + e.message);
    }
  };
  logout.onclick = async () => {
    clearTimeout(timer);
    if (unsubscribe) unsubscribe();
    await authApi.signOut(auth);
    // Keep local progress on sign-out. No automatic reload.
    setStatus('تم تسجيل الخروج · تقدمك المحلي محفوظ');
  };
  authApi.getRedirectResult(auth).catch(e => setStatus('خطأ الدخول: ' + e.code));
  authApi.onAuthStateChanged(auth, async current => {
    clearTimeout(timer);
    if (unsubscribe) { unsubscribe(); unsubscribe = null; }
    user = current;
    if (!user) {
      login.classList.remove('hidden');
      logout.classList.add('hidden');
      setStatus('وضع محلي · سجّلي الدخول للمزامنة');
      return;
    }
    login.classList.add('hidden');
    logout.classList.remove('hidden');
    setStatus('جارٍ فحص بيانات الحساب...');
    loading = true;
    try {
      const ref = refFor(user.uid);
      const snap = await dbApi.getDoc(ref);
      if (auth.currentUser?.uid !== user.uid) return;
      const local = readLocal();
      const remote = snap.data()?.progress;
      if (remote && stable(remote) !== stable(local)) {
        // Never silently discard either version.
        downloadBackup(local);
        const useCloud = confirm('وجدنا اختلافًا بين تقدم الجهاز والسحابة. تم تنزيل نسخة احتياطية من تقدم هذا الجهاز. اضغطي موافق لاستخدام السحابة، أو إلغاء لرفع تقدم هذا الجهاز بدلًا منها.');
        if (useCloud) { applyProgress(remote); lastSynced = stable(remote); }
        else {
          await dbApi.setDoc(ref, {progress:local, updatedAt:new Date().toISOString()});
          lastSynced = stable(local);
        }
      } else if (remote) {
        lastSynced = stable(remote);
      } else {
        await dbApi.setDoc(ref, {progress:local, updatedAt:new Date().toISOString()});
        lastSynced = stable(local);
      }
      setStatus('تمت المزامنة ✓');
      unsubscribe = dbApi.onSnapshot(ref, snap => {
        const cloud = snap.data()?.progress;
        if (!cloud || loading || pendingLocal || timer) return;
        const encoded = stable(cloud);
        if (encoded === stable(readLocal())) { lastSynced = encoded; return; }
        if (encoded === lastSynced) return;
        // Updates from another device update the UI without page reload.
        applyProgress(cloud);
        lastSynced = encoded;
        setStatus('تم تحديث تقدمك من السحابة ✓');
      }, err => setStatus('خطأ المزامنة: ' + err.code));
    } catch (e) { setStatus('تعذرت المزامنة: ' + (e.code || e.message)); }
    finally { loading = false; }
  });
  window.addEventListener('journey:changed', () => {
    if (!user || loading) return;
    pendingLocal = true;
    clearTimeout(timer);
    timer = setTimeout(async () => {
      timer = null;
      if (!user) return;
      const current = readLocal();
      const encoded = stable(current);
      if (encoded === lastSynced) { pendingLocal = false; return; }
      setStatus('جارٍ حفظ التقدم...');
      try {
        await dbApi.setDoc(refFor(user.uid), {progress:current, updatedAt:new Date().toISOString()});
        lastSynced = encoded;
        setStatus('تمت المزامنة ✓');
      } catch (e) { setStatus('تعذر الحفظ: ' + (e.code || e.message)); }
      finally { pendingLocal = false; }
    }, 1000);
  });
}
