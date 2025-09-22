/* ========= Utils ========= */
const trim = (s) => (s || '').replace(/\s+/g, ' ').trim();

/* ========= State ========= */
const state = {
  items: [],
  history: [],
  page: 1,
  perPage: 5,
  isModalOpen: false,
};

/* ========= DOM ========= */
const elInput  = document.getElementById('itemInput');
const elAdd    = document.getElementById('addBtn');
const elChips  = document.getElementById('chips');
const elPick   = document.getElementById('pickBtn');
const elClear  = document.getElementById('clearBtn');
const elClearHistory = document.getElementById('clearHistoryBtn');

const elModal  = document.getElementById('modalBackdrop');
const elResult = document.getElementById('result');
const elReroll = document.getElementById('reroll');
const elClose  = document.getElementById('closeModal');

const historyList = document.getElementById('history');
const prevPage = document.getElementById('prevPage');
const nextPage = document.getElementById('nextPage');

const themeSelect = document.getElementById('themeSelect');
const particlesBox = document.getElementById('particles');
const alertArea = document.getElementById('alertArea');
const successArea = document.getElementById('successArea');
const themeBG = document.getElementById('themeBG');

/* ========= Theme ========= */
const themeEmojis = { sakura:'🌸', ocean:'💧', forest:'🍃', space:'⭐', sunset:'☁️' };
const currentTheme = () => (document.body.className.replace('theme-','') || 'sakura');

function computeBGCount(){
  const area = window.innerWidth * window.innerHeight;
  return Math.max(24, Math.min(80, Math.round(area / 120000)));
}
function renderThemeBackground(){
  const emoji = themeEmojis[currentTheme()] || '🌸';
  themeBG.innerHTML = '';
  const COUNT = computeBGCount();
  for(let i=0;i<COUNT;i++){
    const s = document.createElement('span');
    s.textContent = emoji;
    s.style.left = Math.random()*100 + '%';
    s.style.top = Math.random()*100 + '%';
    s.style.fontSize = (14 + Math.random()*24) + 'px';
    s.style.opacity = (0.10 + Math.random()*0.15).toFixed(2);
    themeBG.appendChild(s);
  }
}
let resizeTimer=null;
window.addEventListener('resize', ()=>{
  clearTimeout(resizeTimer);
  resizeTimer=setTimeout(renderThemeBackground, 200);
});

function setTheme(t){
  document.body.className = 'theme-' + t;
  renderThemeBackground();
  renderHistory();
}
themeSelect.addEventListener('change', e => setTheme(e.target.value));
setTheme('sakura');

/* ========= Accessibility ========= */
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && state.isModalOpen) closeModal();
});

/* ========= Toasts ========= */
function showAlert(msg){
  alertArea.innerHTML = '';
  const box = document.createElement('div');
  box.className = 'alert-box';
  box.textContent = msg;
  alertArea.appendChild(box);
  setTimeout(() => { if (alertArea.contains(box)) box.remove(); }, 2500);
}
function showSuccess(msg){
  successArea.innerHTML = '';
  const box = document.createElement('div');
  box.className = 'success-box';
  box.textContent = msg;
  successArea.appendChild(box);
  setTimeout(() => { if (successArea.contains(box)) box.remove(); }, 1800);
}

/* ========= Validation（防呆強化） ========= */
const LIMIT_ITEM_LEN = 80;
const LIMIT_ITEMS = 50;
function isMeaningful(text){
  return /[A-Za-z0-9\u3040-\u30FF\u4E00-\u9FFF]/.test(text);
}
function validateNewItem(raw){
  if (!raw) return '⚠️ 項目は空白にできません';
  if (raw.length > LIMIT_ITEM_LEN) return `⚠️ 文字数が長すぎます（最大 ${LIMIT_ITEM_LEN} 文字）`;
  if (!isMeaningful(raw)) return '⚠️ 有効な文字を入力してください';
  if (state.items.length >= LIMIT_ITEMS) return `⚠️ 追加上限に達しました（最大 ${LIMIT_ITEMS} 件）`;
  if (state.items.some(x => x.toLowerCase() === raw.toLowerCase())) return '⚠️ 同じ項目はすでに追加されています';
  return null;
}

/* ========= UI 更新 ========= */
function updateUI(){
  elChips.innerHTML = '';
  state.items.forEach((text, idx) => {
    const chip = document.createElement('div');
    chip.className = 'chip';

    const num = document.createElement('div');
    num.className = 'num';
    num.textContent = String(idx + 1);

    const txt = document.createElement('div');
    txt.className = 'text';
    txt.textContent = text;

    const del = document.createElement('button');
    del.className = 'del';
    del.type = 'button';
    del.setAttribute('aria-label', `${text} を削除`);
    del.dataset.idx = String(idx);
    del.addEventListener('click', () => {
      state.items.splice(idx, 1);
      updateUI();
    });

    chip.appendChild(num);
    chip.appendChild(txt);
    chip.appendChild(del);
    elChips.appendChild(chip);
  });

  const ok = state.items.length >= 2;
  elPick.disabled = !ok;
  elPick.classList.toggle('btn--disabled', !ok);

  renderHistory();
}
updateUI();

/* ========= 新增項目 ========= */
function addItem(){
  const raw = trim(elInput.value);
  const err = validateNewItem(raw);
  if (err){ showAlert(err); return; }

  state.items.push(raw);
  elInput.value = '';
  updateUI();
  showSuccess('✅ 追加しました');
  elInput.focus();
}
elAdd.addEventListener('click', addItem);
elInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter'){ e.preventDefault(); addItem(); }
});

/* ========= 清除 ========= */
elClear.addEventListener('click', () => {
  if (!state.items.length) return;
  if (confirm('本当にすべての項目をクリアしますか？')){
    state.items = [];
    updateUI();
    elInput.focus();
    showSuccess('🧹 すべてクリアしました');
  }
});

/* ========= 歷史 ========= */
function addHistory(val){
  state.history.unshift(val);
  if (state.history.length > 500) state.history.pop();
  state.page = 1;
  renderHistory();
}
function renderHistory(){
  historyList.innerHTML = '';
  const total = state.history.length;
  const maxPage = Math.max(1, Math.ceil(total / state.perPage));
  state.page = Math.min(state.page, maxPage);
  const start = (state.page - 1) * state.perPage;
  const slice = state.history.slice(start, start + state.perPage);

  const emoji = themeEmojis[currentTheme()] || '🌸';
  slice.forEach((val, i) => {
    const num = (start + i) + 1;
    const entry = document.createElement('div');
    entry.textContent = `${num}回目 ${emoji} ${val}`;
    historyList.appendChild(entry);
  });

  prevPage.disabled = (state.page <= 1);
  nextPage.disabled = (state.page >= maxPage);
}
prevPage.addEventListener('click', () => {
  if (state.page > 1){ state.page--; renderHistory(); }
});
nextPage.addEventListener('click', () => {
  const maxPage = Math.ceil(state.history.length / state.perPage);
  if (state.page < maxPage){ state.page++; renderHistory(); }
});
elClearHistory.addEventListener('click', () => {
  if (!state.history.length) return;
  if (confirm('履歴をすべてクリアしますか？')){
    state.history = [];
    state.page = 1;
    renderHistory();
    showSuccess('📜 履歴をクリアしました');
  }
});

/* ========= 抽選 ========= */
function pickRandom(){
  if (state.items.length < 2) return null;
  return state.items[Math.floor(Math.random() * state.items.length)];
}
function createFallingEmojis(count=10){
  const emoji = themeEmojis[currentTheme()] || '🌸';
  for (let i=0;i<count;i++){
    const span = document.createElement('span');
    span.className = 'fall-emoji';
    span.textContent = emoji;
    span.style.left = Math.random()*100 + '%';
    span.style.animationDuration = (3 + Math.random()*3) + 's';
    span.style.fontSize = (18 + Math.random()*14) + 'px';
    particlesBox.appendChild(span);
    setTimeout(() => span.remove(), 5200);
  }
}

/* 開始抽選（開啟 Modal） */
function openModalWithResult(){
  if (state.isModalOpen) return;
  if (state.items.length < 2){ showAlert('⚠️ 項目は2つ以上必要です'); return; }

  const value = pickRandom();
  if (value == null){ showAlert('⚠️ 抽選に失敗しました。もう一度お試しください'); return; }

  state.isModalOpen = true;
  elModal.classList.add('active');
  elModal.setAttribute('aria-hidden','false');

  particlesBox.innerHTML = '';
  elResult.querySelector('.card-inner')?.remove();

  const wrapper = document.createElement('div');
  wrapper.className = 'card-inner';

  const front = document.createElement('div');
  front.className = 'card-front';
  front.textContent = '抽選中...';

  const back = document.createElement('div');
  back.className = 'card-back';
  back.textContent = value;

  wrapper.appendChild(front);
  wrapper.appendChild(back);
  elResult.appendChild(wrapper);

  setTimeout(() => {
    wrapper.classList.add('flip');
    createFallingEmojis(10);
    addHistory(value);
  }, 800);
}

/* 重新抽選（不關閉 Modal） */
function rerollResult(){
  if (!state.isModalOpen){ openModalWithResult(); return; }
  if (state.items.length < 2){ showAlert('⚠️ 項目は2つ以上必要です'); return; }

  const value = pickRandom();
  if (value == null){ showAlert('⚠️ 抽選に失敗しました。もう一度お試しください'); return; }

  particlesBox.innerHTML = '';
  elResult.querySelector('.card-inner')?.remove();

  const wrapper = document.createElement('div');
  wrapper.className = 'card-inner';

  const front = document.createElement('div');
  front.className = 'card-front';
  front.textContent = '抽選中...';

  const back = document.createElement('div');
  back.className = 'card-back';
  back.textContent = value;

  wrapper.appendChild(front);
  wrapper.appendChild(back);
  elResult.appendChild(wrapper);

  setTimeout(() => {
    wrapper.classList.add('flip');
    createFallingEmojis(10);
    addHistory(value);
  }, 800);
}

function closeModal(){
  state.isModalOpen = false;
  elModal.classList.remove('active');
  elModal.setAttribute('aria-hidden','true');
  elResult.querySelector('.card-inner')?.remove();
  particlesBox.innerHTML = '';
}

/* 綁定事件 */
elPick.addEventListener('click', openModalWithResult);
elReroll.addEventListener('click', rerollResult);
elClose.addEventListener('click', closeModal);
elModal.addEventListener('click', e => { if (e.target === elModal) closeModal(); });

/* ========= 鍵盤與可用性提升 ========= */
elInput.addEventListener('focus', () => elInput.select?.());
elInput.addEventListener('blur', () => { elInput.value = trim(elInput.value); });
