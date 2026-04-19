'use strict';

// ─── Onboarding ───────────────────────────────────────────────
const TOTAL_STEPS = 6;
let currentStep   = 1;
let _onboardingKey = 'rm-onboarding-done';

function setOnboardingUser(username) {
  _onboardingKey = `rm-onboarding-done-${username}`;
}

function checkOnboarding() {
  if (!localStorage.getItem(_onboardingKey)) {
    startOnboarding();
  }
}

function startOnboarding() {
  currentStep = 1;
  updateOnboardingUI();
  document.getElementById('onboardingOverlay').classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeOnboarding() {
  document.getElementById('onboardingOverlay').classList.remove('active');
  document.body.style.overflow = '';
  localStorage.setItem(_onboardingKey, 'true');
}

function nextOnboardingStep() {
  if (currentStep < TOTAL_STEPS) {
    currentStep++;
    updateOnboardingUI();
  } else {
    closeOnboarding();
  }
}

function prevOnboardingStep() {
  if (currentStep > 1) {
    currentStep--;
    updateOnboardingUI();
  }
}

function updateOnboardingUI() {
  // Étapes
  document.querySelectorAll('.onboarding-step').forEach(el => {
    el.classList.remove('active');
  });
  const active = document.querySelector(`.onboarding-step[data-step="${currentStep}"]`);
  if (active) active.classList.add('active');

  // Barre de progression
  const pct = (currentStep / TOTAL_STEPS) * 100;
  document.getElementById('onboardingProgressBar').style.width = pct + '%';

  // Bouton suivant / terminer
  const nextBtn = document.getElementById('obNextBtn');
  if (currentStep === TOTAL_STEPS) {
    nextBtn.innerHTML = t('ob_btn_start') + ' <i class="bi bi-check-lg ms-1"></i>';
  } else {
    nextBtn.innerHTML = t('ob_btn_next') + ' <i class="bi bi-arrow-right ms-1"></i>';
  }

  // Bouton précédent (masqué à la première étape)
  const prevBtn = document.getElementById('obPrevBtn');
  prevBtn.style.visibility = currentStep === 1 ? 'hidden' : 'visible';

  // Bouton passer (masqué à la dernière étape)
  const skipBtn = document.getElementById('obSkipBtn');
  skipBtn.style.display = currentStep === TOTAL_STEPS ? 'none' : 'block';

  // Points de navigation
  const dotsEl = document.getElementById('obDots');
  dotsEl.innerHTML = Array.from({ length: TOTAL_STEPS }, (_, i) =>
    `<span class="ob-dot ${i + 1 === currentStep ? 'active' : ''}" onclick="goToStep(${i + 1})"></span>`
  ).join('');
}

function goToStep(step) {
  currentStep = step;
  updateOnboardingUI();
}
