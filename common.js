// ══════════════════════════════════════
// 🔥 Firebase 설정 (여기에 본인 Firebase 설정 붙여넣기)
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

// ── 인증 방식별 설정 ──
const CHECKIN_TYPES = {
  problem:   { icon:'📝', label:'문제풀이', countLabel:'기출 문제 수', unit:'문제', feedVerb:'기출' },
  concept:   { icon:'📖', label:'개념학습', countLabel:'학습 시간(분)', unit:'분',   feedVerb:'개념학습' },
  lecture:   { icon:'🎥', label:'인강시청', countLabel:'시청 강의 수', unit:'강',   feedVerb:'인강' },
  wrongnote: { icon:'📓', label:'오답노트', countLabel:'오답 정리 개수', unit:'개', feedVerb:'오답노트' }
};

// ── 색상 팔레트 ──
const AVATAR_COLORS = [
  '#b5651d','#5f7d3d','#8c4a12','#a8402f','#c1852a',
  '#6b7d4f','#8a5a3d','#b08d3e'
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
  if (diff < 60)   return '방금 전';
  if (diff < 3600) return `${Math.floor(diff/60)}분 전`;
  if (diff < 86400) return `${Math.floor(diff/3600)}시간 전`;
  return `${Math.floor(diff/86400)}일 전`;
}
function computeStreakFromDates(dates) {
  if (!dates || dates.length === 0) return 0;
  const sorted = [...new Set(dates)].sort();
  let streak = 1;
  for (let i = sorted.length - 1; i > 0; i--) {
    const cur = new Date(sorted[i]);
    const prev = new Date(sorted[i-1]);
    const diffDays = Math.round((cur - prev) / 86400000);
    if (diffDays === 1) streak++;
    else break;
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
// 인증 가드 (feed/rank/my 페이지 공통)
// 로그인 안 되어 있으면 index.html로 이동시키고,
// 로그인 되어 있으면 콜백(user)을 실행
// ══════════════════════════════════════
function requireAuth(onReady) {
  auth.onAuthStateChanged(user => {
    if (user) {
      onReady(user);
    } else {
      location.href = 'index.html';
    }
  });
}

// ── 내 정보 로드 ──
async function fetchMyData(uid) {
  const snap = await db.collection('users').doc(uid).get();
  return snap.data() || {};
}

// ── 헤더 아바타 공통 렌더링 ──
function renderHeaderAvatar(myData) {
  const el = document.getElementById('headerAvatar');
  if (!el) return;
  const nick = myData.nickname || '?';
  el.textContent = nickInitial(nick);
  el.style.background = `linear-gradient(135deg, ${nickColor(nick)}, var(--cyan))`;
}

// ══════════════════════════════════════
// 공통 레이아웃 (헤더 + 하단 탭바)
// feed/rank/my 세 페이지가 전부 이 함수로 마크업을 그려서,
// 이후 헤더/네비 디자인을 바꿀 땐 여기 한 곳만 고치면 됨.
// ══════════════════════════════════════
const NAV_TABS = [
  { id: 'feed', icon: '📋', label: '피드',    href: 'feed.html' },
  { id: 'rank', icon: '🏆', label: '랭킹',    href: 'rank.html' },
  { id: 'my',   icon: '👤', label: '내 기록', href: 'my.html'   }
];

function renderPageHeader(title) {
  return `
  <div class="page-header">
    <div class="page-header-row">
      <div class="page-title" id="pageTitle">${title}</div>
      <div class="header-avatar" id="headerAvatar" onclick="location.href='my.html'">?</div>
    </div>
  </div>`;
}

function renderBottomNav(activeTab) {
  const btns = NAV_TABS.map(t => `
    <div class="nav-btn${t.id === activeTab ? ' active' : ''}" id="nav-${t.id}" onclick="location.href='${t.href}'">
      <div class="ni">${t.icon}</div>
      <div class="nl">${t.label}</div>
    </div>`).join('');
  return `<div class="bottom-nav">${btns}</div>`;
}

// 페이지 로드 시 헤더/네비를 그려 넣는 진입점.
// title: 페이지 제목 텍스트, activeTab: 'feed' | 'rank' | 'my'
function mountLayout(title, activeTab) {
  const headerMount = document.getElementById('headerMount');
  const navMount = document.getElementById('navMount');
  if (headerMount) headerMount.innerHTML = renderPageHeader(title);
  if (navMount) navMount.innerHTML = renderBottomNav(activeTab);
}
