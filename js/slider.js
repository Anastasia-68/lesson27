const CODE_ARROW_LEFT = "ArrowLeft";
const CODE_ARROW_RIGHT = "ArrowRight";
const CODE_SPACE = "Space";
const FA_PAUSE = '<i class="fas fa-pause"></i>';
const FA_PLAY  = '<i class="fas fa-play"></i>';
const TIMER_INTERVAL = 2000;

const carousel = document.querySelector('#carousel');
const slidesContainer = document.querySelector('#slides-container'); 
const slidesNodeList = slidesContainer ? slidesContainer.querySelectorAll('.slide') : [];
const indicatorsContainer = document.querySelector('#indicators-container');
const indicatorsNodeList = indicatorsContainer ? indicatorsContainer.querySelectorAll('.indicator') : [];
const controlsContainer = document.querySelector('#controls-container');
const pauseBtn = document.getElementById('pause-btn');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');

/* Переменные */
let SLIDES_COUNT = slidesNodeList.length;
let currentSlide = 0;
let isPlaying = true;
let timerId = null;
let swipeStartX = 0;
let swipeEndX = 0;

/* дополнительные переменные для translateX-реализации */
let slideWidth = 0;

/* Удобные массивы */
let slides = Array.from(slidesNodeList);
let indicators = Array.from(indicatorsNodeList);

/* лог (отключён) */
function log(...args){ /* console.log('[carousel]', ...args); */ }

/* ========= Функции управления слайдами ========= */

function updateSizes() {
  // считаем ширину слайда (контейнер видимой области)
  if (!slidesContainer) return;
  slideWidth = slidesContainer.clientWidth;
  // при изменении размеров нужно сразу выставить transform без анимации
  slidesContainer.style.transition = 'none';
  slidesContainer.style.transform = `translateX(${-currentSlide * slideWidth}px)`;
  // форсируем reflow и возвращаем transition
  void slidesContainer.offsetWidth;
  slidesContainer.style.transition = '';
}

function goToSlide(n) {
  if (SLIDES_COUNT === 0) return;

  // удаляем active у предыдущего (для совместимости с тестами)
  if (slides[currentSlide]) slides[currentSlide].classList.remove('active');
  if (indicators[currentSlide]) indicators[currentSlide].classList.remove('active');

  currentSlide = (n % SLIDES_COUNT + SLIDES_COUNT) % SLIDES_COUNT;

  // добавляем active к новому
  if (slides[currentSlide]) slides[currentSlide].classList.add('active');
  if (indicators[currentSlide]) indicators[currentSlide].classList.add('active');

  // сдвигаем трек
  if (slidesContainer) {
    slidesContainer.style.transform = `translateX(${-currentSlide * slideWidth}px)`;
  }

  log('goToSlide ->', currentSlide);
}

function nextSlide() {
  goToSlide(currentSlide + 1);
}

function prevSlide() {
  goToSlide(currentSlide - 1);
}

/* ========= Автоплей ========= */

function startTimer() {
  stopTimer();
  timerId = setInterval(() => {
    nextSlide();
  }, TIMER_INTERVAL);
  isPlaying = true;
  updatePausePlayIcon();
  log('timer started');
}

function stopTimer() {
  if (timerId !== null) {
    clearInterval(timerId);
    timerId = null;
  }
  isPlaying = false;
  updatePausePlayIcon();
  log('timer stopped');
}

function updatePausePlayIcon() {
  if (!pauseBtn) return;
  const hasFA = (typeof FA_PAUSE === 'string' && typeof FA_PLAY === 'string');
  if (hasFA) pauseBtn.innerHTML = isPlaying ? FA_PAUSE : FA_PLAY;
  else pauseBtn.textContent = isPlaying ? '⏸' : '▶';
}

/* ========= Обработчики событий (имена обязаны совпадать) ========= */

function pausePlayHandler() {
  if (isPlaying) stopTimer();
  else startTimer();
}

function nextHandler(evt) {
  if (evt && typeof evt.preventDefault === 'function') evt.preventDefault();
  userInteracted();
  nextSlide();
}

function prevHandler(evt) {
  if (evt && typeof evt.preventDefault === 'function') evt.preventDefault();
  userInteracted();
  prevSlide();
}

function indicatorClickHandler(evt) {
  const target = evt.target.closest('.indicator');
  if (!target) return;
  const idx = parseInt(target.dataset.slideTo, 10);
  if (Number.isNaN(idx)) return;
  userInteracted();
  goToSlide(idx);
}

function keydownHandler(evt) {
  if (!evt || !evt.code) return;
  if (evt.code === CODE_ARROW_LEFT) prevHandler(evt);
  else if (evt.code === CODE_ARROW_RIGHT) nextHandler(evt);
  else if (evt.code === CODE_SPACE) {
    evt.preventDefault();
    pausePlayHandler();
  }
}

function swipeStartHandler(evt) {
  if (evt.type === 'touchstart') swipeStartX = evt.touches[0].clientX;
  else if (evt.type === 'mousedown') {
    if (evt.button !== 0) return;
    swipeStartX = evt.clientX;
  }
}

function swipeEndHandler(evt) {
  if (evt.type === 'touchend') swipeEndX = evt.changedTouches[0].clientX;
  else if (evt.type === 'mouseup') swipeEndX = evt.clientX;
  else return;

  const delta = swipeEndX - swipeStartX;
  if (Math.abs(delta) > 100) {
    userInteracted();
    if (delta > 0) prevSlide();
    else nextSlide();
  } else {
    // при незначительном свайпе — вернуть трек в исходную позицию (плавно)
    if (slidesContainer) slidesContainer.style.transform = `translateX(${-currentSlide * slideWidth}px)`;
  }

  swipeStartX = 0;
  swipeEndX = 0;
}

/* ========= Вспомогательные ========= */

function userInteracted() {
  stopTimer();
}

/* ========= Инициализация и навешивание событий ========= */

function ensureInitialActive() {
  slides = Array.from(document.querySelectorAll('#slides-container .slide'));
  indicators = Array.from(document.querySelectorAll('#indicators-container .indicator'));
  SLIDES_COUNT = slides.length;

  const explicitSlide = slides.findIndex(s => s.classList.contains('active'));
  if (explicitSlide >= 0) currentSlide = explicitSlide;
  else {
    if (slides[0]) slides[0].classList.add('active');
    currentSlide = 0;
  }

  const explicitIndicator = indicators.findIndex(i => i.classList.contains('active'));
  if (explicitIndicator >= 0) {
    if (explicitIndicator !== currentSlide) {
      if (indicators[currentSlide]) indicators[currentSlide].classList.remove('active');
      currentSlide = explicitIndicator;
      if (slides[currentSlide]) slides[currentSlide].classList.add('active');
    }
  } else {
    if (indicators[0]) indicators[0].classList.add('active');
  }
}

function attachEvents() {
  if (pauseBtn) pauseBtn.addEventListener('click', pausePlayHandler);
  if (prevBtn) prevBtn.addEventListener('click', prevHandler);
  if (nextBtn) nextBtn.addEventListener('click', nextHandler);

  if (indicatorsContainer) indicatorsContainer.addEventListener('click', indicatorClickHandler);

  if (slidesContainer) {
    slidesContainer.addEventListener('touchstart', swipeStartHandler, { passive: true });
    slidesContainer.addEventListener('touchend', swipeEndHandler, { passive: true });

    slidesContainer.addEventListener('mousedown', swipeStartHandler);
    window.addEventListener('mouseup', function (e) {
      if (swipeStartX !== 0) swipeEndHandler(e);
    });

    // ресайз — пересчитать ширину слайда
    window.addEventListener('resize', updateSizes);
  }

  document.addEventListener('keydown', keydownHandler);
}

function init() {
  // обновляем коллекции и счётчик
  slides = Array.from(document.querySelectorAll('#slides-container .slide'));
  indicators = Array.from(document.querySelectorAll('#indicators-container .indicator'));
  SLIDES_COUNT = slides.length;

  if (SLIDES_COUNT === 0) return;

  ensureInitialActive();
  updateSizes();
  attachEvents();
  startTimer();
}

/* Запуск init после загрузки DOM */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
