// ══════════════════════════════════════
// 🔥 Firebase 설정
// ══════════════════════════════════════
const firebaseConfig = {
  apiKey: "AIzaSyBbm0hy_qz_85UCSu2uLUCUN6zYhs-sAqo",
  authDomain: "hoho-a270e.firebaseapp.com",
  databaseURL: "https://hoho-a270e-default-rtdb.firebaseio.com",
  projectId: "hoho-a270e",
  storageBucket: "hoho-a270e.firebasestorage.app",
  messagingSenderId: "240112645938",
  appId: "1:240112645938:web:7bc00ffa220c07327ec92b",
  measurementId: "G-97XCVP2Z3H"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db   = firebase.firestore();

// ══════════════════════════════════════
// 🔐 마스터(관리자) 설정
// ══════════════════════════════════════
const MASTER_EMAIL = '49burnida@naver.com';

function isAdmin(user) {
  return !!(user && user.email === MASTER_EMAIL);
}

// ══════════════════════════════════════
// 인증 방식별 설정
// ══════════════════════════════════════
const CHECKIN_TYPES = {
  problem:   { icon:'📝', label:'문제풀이',  countLabel:'기출 문제 수',   unit:'문제', feedVerb:'기출' },
  concept:   { icon:'📖', label:'개념학습',  countLabel:'학습 시간(분)',   unit:'분',   feedVerb:'개념학습' },
  lecture:   { icon:'🎥', label:'인강시청',  countLabel:'시청 강의 수',   unit:'강',   feedVerb:'인강' },
  wrongnote: { icon:'📓', label:'오답노트',  countLabel:'오답 정리 개수', unit:'개',   feedVerb:'오답노트' }
};

// ── 색상 팔레트 ──
const AVATAR_COLORS = [
  '#1d4ed8','#15803d','#7c3aed','#b91c1c','#b45309',
  '#0891b2','#9d174d','#4d7c0f'
];
function nickColor(nick) {
  let h = 0;
  for (let c of nick) h = (h * 31 + c.charCodeAt(0)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[h];
}
function nickInitial(nick) { return nick ? nick[0].toUpperCase() : '?'; }

// ── 날짜 유틸 ──
function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function timeAgo(ts) {
  if (!ts) return '';
  const diff = Math.floor((Date.now() - ts.toDate().getTime()) / 1000);
  if (diff < 60)    return '방금 전';
  if (diff < 3600)  return `${Math.floor(diff/60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff/3600)}시간 전`;
  return `${Math.floor(diff/86400)}일 전`;
}
function computeStreakFromDates(dates) {
  if (!dates || dates.length === 0) return 0;
  const sorted = [...new Set(dates)].sort();
  let streak = 1;
  for (let i = sorted.length - 1; i > 0; i--) {
    const diff = Math.round((new Date(sorted[i]) - new Date(sorted[i-1])) / 86400000);
    if (diff === 1) streak++; else break;
  }
  return streak;
}

// ── 토스트 ──
let toastTimer;
function showToast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2500);
}

// ══════════════════════════════════════
// 인증 가드
// ══════════════════════════════════════
function requireAuth(onReady) {
  auth.onAuthStateChanged(user => {
    if (user) { onReady(user); }
    else { location.href = 'index.html'; }
  });
}

async function fetchMyData(uid) {
  const snap = await db.collection('users').doc(uid).get();
  return snap.data() || {};
}

// ══════════════════════════════════════
// 사이드바 + 레이아웃
// ══════════════════════════════════════
const NAV_TABS = [
  { id:'feed',  icon:'📋', label:'오늘 피드',   href:'feed.html',  grad:'var(--grad-feed)' },
  { id:'rank',  icon:'🏆', label:'랭킹',        href:'rank.html',  grad:'var(--grad-rank)' },
  { id:'board', icon:'💬', label:'커뮤니티',    href:'board.html', grad:'var(--grad-board)' },
  { id:'my',    icon:'👤', label:'내 기록',     href:'my.html',    grad:'var(--grad-my)' },
];

function renderSidebar(activeTab) {
  const navItems = NAV_TABS.map(t => `
    <a class="sb-item${t.id === activeTab ? ' active' : ''}" href="${t.href}">
      <span class="sb-icon">${t.icon}</span>
      <span class="sb-label">${t.label}</span>
    </a>`).join('');

  return `
  <aside class="sidebar" id="globalSidebar">
    <div class="sb-logo">
      <div class="sb-logo-icon">⚡</div>
      <div class="sb-logo-title">전기기사<br>스터디</div>
      <div class="sb-logo-sub">같이 공부하면 합격한다</div>
      <div class="sb-exam-chip">📅 2027년 1회차 도전!</div>
    </div>
    <nav class="sb-nav">
      <div class="sb-section-label">메뉴</div>
      ${navItems}
      <div class="sb-section-label" style="margin-top:24px">도구</div>
      <a class="sb-item" href="https://comcbt.com" target="_blank">
        <span class="sb-icon">📝</span>
        <span class="sb-label">CBT 풀기</span>
      </a>
    </nav>
    <div class="sb-user" id="sbUser">
      <div class="sb-avatar" id="sbAvatar">?</div>
      <div class="sb-user-info">
        <div class="sb-user-name" id="sbName">-</div>
        <div class="sb-user-role" id="sbRole">멤버</div>
      </div>
      <button class="sb-logout-btn" onclick="doLogout()" title="로그아웃">⏏</button>
    </div>
  </aside>
  <div class="main-wrap">`;
}

function renderTopBar(title) {
  return `
    <div class="page-topbar">
      <div class="topbar-title">${title}</div>
      <div class="topbar-right">
        <div id="adminChip" style="display:none" class="admin-chip">👑 관리자</div>
        <div class="topbar-avatar" id="headerAvatar" onclick="location.href='my.html'">?</div>
      </div>
    </div>
    <div class="page-content">`;
}

// mountLayout: 사이드바 + 탑바를 headerMount에, 닫는 태그를 navMount에 주입
function mountLayout(title, activeTab) {
  const headerMount = document.getElementById('headerMount');
  const navMount    = document.getElementById('navMount');
  if (headerMount) headerMount.innerHTML = renderSidebar(activeTab) + renderTopBar(title);
  if (navMount)    navMount.innerHTML    = '</div></div>'; // .page-content + .main-wrap 닫기
}

// 사이드바 유저 정보 채우기 (공통)
function renderSidebarUser(user, myData) {
  const nick  = myData.nickname || user.email.split('@')[0];
  const admin = isAdmin(user);

  const av  = document.getElementById('sbAvatar');
  const nm  = document.getElementById('sbName');
  const rl  = document.getElementById('sbRole');
  const hav = document.getElementById('headerAvatar');
  const ac  = document.getElementById('adminChip');

  const color = nickColor(nick);
  const grad  = `linear-gradient(135deg,${color},var(--cyan))`;

  if (av)  { av.textContent = nickInitial(nick); av.style.background = grad; }
  if (nm)  nm.textContent   = nick;
  if (rl)  { rl.textContent = admin ? '👑 관리자' : '스터디 멤버'; rl.style.color = admin ? '#a78bfa' : ''; }
  if (hav) { hav.textContent = nickInitial(nick); hav.style.background = grad; }
  if (ac && admin) ac.style.display = 'flex';
}

// 헤더 아바타 단독 렌더 (구버전 호환)
function renderHeaderAvatar(myData) {
  const el  = document.getElementById('headerAvatar');
  const av  = document.getElementById('sbAvatar');
  const nm  = document.getElementById('sbName');
  const nick = myData.nickname || '?';
  const grad = `linear-gradient(135deg,${nickColor(nick)},var(--cyan))`;
  if (el)  { el.textContent = nickInitial(nick); el.style.background = grad; }
  if (av)  { av.textContent = nickInitial(nick); av.style.background = grad; }
  if (nm)  nm.textContent   = nick;
}

// 공통 로그아웃
async function doLogout() {
  if (!confirm('로그아웃 하시겠어요?')) return;
  await auth.signOut();
  location.href = 'index.html';
}
