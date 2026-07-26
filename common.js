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

// ══════════════════════════════════════
// 🛡️ 관리자(마스터) 설정
// 여기 이메일을 실제 관리자 계정 이메일로 바꿔주세요.
// 이 이메일로 로그인한 계정은 게시글/댓글/인증 삭제, 회원 정지·데이터 삭제 권한을 가집니다.
// ══════════════════════════════════════
const ADMIN_EMAILS = [
  'admin@example.com'   // ← 실제 관리자 이메일로 반드시 교체하세요
];
function isAdmin(user) {
  return !!(user && user.email && ADMIN_EMAILS.includes(user.email));
}

// 정지된 계정이면 즉시 로그아웃시키고 true를 반환
function checkBanned(myData) {
  if (myData && myData.banned) {
    alert(`관리자에 의해 계정 이용이 제한되었습니다.\n사유: ${myData.banReason || '커뮤니티 규칙 위반'}`);
    auth.signOut().then(() => location.href = 'index.html');
    return true;
  }
  return false;
}

// ── XSS 방지용 이스케이프 (게시글/댓글처럼 자유 입력 텍스트 출력 시 사용) ──
function escapeHtml(str) {
  return (str || '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

// ── Firebase Storage 이미지 업로드/삭제 (board.html, admin.html에서 사용) ──
async function uploadImageFile(file, folder) {
  const storage = firebase.storage();
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const path = `${folder}/${auth.currentUser.uid}_${Date.now()}.${ext}`;
  const ref = storage.ref().child(path);
  await ref.put(file);
  return await ref.getDownloadURL();
}
async function deleteImageByURL(url) {
  if (!url) return;
  try {
    await firebase.storage().refFromURL(url).delete();
  } catch (e) {
    console.error('이미지 삭제 실패', e);
  }
}

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
  { id: 'feed',  icon: '📋', label: '피드',    href: 'feed.html'  },
  { id: 'board', icon: '📸', label: '게시판',  href: 'board.html' },
  { id: 'rank',  icon: '🏆', label: '랭킹',    href: 'rank.html'  },
  { id: 'my',    icon: '👤', label: '내 기록', href: 'my.html'    }
];
const ADMIN_TAB = { id: 'admin', icon: '🛠️', label: '관리자', href: 'admin.html' };

function getNavTabs(showAdmin) {
  return showAdmin ? [...NAV_TABS, ADMIN_TAB] : NAV_TABS;
}

function renderPageHeader(title) {
  return `
  <div class="page-header">
    <div class="page-header-row">
      <div class="page-title" id="pageTitle">${title}</div>
      <div class="header-avatar" id="headerAvatar" onclick="location.href='my.html'">?</div>
    </div>
  </div>`;
}

function renderBottomNav(activeTab, showAdmin) {
  const btns = getNavTabs(showAdmin).map(t => `
    <div class="nav-btn${t.id === activeTab ? ' active' : ''}${t.id === 'admin' ? ' nav-admin' : ''}" id="nav-${t.id}" onclick="location.href='${t.href}'">
      <div class="ni">${t.icon}</div>
      <div class="nl">${t.label}</div>
    </div>`).join('');
  return `<div class="bottom-nav">${btns}</div>`;
}

// 페이지 로드 시 헤더/네비를 그려 넣는 진입점.
// title: 페이지 제목 텍스트, activeTab: 'feed' | 'board' | 'rank' | 'my'
// 관리자 탭은 로그인 확인 후 별도로 updateAdminNav()를 호출해 추가한다.
function mountLayout(title, activeTab) {
  const headerMount = document.getElementById('headerMount');
  const navMount = document.getElementById('navMount');
  if (headerMount) headerMount.innerHTML = renderPageHeader(title);
  if (navMount) { navMount.innerHTML = renderBottomNav(activeTab, false); navMount.dataset.activeTab = activeTab; }
}

// 로그인한 유저가 관리자면 하단 탭바에 관리자 탭을 추가로 그려 넣는다.
function updateAdminNav(showAdmin) {
  const navMount = document.getElementById('navMount');
  if (!navMount || !showAdmin) return;
  navMount.innerHTML = renderBottomNav(navMount.dataset.activeTab, true);
}

// ══════════════════════════════════════
// 데스크톱 좌측 사이드바 (카페/홈페이지형 레이아웃)
// 로그인한 유저 정보를 불러온 뒤(mountLayout과 별개 시점) 호출한다.
// ══════════════════════════════════════
function renderSidebar(myData, activeTab, showAdmin) {
  const nick = myData.nickname || '?';
  const initial = nickInitial(nick);
  const color = nickColor(nick);

  let ddayHtml = '';
  if (myData.examDate) {
    const examDate = new Date(myData.examDate);
    const today = new Date(); today.setHours(0,0,0,0);
    const diff = Math.max(0, Math.ceil((examDate - today) / 86400000));
    const dstr = `${examDate.getFullYear()}.${String(examDate.getMonth()+1).padStart(2,'0')}.${String(examDate.getDate()).padStart(2,'0')}`;
    ddayHtml = `<div class="sidebar-dday">D-${diff}<span>${dstr} 필기시험</span></div>`;
  }

  const navItems = getNavTabs(showAdmin).map(t => `
    <div class="sidebar-nav-item${t.id === activeTab ? ' active' : ''}${t.id === 'admin' ? ' sidebar-admin' : ''}" onclick="location.href='${t.href}'">
      <span class="sni">${t.icon}</span><span class="snl">${t.label}</span>
    </div>`).join('');

  return `
  <div class="sidebar">
    <div class="sidebar-profile">
      <div class="sidebar-avatar" style="background:linear-gradient(135deg, ${color}, var(--cyan))">${initial}</div>
      <div class="sidebar-nickname">${nick}${showAdmin ? ' <span class="admin-badge">관리자</span>' : ''}</div>
      ${ddayHtml}
      <div class="sidebar-chips">
        <span class="sidebar-chip">🔥 ${myData.streak || 0}일 연속</span>
        <span class="sidebar-chip">📚 ${myData.totalProblems || 0}</span>
      </div>
    </div>
    <div class="sidebar-nav">${navItems}</div>
  </div>`;
}

function mountSidebar(myData, activeTab, showAdmin) {
  const el = document.getElementById('sidebarMount');
  if (el) el.innerHTML = renderSidebar(myData, activeTab, showAdmin);
}
