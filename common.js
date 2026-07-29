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
// 관리자 설정
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
const AVATAR_COLORS = ['#1d4ed8','#15803d','#7c3aed','#b91c1c','#b45309','#0891b2','#9d174d','#4d7c0f'];
function nickColor(nick) {
  if (!nick) return AVATAR_COLORS[0];
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
function yesterdayStr() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function timeAgo(ts) {
  if (!ts) return '';
  try {
    const diff = Math.floor((Date.now() - ts.toDate().getTime()) / 1000);
    if (diff < 60)    return '방금 전';
    if (diff < 3600)  return `${Math.floor(diff/60)}분 전`;
    if (diff < 86400) return `${Math.floor(diff/3600)}시간 전`;
    return `${Math.floor(diff/86400)}일 전`;
  } catch(e) { return ''; }
}

// ── 토스트 ──
let _toastTimer;
function showToast(msg) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => t.classList.remove('show'), 2800);
}

// ══════════════════════════════════════
// 인증 가드
// ══════════════════════════════════════
function requireAuth(onReady) {
  auth.onAuthStateChanged(user => {
    if (user) { onReady(user); }
    else      { location.href = 'index.html'; }
  });
}

async function fetchMyData(uid) {
  try {
    const snap = await db.collection('users').doc(uid).get();
    return snap.exists ? (snap.data() || {}) : {};
  } catch(e) {
    console.error('fetchMyData 오류:', e);
    return {};
  }
}

// ══════════════════════════════════════
// 레이아웃 마운트
// ──────────────────────────────────────
// 사이드바 = position:fixed, body 첫 자식으로 삽입
// headerMount = 탑바만
// navMount = 비움
// ══════════════════════════════════════
const NAV_TABS = [
  { id:'feed',  icon:'📋', label:'오늘 피드',  href:'feed.html'  },
  { id:'rank',  icon:'🏆', label:'랭킹',       href:'rank.html'  },
  { id:'board', icon:'💬', label:'커뮤니티',   href:'board.html' },
  { id:'my',    icon:'👤', label:'내 기록',    href:'my.html'    },
];

function mountLayout(title, activeTab) {
  // 1) 사이드바 생성 및 body 최상단 삽입
  if (!document.getElementById('globalSidebar')) {
    const sb = document.createElement('aside');
    sb.className = 'sidebar';
    sb.id = 'globalSidebar';
    sb.innerHTML = _sidebarHTML(activeTab);
    document.body.insertBefore(sb, document.body.firstChild);
  }

  // 2) 탑바만 headerMount에 주입
  const headerMount = document.getElementById('headerMount');
  if (headerMount) {
    headerMount.innerHTML = `
      <div class="page-topbar">
        <div class="topbar-left">
          <button class="sb-toggle" onclick="toggleSidebar()" title="메뉴">☰</button>
          <div class="topbar-title">${title}</div>
        </div>
        <div class="topbar-right">
          <span id="adminChip" class="admin-chip" style="display:none">👑 관리자</span>
          <div class="topbar-avatar" id="headerAvatar" onclick="location.href='my.html'" title="내 기록">?</div>
        </div>
      </div>`;
  }

  // 3) navMount 비움
  const navMount = document.getElementById('navMount');
  if (navMount) navMount.innerHTML = '';
}

function _sidebarHTML(activeTab) {
  const items = NAV_TABS.map(t => `
    <a class="sb-item${t.id===activeTab?' active':''}" href="${t.href}">
      <span class="sb-icon">${t.icon}</span>
      <span class="sb-label">${t.label}</span>
    </a>`).join('');

  return `
    <div class="sb-logo">
      <div class="sb-logo-row">
        <span class="sb-logo-icon">⚡</span>
        <div>
          <div class="sb-logo-title">전기기사 스터디</div>
          <div class="sb-logo-sub">같이 공부하면 합격한다</div>
        </div>
      </div>
      <div class="sb-exam-chip">📅 2027년 1회차 도전!</div>
    </div>
    <nav class="sb-nav">
      <div class="sb-section-label">메뉴</div>
      ${items}
      <div class="sb-section-label">외부 링크</div>
      <a class="sb-item" href="https://comcbt.com" target="_blank">
        <span class="sb-icon">📝</span><span class="sb-label">CBT 풀기</span>
      </a>
      <a class="sb-item" href="https://www.q-net.or.kr" target="_blank">
        <span class="sb-icon">🏛️</span><span class="sb-label">Q-Net 접수</span>
      </a>
    </nav>
    <div class="sb-footer">
      <div class="sb-user" id="sbUser">
        <div class="sb-avatar" id="sbAvatar" style="background:#1d4ed8">?</div>
        <div class="sb-user-info">
          <div class="sb-user-name" id="sbName">로딩 중...</div>
          <div class="sb-user-role" id="sbRole">멤버</div>
        </div>
        <button class="sb-logout-btn" onclick="doLogout()" title="로그아웃">⏏</button>
      </div>
    </div>`;
}

// 사이드바 토글 (모바일)
function toggleSidebar() {
  const sb = document.getElementById('globalSidebar');
  if (sb) sb.classList.toggle('open');
}

// ── 유저 정보 반영 ──
function renderSidebarUser(user, myData) {
  if (!user) return;
  const nick  = (myData && myData.nickname) ? myData.nickname : (user.email ? user.email.split('@')[0] : '사용자');
  const admin = isAdmin(user);
  const grad  = `linear-gradient(135deg, ${nickColor(nick)}, #0891b2)`;
  const ini   = nickInitial(nick);

  // 사이드바 요소
  _setEl('sbAvatar',    'textContent',   ini);
  _setStyle('sbAvatar', 'background',    grad);
  _setEl('sbName',      'textContent',   nick);
  _setEl('sbRole',      'textContent',   admin ? '👑 관리자' : '스터디 멤버');
  if (admin) _setStyle('sbRole', 'color', '#a78bfa');

  // 탑바 아바타
  _setEl('headerAvatar',    'textContent', ini);
  _setStyle('headerAvatar', 'background',  grad);

  // 관리자 칩
  if (admin) {
    const chip = document.getElementById('adminChip');
    if (chip) chip.style.display = 'inline-flex';
  }
}

// 구버전 호환
function renderHeaderAvatar(myData) {
  const user = auth.currentUser;
  if (user) renderSidebarUser(user, myData);
}

function _setEl(id, prop, val) {
  const el = document.getElementById(id);
  if (el) el[prop] = val;
}
function _setStyle(id, prop, val) {
  const el = document.getElementById(id);
  if (el) el.style[prop] = val;
}

// 공통 로그아웃
async function doLogout() {
  if (!confirm('로그아웃 하시겠어요?')) return;
  try {
    await auth.signOut();
    location.href = 'index.html';
  } catch(e) {
    showToast('로그아웃 중 오류가 발생했어요');
  }
}
