/* =========================================================
   클라우드 계정 · 동기화 (Firebase) — HAE
   config.js의 firebase 값이 비어 있으면 모든 함수가 조용히 no-op → 앱은 로컬로 정상 동작.
   - 로그인: Google(팝업) · 이메일/비밀번호(가입·로그인·비밀번호 재설정)
   - 동기화(Firestore):
       users/{uid}                 → state: 내 정보·내 사람·코인·가족 등 (이 계정 몫만)
       users/{uid}/results/{id}    → 저장한 풀이 결과
   Firestore를 아직 안 만들었어도 로그인은 그대로 동작해요(동기화만 건너뜀).
   ========================================================= */

import { getConfig, isCloudEnabled } from "./config.js";

export { isCloudEnabled };

const SDK = "https://www.gstatic.com/firebasejs/10.12.2";
let _fb = null;

async function fb() {
  if (_fb) return _fb;
  if (!isCloudEnabled()) return null;
  const [appM, authM, fsM] = await Promise.all([
    import(/* @vite-ignore */ `${SDK}/firebase-app.js`),
    import(/* @vite-ignore */ `${SDK}/firebase-auth.js`),
    import(/* @vite-ignore */ `${SDK}/firebase-firestore.js`),
  ]);
  const app = appM.initializeApp(getConfig().firebase);
  const auth = authM.getAuth(app);
  try { auth.languageCode = "ko"; } catch { /* ignore */ }
  try { await authM.setPersistence(auth, authM.browserLocalPersistence); } catch { /* ignore */ }
  const db = fsM.getFirestore(app);
  _fb = { app, auth, db, A: authM, F: fsM };
  return _fb;
}

/* 앱 쪽에서 쓰는 사용자 모양으로 맞춰 줌 */
function shape(u) {
  if (!u) return null;
  return {
    id: u.uid, uid: u.uid, email: u.email || "", anonymous: !!u.isAnonymous,
    provider: (u.providerData[0] && u.providerData[0].providerId) || (u.isAnonymous ? "anonymous" : "password"),
    user_metadata: { name: u.displayName || "", avatar: u.photoURL || "" },
  };
}

/** 앱 시작 시 1회 — 로그인 상태 복원 */
export async function handleRedirect() {
  if (!isCloudEnabled()) return null;
  return getUser();
}

/* 관리자 판정용 — 지금 로그인한 계정의 (인증된) 이메일을 기억 */
function rememberMail(u) {
  try {
    const ok = u && u.email && (u.emailVerified || (u.providerData || []).some((p) => p.providerId === "google.com"));
    if (ok) localStorage.setItem("str.cloudmail.v1", u.email.toLowerCase()); else localStorage.removeItem("str.cloudmail.v1");
  } catch { /* ignore */ }
}

export async function getUser() {
  const f = await fb().catch(() => null);
  if (!f) return null;
  try { await f.auth.authStateReady(); } catch { /* ignore */ }
  rememberMail(f.auth.currentUser);
  return shape(f.auth.currentUser);
}

/* ---- 로그인 수단 ---- */
const KO_ERR = {
  "auth/invalid-email": "이메일 주소 형식이 맞지 않아요.",
  "auth/missing-password": "비밀번호를 입력해 주세요.",
  "auth/weak-password": "비밀번호는 6자 이상으로 해 주세요.",
  "auth/email-already-in-use": "이미 가입된 이메일이에요. 로그인해 주세요.",
  "auth/invalid-credential": "이메일 또는 비밀번호가 맞지 않아요.",
  "auth/wrong-password": "비밀번호가 맞지 않아요.",
  "auth/user-not-found": "가입되지 않은 이메일이에요.",
  "auth/too-many-requests": "시도가 너무 많아요. 잠시 뒤 다시 해 주세요.",
  "auth/popup-closed-by-user": "로그인 창이 닫혔어요.",
  "auth/cancelled-popup-request": "로그인 창이 닫혔어요.",
  "auth/popup-blocked": "팝업이 막혔어요. 브라우저에서 팝업을 허용해 주세요.",
  "auth/unauthorized-domain": "이 주소는 Firebase에 허용되지 않았어요. Firebase 콘솔 › Authentication › 설정 › 승인된 도메인에 이 사이트 주소를 추가해 주세요.",
  "auth/network-request-failed": "인터넷 연결을 확인해 주세요.",
  "auth/operation-not-allowed": "Firebase 콘솔에서 이 로그인 방식을 켜 주세요.",
  "auth/user-mismatch": "지금 로그인한 계정과 다른 Google 계정을 골랐어요. 같은 계정으로 다시 해 주세요.",
  "auth/requires-recent-login": "보안을 위해 다시 로그인한 뒤 해 주세요.",
  "auth/expired-action-code": "링크가 만료됐어요. 비밀번호 찾기를 다시 눌러 새 메일을 받아 주세요.",
  "auth/invalid-action-code": "이미 쓴 링크이거나 잘못된 링크예요. 비밀번호 찾기를 다시 눌러 주세요.",
  "auth/user-disabled": "사용이 중지된 계정이에요.",
};
const err = (e) => ({ error: KO_ERR[e && e.code] || `잠시 문제가 생겼어요${e && e.code ? ` (${e.code})` : ""}. 다시 해 주세요.` });

export async function loginGoogle() {
  const f = await fb().catch(() => null);
  if (!f) return { error: "클라우드 설정이 필요해요." };
  try {
    const p = new f.A.GoogleAuthProvider();
    p.setCustomParameters({ prompt: "select_account" });
    const r = await f.A.signInWithPopup(f.auth, p);
    rememberMail(r.user);
    return { user: shape(r.user) };
  } catch (e) { return err(e); }
}

export async function loginEmail(email, password) {
  const f = await fb().catch(() => null);
  if (!f) return { error: "클라우드 설정이 필요해요." };
  try { const r = await f.A.signInWithEmailAndPassword(f.auth, String(email).trim(), password); rememberMail(r.user); return { user: shape(r.user) }; }
  catch (e) { return err(e); }
}

export async function signupEmail(email, password, name) {
  const f = await fb().catch(() => null);
  if (!f) return { error: "클라우드 설정이 필요해요." };
  try {
    const r = await f.A.createUserWithEmailAndPassword(f.auth, String(email).trim(), password);
    if (name) { try { await f.A.updateProfile(r.user, { displayName: String(name).slice(0, 20) }); } catch { /* ignore */ } }
    return { user: { ...shape(r.user), user_metadata: { name: name || "" } } };
  } catch (e) { return err(e); }
}

export async function resetPassword(email) {
  const f = await fb().catch(() => null);
  if (!f) return { error: "클라우드 설정이 필요해요." };
  try {
    const back = location.origin + location.pathname;
    try { await f.A.sendPasswordResetEmail(f.auth, String(email).trim(), { url: back }); }
    catch (e1) { if (e1 && /continue|domain|url/i.test(String(e1.code || ""))) await f.A.sendPasswordResetEmail(f.auth, String(email).trim()); else throw e1; }
    return { ok: true };
  }
  catch (e) { return err(e); }
}

/* 예전 화면 호환 — 카카오·네이버는 Firebase 기본 제공이 아님 */
export async function loginKakao() { return { error: "카카오 로그인은 준비 중이에요. Google이나 이메일로 로그인해 주세요." }; }
export async function loginNaver() { return { error: "네이버 로그인은 준비 중이에요. Google이나 이메일로 로그인해 주세요." }; }

export async function logout() {
  const f = await fb().catch(() => null);
  if (f) { try { await f.A.signOut(f.auth); } catch { /* ignore */ } }
  rememberMail(null);
}

/* ---- 계정 데이터 동기화 (내 정보·내 사람·코인 등) ---- */
const STATE_KEYS = ["str.mybirth.v1", "str.people.v1", "str.family.v1", "str.wallet.v1", "str.avatar.v1"];
const read = (k) => { try { return JSON.parse(localStorage.getItem(k) || "{}") || {}; } catch { return {}; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ } };

/** 이 기기에서 pid(계정 프로필) 몫만 모으기 */
export function collectState(pid) {
  const out = {};
  STATE_KEYS.forEach((k) => { const m = read(k); if (m[pid] != null) out[k] = m[pid]; });
  return out;
}

export async function pushState(pid) {
  const u = await getUser(); if (!u) return false;
  const f = await fb();
  try {
    await f.F.setDoc(f.F.doc(f.db, "users", u.uid), { state: JSON.stringify(collectState(pid)), name: u.user_metadata.name || "", email: u.email || "", updatedAt: Date.now() }, { merge: true });
    return true;
  } catch { return false; }
}

/** 클라우드 → 이 기기. 처음 로그인(클라우드 비어 있음)이면 게스트로 쓰던 정보(코인 제외)를 계정으로 옮겨 옴 */
export async function pullState(pid) {
  const u = await getUser(); if (!u) return { ok: false };
  const f = await fb();
  if (await isBlocked(u.uid)) { await kickBlocked(); return { ok: false, blocked: true }; }
  let cloud = null;
  try { const s = await f.F.getDoc(f.F.doc(f.db, "users", u.uid)); if (s.exists() && s.data().state) cloud = JSON.parse(s.data().state); }
  catch { return { ok: false, offline: true }; }
  if (!cloud) {
    let moved = 0;
    STATE_KEYS.forEach((k) => { const m = read(k); if (m[pid] == null && m.guest != null && k !== "str.wallet.v1") { m[pid] = m.guest; write(k, m); moved++; } });
    await pushState(pid);
    return { ok: true, first: true, moved };
  }
  STATE_KEYS.forEach((k) => {
    if (cloud[k] == null) return;
    const m = read(k), local = m[pid];
    if (k === "str.wallet.v1" && local && typeof local === "object") {
      // 코인: 더 많은 쪽 · 열어 본 풀이: 합치기 — 어느 기기에서 열었든 유지
      const cw = cloud[k];
      const un = [...new Set([...(cw.unlocked || []), ...(local.unlocked || [])])];
      m[pid] = { ...local, ...cw, coins: Math.max(cw.coins || 0, local.coins || 0), unlocked: un };
    } else m[pid] = cloud[k];
    write(k, m);
  });
  return { ok: true };
}

/* ---- 저장한 풀이 결과 동기화 ---- */
export async function pullResults() {
  const u = await getUser(); if (!u) return [];
  const f = await fb();
  try {
    const qs = await f.F.getDocs(f.F.collection(f.db, "users", u.uid, "results"));
    return qs.docs.map((d) => { try { return JSON.parse(d.data().payload); } catch { return null; } }).filter(Boolean);
  } catch { return []; }
}

export async function pushResult(result) {
  const u = await getUser(); if (!u || !result || !result.id) return;
  const f = await fb();
  try { await f.F.setDoc(f.F.doc(f.db, "users", u.uid, "results", String(result.id)), { payload: JSON.stringify(result), updatedAt: Date.now() }); } catch { /* ignore */ }
}

export async function pushAll(results) {
  const u = await getUser(); if (!u || !results || !results.length) return;
  const f = await fb();
  try {
    const b = f.F.writeBatch(f.db);
    results.slice(0, 450).forEach((r) => b.set(f.F.doc(f.db, "users", u.uid, "results", String(r.id)), { payload: JSON.stringify(r), updatedAt: Date.now() }));
    await b.commit();
  } catch { /* ignore */ }
}

export async function deleteCloud(id) {
  const u = await getUser(); if (!u) return;
  const f = await fb();
  try { await f.F.deleteDoc(f.F.doc(f.db, "users", u.uid, "results", String(id))); } catch { /* ignore */ }
}

/* ---- 관리자: 전체 회원 보기 (Firestore 규칙에서 관리자 이메일만 읽기 허용) ---- */
export async function adminListUsers() {
  const u = await getUser(); if (!u) return { error: "먼저 로그인해 주세요." };
  const f = await fb();
  try {
    const qs = await f.F.getDocs(f.F.collection(f.db, "users"));
    return { users: qs.docs.map((d) => { const v = d.data() || {}; let st = {}; try { st = JSON.parse(v.state || "{}"); } catch { /* ignore */ } return { uid: d.id, name: v.name || "", email: v.email || "", updatedAt: v.updatedAt || 0, state: st }; }) };
  } catch (e) {
    return { error: e && e.code === "permission-denied" ? "권한이 없어요. Firestore 규칙에 관리자 이메일이 들어가 있는지, 그 이메일로 로그인했는지 확인해 주세요." : "불러오지 못했어요." };
  }
}
export async function adminUserResults(uid) {
  const f = await fb(); if (!f) return [];
  try {
    const qs = await f.F.getDocs(f.F.collection(f.db, "users", uid, "results"));
    return qs.docs.map((d) => { try { return JSON.parse(d.data().payload); } catch { return null; } }).filter(Boolean);
  } catch { return []; }
}

/* ---- 회원 탈퇴 (HAE) ----
   1) 클라우드에 저장된 내 데이터(저장한 풀이 · 내 정보 문서) 삭제
   2) Firebase 계정 삭제 — 로그인한 지 오래됐으면 본인 확인(Google 다시 로그인 / 비밀번호) 후 진행 */
export async function deleteAccount(password) {
  const f = await fb().catch(() => null);
  if (!f) return { error: "클라우드 설정이 필요해요." };
  try { await f.auth.authStateReady(); } catch { /* ignore */ }
  const user = f.auth.currentUser;
  if (!user) return { error: "먼저 로그인해 주세요." };
  const isGoogle = (user.providerData || []).some((p) => p.providerId === "google.com");
  const reauth = async () => {
    if (isGoogle) await f.A.reauthenticateWithPopup(user, new f.A.GoogleAuthProvider());
    else {
      if (!password) throw { code: "need-password" };
      await f.A.reauthenticateWithCredential(user, f.A.EmailAuthProvider.credential(user.email, password));
    }
  };
  try {
    // 언제나 먼저 본인 확인 — 그래야 '데이터만 지워지고 계정은 남는' 일이 없음
    await reauth();
    // 데이터부터 지우기 (계정을 먼저 지우면 권한이 없어져서 못 지움)
    try {
      const qs = await f.F.getDocs(f.F.collection(f.db, "users", user.uid, "results"));
      for (let i = 0; i < qs.docs.length; i += 400) {
        const b = f.F.writeBatch(f.db);
        qs.docs.slice(i, i + 400).forEach((d) => b.delete(d.ref));
        await b.commit();
      }
      await f.F.deleteDoc(f.F.doc(f.db, "users", user.uid));
    } catch { /* Firestore가 없거나 오프라인이어도 계정 삭제는 진행 */ }
    try { await f.A.deleteUser(user); }
    catch (e) {
      if (e && e.code === "auth/requires-recent-login") { await reauth(); await f.A.deleteUser(user); }
      else throw e;
    }
    rememberMail(null);
    return { ok: true, uid: user.uid };
  } catch (e) {
    if (e && e.code === "need-password") return { error: "본인 확인을 위해 비밀번호를 입력해 주세요.", needPassword: true };
    return err(e);
  }
}
export async function currentProvider() {
  const u = await getUser(); return u ? u.provider : null;
}

/* ---- 닉네임 바꾸기 (Google 로그인도 가능) ---- */
export async function setNickname(name) {
  const f = await fb().catch(() => null);
  if (!f) return { error: "클라우드 설정이 필요해요." };
  const u = f.auth.currentUser; if (!u) return { error: "먼저 로그인해 주세요." };
  const nick = String(name || "").trim().slice(0, 20);
  if (!nick) return { error: "닉네임을 입력해 주세요." };
  try { await f.A.updateProfile(u, { displayName: nick }); } catch (e) { return err(e); }
  try { await f.F.setDoc(f.F.doc(f.db, "users", u.uid), { name: nick, updatedAt: Date.now() }, { merge: true }); } catch { /* ignore */ }
  return { ok: true, name: nick };
}

/* ---- 관리자 코인 선물 (HAE) ----
   관리자가 users/{uid}/gifts/{id} 에 선물을 넣고, 받는 사람이 로그인하면 자동으로 받아서 코인에 더한 뒤 지움.
   (규칙: gifts 생성은 관리자만, 읽기·삭제는 본인만 — SETUP.md) */
export async function adminGiftCoins(uid, coins, memo) {
  const f = await fb().catch(() => null);
  if (!f || !f.auth.currentUser) return { error: "먼저 로그인해 주세요." };
  const n = Math.floor(Number(coins));
  if (!n || n < 1 || n > 1000) return { error: "코인은 1~1000개 사이로 넣어 주세요." };
  try {
    const id = "g" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    await f.F.setDoc(f.F.doc(f.db, "users", uid, "gifts", id), { coins: n, memo: String(memo || "").slice(0, 60), from: "해묘", createdAt: Date.now() });
    return { ok: true, id };
  } catch (e) {
    return { error: e && e.code === "permission-denied" ? "선물 권한이 없어요. Firestore 규칙에 gifts 줄이 들어가 있는지 확인해 주세요." : "선물하지 못했어요." };
  }
}
/** 나에게 온 선물 받기 — [{id, coins, memo}] 를 돌려주고 클라우드에선 지움 */
export async function takeGifts() {
  const f = await fb().catch(() => null);
  const u = f && f.auth.currentUser; if (!u) return [];
  try {
    const qs = await f.F.getDocs(f.F.collection(f.db, "users", u.uid, "gifts"));
    const out = qs.docs.map((d) => ({ id: d.id, coins: Number((d.data() || {}).coins) || 0, memo: (d.data() || {}).memo || "" })).filter((g) => g.coins > 0);
    for (const d of qs.docs) { try { await f.F.deleteDoc(d.ref); } catch { /* ignore */ } }
    return out;
  } catch { return []; }
}


/* ---- 관리자: 회원 삭제 (HAE) ----
   브라우저에선 남의 '로그인 계정' 자체는 못 지워서(서버 권한 필요),
   ① 그 회원의 클라우드 데이터(내 정보·저장한 풀이·선물) 전부 삭제
   ② blocked/{uid} 표시 → 그 계정으로 로그인해도 바로 로그아웃 + 안내
   로그인 기록까지 완전히 없애려면 Firebase 콘솔 › Authentication › 사용자에서 그 이메일 삭제. */
export async function adminDeleteUser(uid, email) {
  const f = await fb().catch(() => null);
  if (!f || !f.auth.currentUser) return { error: "먼저 로그인해 주세요." };
  try {
    await f.F.setDoc(f.F.doc(f.db, "blocked", uid), { at: Date.now(), email: email || "" });
    for (const sub of ["results", "gifts"]) {
      try {
        const qs = await f.F.getDocs(f.F.collection(f.db, "users", uid, sub));
        for (let i = 0; i < qs.docs.length; i += 400) { const b = f.F.writeBatch(f.db); qs.docs.slice(i, i + 400).forEach((d) => b.delete(d.ref)); await b.commit(); }
      } catch { /* ignore */ }
    }
    await f.F.deleteDoc(f.F.doc(f.db, "users", uid));
    return { ok: true };
  } catch (e) {
    return { error: e && e.code === "permission-denied" ? "삭제 권한이 없어요. Firestore 규칙(blocked 줄 포함)을 새로 게시했는지 확인해 주세요." : `삭제하지 못했어요${e && e.code ? ` (${e.code})` : ""}.` };
  }
}
async function isBlocked(uid) {
  const f = await fb().catch(() => null); if (!f) return false;
  try { const s = await f.F.getDoc(f.F.doc(f.db, "blocked", uid)); return s.exists(); } catch { return false; }
}
async function kickBlocked() {
  const f = await fb().catch(() => null);
  if (f) { try { await f.A.signOut(f.auth); } catch { /* ignore */ } }
  rememberMail(null);
  try { window.dispatchEvent(new CustomEvent("hae-blocked")); } catch { /* ignore */ }
}

/* ---- 메일 링크 처리 (비밀번호 재설정 · 이메일 인증) — 앱 안에서 직접 ----
   Firebase 콘솔 › Authentication › 템플릿 › '작업 URL 맞춤설정'에 이 사이트 주소를 넣으면
   메일 링크가 ?mode=resetPassword&oobCode=… 로 이 앱에 돌아와요. */
export async function checkResetCode(code) {
  const f = await fb().catch(() => null); if (!f) return { error: "클라우드 설정이 필요해요." };
  try { const email = await f.A.verifyPasswordResetCode(f.auth, code); return { ok: true, email }; } catch (e) { return err(e); }
}
export async function doResetPassword(code, pw) {
  const f = await fb().catch(() => null); if (!f) return { error: "클라우드 설정이 필요해요." };
  try { await f.A.confirmPasswordReset(f.auth, code, pw); return { ok: true }; } catch (e) { return err(e); }
}
export async function doApplyCode(code) {
  const f = await fb().catch(() => null); if (!f) return { error: "클라우드 설정이 필요해요." };
  try { await f.A.applyActionCode(f.auth, code); return { ok: true }; } catch (e) { return err(e); }
}

/* ---- 앱 안에서 비밀번호 바꾸기 · Google 계정 연결 (HAE) ---- */
export async function changePassword(curPw, newPw) {
  const f = await fb().catch(() => null);
  const u = f && f.auth.currentUser; if (!u) return { error: "먼저 로그인해 주세요." };
  if (!newPw || newPw.length < 6) return { error: "새 비밀번호는 6자 이상으로 해 주세요." };
  try {
    await f.A.reauthenticateWithCredential(u, f.A.EmailAuthProvider.credential(u.email, curPw || ""));
    await f.A.updatePassword(u, newPw);
    return { ok: true };
  } catch (e) { return err(e); }
}
/** 이메일 계정에 Google 로그인도 붙이기 — 비밀번호를 잊어도 Google로 들어올 수 있게 */
export async function linkGoogle() {
  const f = await fb().catch(() => null);
  const u = f && f.auth.currentUser; if (!u) return { error: "먼저 로그인해 주세요." };
  try { await f.A.linkWithPopup(u, new f.A.GoogleAuthProvider()); rememberMail(f.auth.currentUser); return { ok: true }; }
  catch (e) {
    if (e && e.code === "auth/credential-already-in-use") return { error: "그 Google 계정은 이미 다른 해묘 계정에 쓰이고 있어요." };
    if (e && e.code === "auth/provider-already-linked") return { error: "이미 Google이 연결돼 있어요." };
    return err(e);
  }
}
export async function linkedProviders() {
  const f = await fb().catch(() => null);
  const u = f && f.auth.currentUser; return u ? (u.providerData || []).map((p) => p.providerId) : [];
}
