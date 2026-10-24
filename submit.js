/**
 * [초등학교 6학년 대상 디지털 시민성 퀴즈] 인터랙션 & 데이터 제출 스크립트
 */

// ── 1. 웹 오디오 API 기반 자체 효과음 생성기 (외부 음원 필요 없음) ──
class SoundEffects {
  constructor() {
    this.ctx = null;
    this.enabled = true;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
  }

  playPop() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(520, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, this.ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.08);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.08);
  }

  playDing() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    [523.25, 659.25, 783.99].forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.12, now + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.35);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.35);
    });
  }

  playFanfare() {
    if (!this.enabled) return;
    this.init();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      const start = now + i * 0.12;
      const dur = i === notes.length - 1 ? 0.6 : 0.2;
      gain.gain.setValueAtTime(0.18, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + dur);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(start);
      osc.stop(start + dur);
    });
  }
}

const sfx = new SoundEffects();

// ── 2. 랜덤 닉네임 생성기 (개인정보 보호 엄격 준수) ──
const NICKNAME_ADJECTIVES = [
  "슬기로운", "용감한", "상냥한", "눈부신", "다정한",
  "정의로운", "빛나는", "씩씩한", "신중한", "호기심많은",
  "반짝이는", "지혜로운", "친절한", "행복한", "재치있는",
  "열정적인", "평화로운", "따뜻한", "사려깊은", "믿음직한",
  "스마트한", "창의적인", "용기있는", "예의바른", "희망찬"
];

const NICKNAME_NOUNS = [
  "라이언 🦁", "꼬부기 🐢", "판다 🐼", "토끼 🐰", "다람쥐 🐿️",
  "수달 🦦", "펭귄 🐧", "돌고래 🐬", "아기사자 🐯", "코알라 🐨",
  "올빼미 🦉", "바다표범 🦭", "여우 🦊", "사슴 🦌", "강아지 🐶",
  "고양이 🐱", "유니콘 🦄", "해달 🦦", "앵무새 🦜", "꿀벌 🐝",
  "우주비행사 🧑‍🚀", "수호천사 👼", "탐험가 🧭", "어린왕자 👑", "작은거인 ⭐"
];

function generateRandomNickname() {
  const adj = NICKNAME_ADJECTIVES[Math.floor(Math.random() * NICKNAME_ADJECTIVES.length)];
  const noun = NICKNAME_NOUNS[Math.floor(Math.random() * NICKNAME_NOUNS.length)];
  return `${adj} ${noun}`;
}

// ── 3. 앱 상태 관리 (State) ──
const QuizApp = {
  currentStep: 'intro', // 'intro' | 'quiz' | 'result'
  currentQuestionIndex: 0,
  userAnswers: new Array(QUIZ_QUESTIONS.length).fill(null),
  nickname: "",
  gasUrl: "",
  isSubmitted: false,
  filterMode: 'all', // 'all' | 'wrong'

  init() {
    // URL 파라미터에서 gasUrl 가져오기 (?gas=https://script.google.com/...)
    const urlParams = new URLSearchParams(window.location.search);
    const gasParam = urlParams.get('gas');
    if (gasParam) {
      this.gasUrl = decodeURIComponent(gasParam);
      localStorage.setItem('digital_quiz_gas_url', this.gasUrl);
    } else {
      this.gasUrl = localStorage.getItem('digital_quiz_gas_url') || "";
    }

    // 닉네임 초기화
    this.nickname = generateRandomNickname();
    this.updateNicknameDisplay();

    // GAS URL 인풋 기본값 동기화
    const gasInput = document.getElementById('gas-url-input');
    if (gasInput && this.gasUrl) {
      gasInput.value = this.gasUrl;
    }

    this.bindEvents();
    this.renderIntro();
  },

  updateNicknameDisplay() {
    const displays = document.querySelectorAll('.user-nickname-text');
    displays.forEach(el => el.textContent = this.nickname);
  },

  bindEvents() {
    // 닉네임 새로고침 버튼
    const refreshBtn = document.getElementById('refresh-nickname-btn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        sfx.playPop();
        this.nickname = generateRandomNickname();
        this.updateNicknameDisplay();
      });
    }

    // 퀴즈 시작 버튼
    const startBtn = document.getElementById('start-quiz-btn');
    if (startBtn) {
      startBtn.addEventListener('click', () => {
        sfx.playPop();
        this.startQuiz();
      });
    }

    // 이전 문제 버튼
    const prevBtn = document.getElementById('prev-question-btn');
    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        sfx.playPop();
        this.goToPrevQuestion();
      });
    }

    // 다음 문제 버튼
    const nextBtn = document.getElementById('next-question-btn');
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        sfx.playPop();
        this.goToNextQuestion();
      });
    }

    // 제출하고 결과보기 버튼
    const submitQuizBtn = document.getElementById('submit-quiz-btn');
    if (submitQuizBtn) {
      submitQuizBtn.addEventListener('click', () => {
        this.finishQuiz();
      });
    }

    // 결과 화면 - 다시 풀기 버튼
    const retryBtn = document.getElementById('retry-btn');
    if (retryBtn) {
      retryBtn.addEventListener('click', () => {
        sfx.playPop();
        this.resetQuiz();
      });
    }

    // 결과 화면 - 오답 노트 필터 탭 (전체 / 오답만)
    const filterAllBtn = document.getElementById('filter-all-btn');
    const filterWrongBtn = document.getElementById('filter-wrong-btn');
    if (filterAllBtn && filterWrongBtn) {
      filterAllBtn.addEventListener('click', () => {
        sfx.playPop();
        this.filterMode = 'all';
        filterAllBtn.classList.add('active');
        filterWrongBtn.classList.remove('active');
        this.renderReviewList();
      });
      filterWrongBtn.addEventListener('click', () => {
        sfx.playPop();
        this.filterMode = 'wrong';
        filterWrongBtn.classList.add('active');
        filterAllBtn.classList.remove('active');
        this.renderReviewList();
      });
    }

    // 선생님께 전송하기 버튼
    const sendTeacherBtn = document.getElementById('send-teacher-btn');
    if (sendTeacherBtn) {
      sendTeacherBtn.addEventListener('click', () => {
        this.openSendModal();
      });
    }

    // 모달 닫기 버튼들
    document.querySelectorAll('.close-modal-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.closeModals();
      });
    });

    // GAS URL 저장 및 전송 확정 버튼
    const confirmSendBtn = document.getElementById('confirm-send-btn');
    if (confirmSendBtn) {
      confirmSendBtn.addEventListener('click', () => {
        this.executeSendToGAS();
      });
    }

    // 사운드 토글 버튼
    const soundToggleBtn = document.getElementById('sound-toggle-btn');
    if (soundToggleBtn) {
      soundToggleBtn.addEventListener('click', () => {
        sfx.enabled = !sfx.enabled;
        soundToggleBtn.textContent = sfx.enabled ? "🔊 소리 켜짐" : "🔇 소리 꺼짐";
        soundToggleBtn.classList.toggle('muted', !sfx.enabled);
      });
    }
  },

  renderIntro() {
    document.getElementById('screen-intro').classList.remove('hidden');
    document.getElementById('screen-quiz').classList.add('hidden');
    document.getElementById('screen-result').classList.add('hidden');
  },

  startQuiz() {
    this.currentStep = 'quiz';
    this.currentQuestionIndex = 0;
    this.userAnswers = new Array(QUIZ_QUESTIONS.length).fill(null);
    this.isSubmitted = false;

    document.getElementById('screen-intro').classList.add('hidden');
    document.getElementById('screen-quiz').classList.remove('hidden');
    document.getElementById('screen-result').classList.add('hidden');

    this.renderCurrentQuestion();
  },

  renderCurrentQuestion() {
    const q = QUIZ_QUESTIONS[this.currentQuestionIndex];
    const total = QUIZ_QUESTIONS.length;
    const currentNum = this.currentQuestionIndex + 1;

    // 상단 진행도 및 라벨 업데이트
    const progressPercent = (currentNum / total) * 100;
    document.getElementById('progress-bar-fill').style.width = `${progressPercent}%`;
    document.getElementById('progress-runner').style.left = `${progressPercent}%`;
    document.getElementById('current-q-num').textContent = currentNum;
    document.getElementById('total-q-num').textContent = total;

    // 카테고리 태그 및 질문 텍스트
    document.getElementById('question-category').textContent = q.category;
    document.getElementById('question-text').textContent = q.question;

    // 보기 렌더링
    const optionsContainer = document.getElementById('options-container');
    optionsContainer.innerHTML = '';

    const optionLabels = ['A', 'B', 'C', 'D'];
    q.options.forEach((optText, idx) => {
      const optionCard = document.createElement('button');
      optionCard.type = 'button';
      optionCard.className = 'option-card';
      if (this.userAnswers[this.currentQuestionIndex] === idx) {
        optionCard.classList.add('selected');
      }

      optionCard.innerHTML = `
        <span class="option-badge">${optionLabels[idx]}</span>
        <span class="option-text">${optText}</span>
        <span class="check-icon">${this.userAnswers[this.currentQuestionIndex] === idx ? '✓' : ''}</span>
      `;

      optionCard.addEventListener('click', () => {
        sfx.playPop();
        this.selectAnswer(idx);
      });

      optionsContainer.appendChild(optionCard);
    });

    // 네비게이션 버튼 상태 업데이트
    const prevBtn = document.getElementById('prev-question-btn');
    const nextBtn = document.getElementById('next-question-btn');
    const submitBtn = document.getElementById('submit-quiz-btn');

    prevBtn.disabled = (this.currentQuestionIndex === 0);

    if (this.currentQuestionIndex === total - 1) {
      nextBtn.classList.add('hidden');
      submitBtn.classList.remove('hidden');
    } else {
      nextBtn.classList.remove('hidden');
      submitBtn.classList.add('hidden');
    }

    // 퀵 점프 네비게이터 바 업데이트
    this.renderQuestionNavDots();
  },

  renderQuestionNavDots() {
    const dotsContainer = document.getElementById('question-dots-container');
    if (!dotsContainer) return;
    dotsContainer.innerHTML = '';

    QUIZ_QUESTIONS.forEach((_, idx) => {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'nav-dot';
      dot.textContent = idx + 1;

      if (idx === this.currentQuestionIndex) {
        dot.classList.add('active');
      }
      if (this.userAnswers[idx] !== null) {
        dot.classList.add('answered');
      }

      dot.addEventListener('click', () => {
        sfx.playPop();
        this.currentQuestionIndex = idx;
        this.renderCurrentQuestion();
      });

      dotsContainer.appendChild(dot);
    });
  },

  selectAnswer(answerIndex) {
    this.userAnswers[this.currentQuestionIndex] = answerIndex;
    this.renderCurrentQuestion();

    // 살짝 0.3초 후 다음 문제로 자동 편의 이동 (사용자 경험 향상)
    if (this.currentQuestionIndex < QUIZ_QUESTIONS.length - 1) {
      setTimeout(() => {
        // 이미 다른 문제로 이동하지 않았을 때만 다음 문제로 자동 진행
        if (this.currentQuestionIndex < QUIZ_QUESTIONS.length - 1) {
          this.goToNextQuestion();
        }
      }, 280);
    }
  },

  goToPrevQuestion() {
    if (this.currentQuestionIndex > 0) {
      this.currentQuestionIndex--;
      this.renderCurrentQuestion();
    }
  },

  goToNextQuestion() {
    if (this.currentQuestionIndex < QUIZ_QUESTIONS.length - 1) {
      this.currentQuestionIndex++;
      this.renderCurrentQuestion();
    }
  },

  finishQuiz() {
    // 모든 문제를 풀었는지 확인
    const unAnswered = [];
    this.userAnswers.forEach((ans, idx) => {
      if (ans === null) unAnswered.push(idx + 1);
    });

    if (unAnswered.length > 0) {
      alert(`아직 풀지 않은 문제가 있어요! 📢\n[ ${unAnswered.join(', ')}번 ] 문제를 마저 풀어주세요.`);
      this.currentQuestionIndex = unAnswered[0] - 1;
      this.renderCurrentQuestion();
      return;
    }

    sfx.playFanfare();
    this.renderResults();
  },

  calculateScore() {
    let correctCount = 0;
    const categoryStats = {
      privacy: { name: "개인정보 보호", total: 0, correct: 0 },
      cyberbullying: { name: "사이버폭력 예방", total: 0, correct: 0 },
      copyright: { name: "저작권 및 발자국", total: 0, correct: 0 },
      media: { name: "미디어 리터러시", total: 0, correct: 0 },
      ai: { name: "AI & 디지털 윤리", total: 0, correct: 0 }
    };

    QUIZ_QUESTIONS.forEach((q, idx) => {
      const isCorrect = (this.userAnswers[idx] === q.answer);
      if (isCorrect) correctCount++;

      if (categoryStats[q.categoryCode]) {
        categoryStats[q.categoryCode].total++;
        if (isCorrect) {
          categoryStats[q.categoryCode].correct++;
        }
      }
    });

    const score = correctCount * 10;
    const rank = QUIZ_RANKS.find(r => score >= r.minScore && score <= r.maxScore) || QUIZ_RANKS[QUIZ_RANKS.length - 1];

    return {
      correctCount,
      totalCount: QUIZ_QUESTIONS.length,
      score,
      rank,
      categoryStats
    };
  },

  renderResults() {
    this.currentStep = 'result';
    document.getElementById('screen-intro').classList.add('hidden');
    document.getElementById('screen-quiz').classList.add('hidden');
    document.getElementById('screen-result').classList.remove('hidden');

    const result = this.calculateScore();

    // 점수 및 칭호 렌더링
    document.getElementById('result-score-num').textContent = result.score;
    document.getElementById('result-correct-count').textContent = result.correctCount;
    document.getElementById('result-rank-badge').textContent = result.rank.badge;
    document.getElementById('result-rank-title').textContent = result.rank.title;
    document.getElementById('result-rank-message').textContent = result.rank.message;

    // 영역별 성취도 렌더링
    const radarContainer = document.getElementById('category-stats-list');
    radarContainer.innerHTML = '';
    Object.values(result.categoryStats).forEach(cat => {
      const isPerfect = (cat.correct === cat.total);
      const row = document.createElement('div');
      row.className = 'cat-stat-card';
      row.innerHTML = `
        <div class="cat-stat-header">
          <span class="cat-name">${cat.name}</span>
          <span class="cat-score-tag ${isPerfect ? 'perfect' : ''}">${cat.correct}/${cat.total} 정답</span>
        </div>
        <div class="cat-progress-bg">
          <div class="cat-progress-fill" style="width: ${(cat.correct / cat.total) * 100}%"></div>
        </div>
      `;
      radarContainer.appendChild(row);
    });

    // 오답 수 뱃지 업데이트
    const wrongCount = result.totalCount - result.correctCount;
    document.getElementById('wrong-count-badge').textContent = wrongCount;

    // 필터 초기화 & 해설 리스트 렌더링
    this.filterMode = 'all';
    document.getElementById('filter-all-btn').classList.add('active');
    document.getElementById('filter-wrong-btn').classList.remove('active');
    this.renderReviewList();

    // 화려한 컨페티 폭죽 팡파레 시작!
    startConfetti();

    // 상단으로 부드럽게 스크롤
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  renderReviewList() {
    const container = document.getElementById('review-list-container');
    container.innerHTML = '';

    QUIZ_QUESTIONS.forEach((q, idx) => {
      const userAns = this.userAnswers[idx];
      const isCorrect = (userAns === q.answer);

      // '오답만 보기' 필터 상태일 때 정답인 문제는 건너뛰기
      if (this.filterMode === 'wrong' && isCorrect) {
        return;
      }

      const card = document.createElement('div');
      card.className = `review-card ${isCorrect ? 'correct-card' : 'wrong-card'}`;

      const optionLabels = ['A', 'B', 'C', 'D'];

      card.innerHTML = `
        <div class="review-header">
          <span class="review-num">Q${idx + 1}</span>
          <span class="review-cat">${q.category}</span>
          <span class="review-status-tag ${isCorrect ? 'correct' : 'wrong'}">
            ${isCorrect ? '⭕ 정답!' : '❌ 오답'}
          </span>
        </div>

        <h4 class="review-q-title">${q.question}</h4>

        <div class="review-answers-box">
          <div class="ans-row ${isCorrect ? 'user-correct' : 'user-wrong'}">
            <span class="ans-label">나의 선택:</span>
            <span class="ans-val"><strong>${userAns !== null ? optionLabels[userAns] : '미선택'}</strong>. ${userAns !== null ? q.options[userAns] : '답안 없음'}</span>
          </div>
          ${!isCorrect ? `
            <div class="ans-row actual-correct">
              <span class="ans-label">바른 정답:</span>
              <span class="ans-val"><strong>${optionLabels[q.answer]}</strong>. ${q.options[q.answer]}</span>
            </div>
          ` : ''}
        </div>

        <div class="review-explanation-box">
          <div class="exp-title">📖 친절한 해설:</div>
          <p class="exp-desc">${q.explanation}</p>
          <div class="exp-tip-box">${q.tip}</div>
        </div>
      `;

      container.appendChild(card);
    });

    if (container.children.length === 0) {
      container.innerHTML = `
        <div class="all-correct-cheer">
          🎉 와우! 틀린 문제가 하나도 없어요! 모든 문제를 완벽하게 맞혔습니다! 👏
        </div>
      `;
    }
  },

  openSendModal() {
    const modal = document.getElementById('send-modal');
    modal.classList.remove('hidden');
    // GAS URL 인풋에 저장된 값 채우기
    const input = document.getElementById('gas-url-input');
    if (this.gasUrl) {
      input.value = this.gasUrl;
    }
  },

  closeModals() {
    document.querySelectorAll('.modal-overlay').forEach(m => m.classList.add('hidden'));
  },

  async executeSendToGAS() {
    const input = document.getElementById('gas-url-input');
    const url = input.value.trim();

    if (!url) {
      alert("선생님께서 안내해 주신 Google Apps Script 웹 앱 URL을 입력해 주세요! 📝");
      input.focus();
      return;
    }

    if (!url.startsWith("https://script.google.com/macros/s/")) {
      alert("올바른 Google Apps Script 배포 URL 형식이 아닙니다!\n(형식: https://script.google.com/macros/s/.../exec)");
      input.focus();
      return;
    }

    // URL 저장
    this.gasUrl = url;
    localStorage.setItem('digital_quiz_gas_url', url);

    const result = this.calculateScore();
    const now = new Date();
    const formattedTime = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

    // 개인정보를 전혀 포함하지 않는 익명 전송 페이로드 구성
    const payload = {
      timestamp: formattedTime,
      nickname: this.nickname,
      score: result.score,
      correctCount: result.correctCount,
      totalCount: result.totalCount,
      gradeTitle: result.rank.title,
      privacyScore: `${result.categoryStats.privacy.correct}/${result.categoryStats.privacy.total}`,
      cyberScore: `${result.categoryStats.cyberbullying.correct}/${result.categoryStats.cyberbullying.total}`,
      copyrightScore: `${result.categoryStats.copyright.correct}/${result.categoryStats.copyright.total}`,
      mediaScore: `${result.categoryStats.media.correct}/${result.categoryStats.media.total}`,
      aiScore: `${result.categoryStats.ai.correct}/${result.categoryStats.ai.total}`,
      answersSummary: QUIZ_QUESTIONS.map((q, idx) => {
        const userA = this.userAnswers[idx];
        const isO = (userA === q.answer);
        return `Q${idx + 1}(${isO ? 'O' : 'X'})`;
      }).join(', ')
    };

    const sendBtn = document.getElementById('confirm-send-btn');
    const originalText = sendBtn.innerHTML;
    sendBtn.disabled = true;
    sendBtn.innerHTML = `🚀 전송하는 중...`;

    try {
      // Google Apps Script는 보통 브라우저의 CORS 제약이 있으므로,
      // mode: 'no-cors' 및 text/plain 본문으로 안전하게 전달합니다.
      await fetch(url, {
        method: "POST",
        mode: "no-cors",
        cache: "no-cache",
        headers: {
          "Content-Type": "text/plain;charset=utf-8"
        },
        body: JSON.stringify(payload)
      });

      this.closeModals();
      this.isSubmitted = true;
      sfx.playDing();

      // 전송 버튼 상태를 '전송 완료'로 변경
      const mainSendBtn = document.getElementById('send-teacher-btn');
      mainSendBtn.classList.add('sent-success');
      mainSendBtn.innerHTML = `✅ 선생님께 전송 완료! (${this.nickname})`;
      mainSendBtn.disabled = true;

      alert(`🎉 성공적으로 제출되었습니다!\n\n닉네임: ${this.nickname}\n점수: ${result.score}점\n선생님 스프레드시트에 안전하고 익명으로 기록되었어요!`);
    } catch (err) {
      console.error(err);
      alert(`전송 중 오류가 발생했습니다. 인터넷 연결이나 URL을 다시 한번 확인해 주세요.\n오류 내용: ${err.message}`);
    } finally {
      sendBtn.disabled = false;
      sendBtn.innerHTML = originalText;
    }
  },

  resetQuiz() {
    this.nickname = generateRandomNickname();
    this.updateNicknameDisplay();
    this.currentQuestionIndex = 0;
    this.userAnswers = new Array(QUIZ_QUESTIONS.length).fill(null);
    this.isSubmitted = false;

    const mainSendBtn = document.getElementById('send-teacher-btn');
    if (mainSendBtn) {
      mainSendBtn.classList.remove('sent-success');
      mainSendBtn.innerHTML = `📤 선생님께 결과 전송하기`;
      mainSendBtn.disabled = false;
    }

    this.startQuiz();
  }
};

// ── 4. 가볍고 화려한 자체 Canvas Confetti (축하 꽃가루 폭죽 애니메이션) ──
function startConfetti() {
  const canvas = document.getElementById('confetti-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const pieces = [];
  const colors = ['#f43f5e', '#ec4899', '#8b5cf6', '#3b82f6', '#06b6d4', '#10b981', '#f59e0b', '#fbbf24'];

  for (let i = 0; i < 90; i++) {
    pieces.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height - canvas.height,
      size: Math.random() * 9 + 5,
      color: colors[Math.floor(Math.random() * colors.length)],
      speedY: Math.random() * 3 + 2,
      speedX: (Math.random() - 0.5) * 2,
      rotation: Math.random() * 360,
      rotSpeed: (Math.random() - 0.5) * 10
    });
  }

  let animationFrameId;
  let count = 0;

  function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    pieces.forEach(p => {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rotation * Math.PI) / 180);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.7);
      ctx.restore();

      p.y += p.speedY;
      p.x += p.speedX;
      p.rotation += p.rotSpeed;

      if (p.y > canvas.height) {
        p.y = -10;
        p.x = Math.random() * canvas.width;
      }
    });

    count++;
    if (count < 260) {
      animationFrameId = requestAnimationFrame(render);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      cancelAnimationFrame(animationFrameId);
    }
  }

  render();
}

// 창 크기 변경 시 캔버스 반응형 조정
window.addEventListener('resize', () => {
  const canvas = document.getElementById('confetti-canvas');
  if (canvas) {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
});

// DOM 로드 완료 시 초기화 실행
document.addEventListener('DOMContentLoaded', () => {
  QuizApp.init();
});
