/**
 * public/js/app-user-profile.js
 * =============================
 * Role: User (Pasien)
 * Multi-Step Profile Slide Form & Clinical Intake Engine (32 Biomarkers).
 */

// Multi-Step Profile Slide Form & Clinical Intake Engine
// --------------------------------------------------------------------------
function getUserProfile() {
  try {
    const raw = localStorage.getItem(USER_PROFILE_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function saveUserProfile(profile) {
  try {
    profile.updatedAt = new Date().toISOString();
    localStorage.setItem(USER_PROFILE_STORAGE_KEY, JSON.stringify(profile));
    return true;
  } catch (e) {
    console.error('Failed to save profile to localStorage:', e);
    return false;
  }
}

function clearUserProfile() {
  try {
    localStorage.removeItem(USER_PROFILE_STORAGE_KEY);
    return true;
  } catch (e) {
    return false;
  }
}

function calculateBMI(weightKg, heightCm) {
  const w = parseFloat(weightKg);
  const h = parseFloat(heightCm);
  if (!w || !h || w <= 0 || h <= 0) return null;
  const heightM = h / 100;
  const bmi = +(w / (heightM * heightM)).toFixed(1);
  let category = 'Normal';
  let pillClass = 'normal';
  if (bmi < 18.5) {
    category = 'Underweight';
    pillClass = 'underweight';
  } else if (bmi < 25) {
    category = 'Normal';
    pillClass = 'normal';
  } else if (bmi < 30) {
    category = 'Overweight';
    pillClass = 'overweight';
  } else {
    category = 'Obesitas';
    pillClass = 'obese';
  }
  return { bmi, category, pillClass };
}

function renderProfileSlideCard(formId) {
  const saved = getUserProfile();
  const hasSaved = !!(saved && saved.name);
  const TOTAL_STEPS = 16;
  const initialStep = hasSaved ? TOTAL_STEPS : 1;
  const initialProgress = hasSaved ? 100 : (100 / TOTAL_STEPS);

  const data = hasSaved ? {
    // Reguler
    name: saved.name || '',
    age: parseInt(saved.age) || 40,
    gender: saved.gender || '',
    ethnicity: saved.ethnicity ?? 0,
    educationLevel: saved.educationLevel ?? 1,
    height: saved.height || '',
    weight: saved.weight || '',
    // Gaya Hidup
    smoking: saved.smoking ?? 0,
    alcoholConsumption: saved.alcoholConsumption ?? 5,
    physicalActivity: saved.physicalActivity ?? 5,
    dietQuality: saved.dietQuality ?? 5,
    sleepQuality: saved.sleepQuality ?? 7,
    // Riwayat Penyakit
    familyHistoryAlzheimers: saved.familyHistoryAlzheimers ?? 0,
    cardiovascularDisease: saved.cardiovascularDisease ?? 0,
    diabetes: saved.diabetes ?? 0,
    depression: saved.depression ?? 0,
    headInjury: saved.headInjury ?? 0,
    hypertension: saved.hypertension ?? 0,
    // Biomarker Tekanan Darah
    systolicBP: saved.systolicBP ?? 120,
    diastolicBP: saved.diastolicBP ?? 80,
    // Biomarker Kolesterol
    cholesterolTotal: saved.cholesterolTotal ?? 200,
    cholesterolLDL: saved.cholesterolLDL ?? 100,
    cholesterolHDL: saved.cholesterolHDL ?? 50,
    cholesterolTriglycerides: saved.cholesterolTriglycerides ?? 150,
    // Skor Kognitif
    mmse: saved.mmse ?? 25,
    functionalAssessment: saved.functionalAssessment ?? 7,
    adl: saved.adl ?? 7,
    // Gejala Kognitif Spesifik
    memoryComplaints: saved.memoryComplaints ?? 0,
    behavioralProblems: saved.behavioralProblems ?? 0,
    confusion: saved.confusion ?? 0,
    disorientation: saved.disorientation ?? 0,
    personalityChanges: saved.personalityChanges ?? 0,
    difficultyCompletingTasks: saved.difficultyCompletingTasks ?? 0,
    forgetfulness: saved.forgetfulness ?? 0,
    // Legacy
    comorbidities: Array.isArray(saved.comorbidities) ? saved.comorbidities : [],
    symptoms: Array.isArray(saved.symptoms) ? saved.symptoms : [],
    familyHistory: saved.familyHistory || 'no'
  } : {
    name: '', age: 40, gender: '',
    ethnicity: 0, educationLevel: 1,
    height: '', weight: '',
    smoking: 0, alcoholConsumption: 5, physicalActivity: 5, dietQuality: 5, sleepQuality: 7,
    familyHistoryAlzheimers: 0, cardiovascularDisease: 0, diabetes: 0, depression: 0, headInjury: 0, hypertension: 0,
    systolicBP: 120, diastolicBP: 80,
    cholesterolTotal: 200, cholesterolLDL: 100, cholesterolHDL: 50, cholesterolTriglycerides: 150,
    mmse: 25, functionalAssessment: 7, adl: 7,
    memoryComplaints: 0, behavioralProblems: 0, confusion: 0, disorientation: 0,
    personalityChanges: 0, difficultyCompletingTasks: 0, forgetfulness: 0,
    comorbidities: [], symptoms: [], familyHistory: 'no'
  };

  activeProfileForms[formId] = {
    currentStep: initialStep,
    totalSteps: TOTAL_STEPS,
    data: data
  };

  const bmiInfo = calculateBMI(data.weight, data.height);

  // Helper: slider row
  function sliderRow(id, label, min, max, value, unit = '', step = 1) {
    const pct = ((value - min) / (max - min)) * 100;
    return `
      <div class="tf-adv-slider-group">
        <div class="tf-adv-slider-header">
          <span class="tf-adv-slider-label">${label}</span>
          <span class="tf-adv-slider-val" id="${formId}_${id}_val">${value}${unit}</span>
        </div>
        <input type="range" min="${min}" max="${max}" step="${step}" value="${value}"
          class="tf-slider tf-adv-slider" id="${formId}_${id}"
          style="--slider-pct:${pct}%"
          oninput="onAdvSlider('${formId}','${id}',this.value,'${unit}')" />
        <div class="tf-adv-slider-range"><span>${min}${unit}</span><span>${max}${unit}</span></div>
      </div>`;
  }

  // Helper: binary toggle row
  function binaryRow(id, label, trueLabel = 'Ya', falseLabel = 'Tidak') {
    const val = data[id] ?? 0;
    return `
      <div class="tf-binary-row">
        <span class="tf-binary-label">${label}</span>
        <div class="tf-binary-toggle">
          <button type="button" class="tf-binary-btn ${val === 0 ? 'active-no' : ''}" data-v="0"
            onclick="onBinaryToggle('${formId}','${id}',0,this)">${falseLabel}</button>
          <button type="button" class="tf-binary-btn ${val === 1 ? 'active-yes' : ''}" data-v="1"
            onclick="onBinaryToggle('${formId}','${id}',1,this)">${trueLabel}</button>
        </div>
      </div>`;
  }

  return `
    <div class="profile-slide-card" id="${formId}">
      <div class="profile-slide-header">
        <div class="profile-slide-title">
          <svg class="profile-slide-title-icon" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
          </svg>
          <span>Data Diri &amp; Klinis Pasien</span>
        </div>
        <span class="profile-slide-step-counter" id="${formId}_counter">${initialStep} / ${TOTAL_STEPS}</span>
      </div>

      <!-- Phase label bar -->
      <div class="profile-phase-bar" id="${formId}_phasebar">
        <div class="profile-phase-steps">
          <span class="profile-phase-tag phase-reguler ${initialStep <= 9 ? 'is-active' : 'is-completed'}" id="${formId}_tag_reguler">
            <span class="phase-tag-icon">${initialStep > 9 ? '✓' : '📋'}</span>
            <span>Reguler</span>
          </span>
          <svg class="profile-phase-sep" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
          <span class="profile-phase-tag phase-advanced ${initialStep >= 10 ? 'is-active' : 'is-upcoming'}" id="${formId}_tag_advanced">
            <span class="phase-tag-icon">🔬</span>
            <span>Klinis Lanjutan</span>
          </span>
        </div>
        <span class="profile-progress-pct" id="${formId}_pct">${Math.round(initialProgress)}%</span>
      </div>

      <div class="profile-progress-bar">
        <div class="profile-progress-fill" id="${formId}_progress" style="width: ${initialProgress}%"></div>
      </div>

      <div class="slide-track-viewport">
        <div class="slide-track" id="${formId}_track">

          <!-- ══════════════════════════════════════════════════════════
               BAGIAN REGULER (Slide 1–9)
               ══════════════════════════════════════════════════════════ -->

          <!-- SLIDE 1: Nama -->
          <div class="slide-pane typeform-pane ${initialStep === 1 ? 'active' : ''}" data-step="1">
            <div class="tf-section-label reguler-label">📋 Data Dasar</div>
            <div class="tf-question-number">01 <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg></div>
            <div class="tf-question-label">Siapa nama atau panggilan Anda? <span class="tf-required">*</span></div>
            <div class="tf-hint">Nama panggilan sudah cukup — digunakan untuk mempersonalisasi konsultasi.</div>
            <input type="text" class="tf-input" id="${formId}_name" placeholder="Nama atau panggilan..."
              value="${escapeHtml(data.name)}"
              oninput="onProfileInput('${formId}', 'name', this.value)"
              onkeyup="onProfileInput('${formId}', 'name', this.value)"
              onchange="onProfileInput('${formId}', 'name', this.value)"
              onkeydown="if(event.key === 'Enter') { event.preventDefault(); nextProfileSlide('${formId}'); }"
              autocomplete="off" autofocus />
          </div>

          <!-- SLIDE 2: Usia -->
          <div class="slide-pane typeform-pane ${initialStep === 2 ? 'active' : ''}" data-step="2">
            <div class="tf-section-label reguler-label">📋 Data Dasar</div>
            <div class="tf-question-number">02 <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg></div>
            <div class="tf-question-label">Berapa usia Anda saat ini? <span class="tf-required">*</span></div>
            <div class="tf-hint">Usia adalah faktor risiko utama dalam diagnosis Alzheimer.</div>
            <div class="tf-age-display" id="${formId}_age_display">${data.age} <span>tahun</span></div>
            <div class="tf-slider-wrap">
              <span class="tf-slider-label">1</span>
              <input type="range" min="1" max="100" value="${data.age}" class="tf-slider" id="${formId}_age"
                oninput="onProfileAgeSlider('${formId}', this.value)" />
              <span class="tf-slider-label">100</span>
            </div>
            <div class="tf-age-risk" id="${formId}_age_risk">Usia dewasa — risiko Alzheimer rendah hingga menengah</div>
          </div>

          <!-- SLIDE 3: Jenis Kelamin -->
          <div class="slide-pane typeform-pane ${initialStep === 3 ? 'active' : ''}" data-step="3">
            <div class="tf-section-label reguler-label">📋 Data Dasar</div>
            <div class="tf-question-number">03 <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg></div>
            <div class="tf-question-label">Jenis kelamin biologis Anda? <span class="tf-required">*</span></div>
            <div class="tf-hint">Digunakan sebagai parameter biomarker dalam model prediktif kami.</div>
            <div class="tf-gender-grid">
              <button type="button" class="tf-gender-btn ${data.gender === 'male' ? 'active' : ''}" data-gender="male" id="${formId}_gender_male" onclick="onProfileGender('${formId}', 'male')">
                <div class="tf-gender-icon"><svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor"><path d="M9 11.75A2.25 2.25 0 1 1 11.25 14 2.25 2.25 0 0 1 9 11.75M16.5 3h4.5v4.5h-1.5V5.56l-4.91 4.91A5.25 5.25 0 1 1 13 9.09l4.91-4.91H16.5z"/></svg></div>
                <span>Laki-laki</span>
              </button>
              <button type="button" class="tf-gender-btn ${data.gender === 'female' ? 'active' : ''}" data-gender="female" id="${formId}_gender_female" onclick="onProfileGender('${formId}', 'female')">
                <div class="tf-gender-icon"><svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor"><path d="M11.5 2a5.5 5.5 0 1 0 5.5 5.5A5.51 5.51 0 0 0 11.5 2zm0 9A3.5 3.5 0 1 1 15 7.5 3.5 3.5 0 0 1 11.5 11zM12.5 13h-2v3H8v2h2.5v3h2v-3H15v-2h-2.5z"/></svg></div>
                <span>Perempuan</span>
              </button>
            </div>
          </div>

          <!-- SLIDE 4: Demografi (Etnisitas + Pendidikan) -->
          <div class="slide-pane typeform-pane ${initialStep === 4 ? 'active' : ''}" data-step="4">
            <div class="tf-section-label reguler-label">📋 Data Dasar</div>
            <div class="tf-question-number">04 <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg></div>
            <div class="tf-question-label">Latar belakang & pendidikan Anda? <span class="tf-optional">(opsional)</span></div>
            <div class="tf-hint">Faktor demografi untuk akurasi model prediktif populasi Asia.</div>
            <div class="tf-adv-group">
              <div class="tf-adv-field-label">Etnisitas</div>
              <div class="tf-chip-row" id="${formId}_ethnicity_chips">
                ${[['Kaukasia', 0], ['Asia-Amerika', 1], ['Afrika-Amerika', 2], ['Lainnya', 3]].map(([lbl, val]) =>
    `<button type="button" class="tf-chip-btn ${data.ethnicity === val ? 'selected' : ''}" data-v="${val}"
                    onclick="onChipSelect('${formId}','ethnicity',${val},this)">${lbl}</button>`
  ).join('')}
              </div>
              <div class="tf-adv-field-label" style="margin-top:14px">Tingkat Pendidikan</div>
              <div class="tf-chip-row" id="${formId}_educationLevel_chips">
                ${[['Tidak Sekolah', 0], ['SMA', 1], ['D3/S1', 2], ['S2/S3', 3]].map(([lbl, val]) =>
    `<button type="button" class="tf-chip-btn ${data.educationLevel === val ? 'selected' : ''}" data-v="${val}"
                    onclick="onChipSelect('${formId}','educationLevel',${val},this)">${lbl}</button>`
  ).join('')}
              </div>
            </div>
          </div>

          <!-- SLIDE 5: Tinggi Badan -->
          <div class="slide-pane typeform-pane ${initialStep === 5 ? 'active' : ''}" data-step="5">
            <div class="tf-section-label reguler-label">📋 Data Fisik</div>
            <div class="tf-question-number">05 <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg></div>
            <div class="tf-question-label">Berapa tinggi badan Anda? <span class="tf-required">*</span></div>
            <div class="tf-hint">Digunakan bersama berat badan untuk menghitung BMI.</div>
            <div class="tf-unit-input-wrap">
              <input type="number" min="100" max="240" class="tf-unit-input" id="${formId}_height" placeholder="168" value="${data.height || ''}"
                oninput="onProfileInput('${formId}', 'height', this.value)"
                onkeyup="onProfileInput('${formId}', 'height', this.value)"
                onchange="onProfileInput('${formId}', 'height', this.value)"
                onkeydown="if(event.key === 'Enter') { event.preventDefault(); nextProfileSlide('${formId}'); }" />
              <span class="tf-unit-badge">cm</span>
            </div>
            <div class="tf-range-hint">Rentang normal: 100 – 240 cm</div>
          </div>

          <!-- SLIDE 6: Berat Badan & BMI -->
          <div class="slide-pane typeform-pane ${initialStep === 6 ? 'active' : ''}" data-step="6">
            <div class="tf-section-label reguler-label">📋 Data Fisik</div>
            <div class="tf-question-number">06 <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg></div>
            <div class="tf-question-label">Berapa berat badan Anda? <span class="tf-required">*</span></div>
            <div class="tf-hint">Berat badan untuk menghitung BMI secara otomatis.</div>
            <div class="tf-unit-input-wrap">
              <input type="number" min="30" max="250" class="tf-unit-input" id="${formId}_weight" placeholder="65" value="${data.weight || ''}"
                oninput="onProfileInput('${formId}', 'weight', this.value)"
                onkeyup="onProfileInput('${formId}', 'weight', this.value)"
                onchange="onProfileInput('${formId}', 'weight', this.value)"
                onkeydown="if(event.key === 'Enter') { event.preventDefault(); nextProfileSlide('${formId}'); }" />
              <span class="tf-unit-badge">kg</span>
            </div>
            <div class="profile-bmi-box" id="${formId}_bmi_box" style="margin-top:14px">
              <span>Estimasi BMI:</span>
              <div style="display:flex;align-items:center;gap:8px;">
                <span class="profile-bmi-val" id="${formId}_bmi_val">${bmiInfo ? bmiInfo.bmi : '—'}</span>
                <span class="profile-bmi-pill ${bmiInfo ? bmiInfo.pillClass : ''}" id="${formId}_bmi_pill" style="${bmiInfo ? 'display:inline-block' : 'display:none'}">${bmiInfo ? bmiInfo.category : 'Normal'}</span>
              </div>
            </div>
          </div>

          <!-- SLIDE 7: Gaya Hidup -->
          <div class="slide-pane typeform-pane ${initialStep === 7 ? 'active' : ''}" data-step="7">
            <div class="tf-section-label reguler-label">📋 Gaya Hidup</div>
            <div class="tf-question-number">07 <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg></div>
            <div class="tf-question-label">Gaya hidup harian Anda? <span class="tf-required">*</span></div>
            <div class="tf-hint">Faktor gaya hidup berpengaruh besar pada risiko kognitif. Geser slider ke posisi yang sesuai.</div>
            <div class="tf-adv-group">
              <div class="tf-adv-field-label" style="margin-bottom:4px">Merokok</div>
              <div class="tf-binary-row">
                <span class="tf-binary-label">Apakah Anda merokok?</span>
                <div class="tf-binary-toggle">
                  <button type="button" class="tf-binary-btn ${data.smoking === 0 ? 'active-no' : ''}" data-v="0"
                    onclick="onBinaryToggle('${formId}','smoking',0,this)">Tidak</button>
                  <button type="button" class="tf-binary-btn ${data.smoking === 1 ? 'active-yes' : ''}" data-v="1"
                    onclick="onBinaryToggle('${formId}','smoking',1,this)">Ya</button>
                </div>
              </div>
              ${sliderRow('alcoholConsumption', 'Konsumsi Alkohol', 0, 20, data.alcoholConsumption, ' unit/minggu')}
              ${sliderRow('physicalActivity', 'Aktivitas Fisik', 0, 10, data.physicalActivity, ' jam/minggu')}
              ${sliderRow('dietQuality', 'Kualitas Diet', 0, 10, data.dietQuality, '/10')}
              ${sliderRow('sleepQuality', 'Kualitas Tidur', 4, 10, data.sleepQuality, '/10')}
            </div>
          </div>

          <!-- SLIDE 8: Riwayat Penyakit -->
          <div class="slide-pane typeform-pane ${initialStep === 8 ? 'active' : ''}" data-step="8">
            <div class="tf-section-label reguler-label">📋 Riwayat Medis</div>
            <div class="tf-question-number">08 <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg></div>
            <div class="tf-question-label">Riwayat kondisi medis? <span class="tf-optional">(opsional)</span></div>
            <div class="tf-hint">Tandai kondisi yang Anda miliki atau pernah terdiagnosis.</div>
            <div class="tf-adv-group">
              ${binaryRow('familyHistoryAlzheimers', '🧬 Riwayat Keluarga Alzheimer')}
              ${binaryRow('cardiovascularDisease', '❤️ Penyakit Kardiovaskular')}
              ${binaryRow('diabetes', '🩸 Diabetes')}
              ${binaryRow('depression', '🧠 Depresi')}
              ${binaryRow('headInjury', '🤕 Riwayat Cedera Kepala')}
              ${binaryRow('hypertension', '💊 Hipertensi')}
            </div>
          </div>

          <!-- SLIDE 9: Riwayat Keluarga (Alzheimer spesifik) -->
          <div class="slide-pane typeform-pane ${initialStep === 9 ? 'active' : ''}" data-step="9">
            <div class="tf-section-label reguler-label">📋 Riwayat Keluarga</div>
            <div class="tf-question-number">09 <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg></div>
            <div class="tf-question-label">Adakah riwayat keluarga dengan Alzheimer atau Demensia? <span class="tf-required">*</span></div>
            <div class="tf-hint">Faktor genetik meningkatkan risiko hingga 2× lipat jika ada kerabat tingkat pertama yang terdiagnosis.</div>
            <div class="tf-family-grid">
              <button type="button" class="tf-family-btn ${data.familyHistory === 'yes' ? 'active' : ''}" data-val="yes" id="${formId}_fam_yes" onclick="onProfileFamilyHistory('${formId}', 'yes')">
                <div class="tf-family-icon tf-fam-yes">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>
                </div>
                <div class="tf-family-label">Ya, ada riwayat</div>
                <div class="tf-family-sub">Keluarga tingkat pertama</div>
              </button>
              <button type="button" class="tf-family-btn ${data.familyHistory === 'no' ? 'active' : ''}" data-val="no" id="${formId}_fam_no" onclick="onProfileFamilyHistory('${formId}', 'no')">
                <div class="tf-family-icon tf-fam-no">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                </div>
                <div class="tf-family-label">Tidak ada</div>
                <div class="tf-family-sub">Tidak diketahui riwayatnya</div>
              </button>
              <button type="button" class="tf-family-btn ${data.familyHistory === 'unknown' ? 'active' : ''}" data-val="unknown" id="${formId}_fam_unknown" onclick="onProfileFamilyHistory('${formId}', 'unknown')">
                <div class="tf-family-icon tf-fam-unknown">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z"/></svg>
                </div>
                <div class="tf-family-label">Kurang yakin</div>
                <div class="tf-family-sub">Informasi tidak lengkap</div>
              </button>
            </div>
          </div>

          <!-- ══════════════════════════════════════════════════════════
               BAGIAN KLINIS LANJUTAN (Slide 10–16)
               ══════════════════════════════════════════════════════════ -->

          <!-- SLIDE 10: Tekanan Darah -->
          <div class="slide-pane typeform-pane ${initialStep === 10 ? 'active' : ''}" data-step="10">
            <div class="tf-section-label advanced-label">🔬 Biomarker Klinis</div>
            <div class="tf-question-number">10 <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg></div>
            <div class="tf-question-label">Tekanan darah Anda? <span class="tf-optional">(opsional)</span></div>
            <div class="tf-hint">Masukkan nilai tekanan darah terakhir Anda. Jika tidak tahu, nilai default normal akan digunakan.</div>
            <div class="tf-adv-group">
              <div class="tf-adv-field-label">Tekanan Sistolik (mmHg)</div>
              <div class="tf-unit-input-wrap" style="margin-bottom:12px">
                <input type="number" min="90" max="180" class="tf-unit-input" id="${formId}_systolicBP"
                  placeholder="120" value="${data.systolicBP}"
                  oninput="onProfileInput('${formId}', 'systolicBP', this.value)"
                  onchange="onProfileInput('${formId}', 'systolicBP', this.value)"
                  onkeydown="if(event.key === 'Enter') { event.preventDefault(); nextProfileSlide('${formId}'); }" />
                <span class="tf-unit-badge">mmHg</span>
              </div>
              <div class="tf-adv-field-label">Tekanan Diastolik (mmHg)</div>
              <div class="tf-unit-input-wrap">
                <input type="number" min="60" max="120" class="tf-unit-input" id="${formId}_diastolicBP"
                  placeholder="80" value="${data.diastolicBP}"
                  oninput="onProfileInput('${formId}', 'diastolicBP', this.value)"
                  onchange="onProfileInput('${formId}', 'diastolicBP', this.value)"
                  onkeydown="if(event.key === 'Enter') { event.preventDefault(); nextProfileSlide('${formId}'); }" />
                <span class="tf-unit-badge">mmHg</span>
              </div>
              <div class="tf-range-hint" style="margin-top:8px">Normal: Sistolik 90–120 | Diastolik 60–80 mmHg</div>
            </div>
          </div>

          <!-- SLIDE 11: Biomarker Kolesterol -->
          <div class="slide-pane typeform-pane ${initialStep === 11 ? 'active' : ''}" data-step="11">
            <div class="tf-section-label advanced-label">🔬 Biomarker Klinis</div>
            <div class="tf-question-number">11 <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg></div>
            <div class="tf-question-label">Hasil pemeriksaan kolesterol? <span class="tf-optional">(opsional)</span></div>
            <div class="tf-hint">Data dari hasil lab terbaru Anda (mg/dL). Lewati jika tidak memiliki data.</div>
            <div class="tf-adv-group">
              <div class="tf-adv-two-col">
                <div>
                  <div class="tf-adv-field-label">Total Kolesterol</div>
                  <div class="tf-unit-input-wrap">
                    <input type="number" min="100" max="400" class="tf-unit-input tf-unit-sm" id="${formId}_cholesterolTotal"
                      value="${data.cholesterolTotal}"
                      oninput="onProfileInput('${formId}', 'cholesterolTotal', this.value)" />
                    <span class="tf-unit-badge">mg/dL</span>
                  </div>
                </div>
                <div>
                  <div class="tf-adv-field-label">LDL</div>
                  <div class="tf-unit-input-wrap">
                    <input type="number" min="50" max="300" class="tf-unit-input tf-unit-sm" id="${formId}_cholesterolLDL"
                      value="${data.cholesterolLDL}"
                      oninput="onProfileInput('${formId}', 'cholesterolLDL', this.value)" />
                    <span class="tf-unit-badge">mg/dL</span>
                  </div>
                </div>
                <div>
                  <div class="tf-adv-field-label">HDL</div>
                  <div class="tf-unit-input-wrap">
                    <input type="number" min="20" max="100" class="tf-unit-input tf-unit-sm" id="${formId}_cholesterolHDL"
                      value="${data.cholesterolHDL}"
                      oninput="onProfileInput('${formId}', 'cholesterolHDL', this.value)" />
                    <span class="tf-unit-badge">mg/dL</span>
                  </div>
                </div>
                <div>
                  <div class="tf-adv-field-label">Trigliserida</div>
                  <div class="tf-unit-input-wrap">
                    <input type="number" min="50" max="400" class="tf-unit-input tf-unit-sm" id="${formId}_cholesterolTriglycerides"
                      value="${data.cholesterolTriglycerides}"
                      oninput="onProfileInput('${formId}', 'cholesterolTriglycerides', this.value)" />
                    <span class="tf-unit-badge">mg/dL</span>
                  </div>
                </div>
              </div>
              <div class="tf-range-hint" style="margin-top:8px">Normal Total: &lt;200 | LDL: &lt;130 | HDL: &gt;40 | TG: &lt;150 mg/dL</div>
            </div>
          </div>

          <!-- SLIDE 12: Skor MMSE -->
          <div class="slide-pane typeform-pane ${initialStep === 12 ? 'active' : ''}" data-step="12">
            <div class="tf-section-label advanced-label">🔬 Skor Kognitif</div>
            <div class="tf-question-number">12 <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg></div>
            <div class="tf-question-label">Skor uji kognitif Anda? <span class="tf-optional">(opsional)</span></div>
            <div class="tf-hint">Jika Anda pernah diperiksa dokter, masukkan skor berikut. Jika tidak, nilai perkiraan akan digunakan.</div>
            <div class="tf-adv-group">
              ${sliderRow('mmse', 'MMSE (Mini-Mental State Exam)', 0, 30, data.mmse, '/30')}
              <div class="tf-mmse-legend">
                <span class="mmse-tag severe">0–9: Berat</span>
                <span class="mmse-tag moderate">10–18: Sedang</span>
                <span class="mmse-tag mild">19–23: Ringan</span>
                <span class="mmse-tag normal">24–30: Normal</span>
              </div>
              ${sliderRow('functionalAssessment', 'Functional Assessment', 0, 10, data.functionalAssessment, '/10')}
              ${sliderRow('adl', 'ADL (Aktivitas Kehidupan Sehari-hari)', 0, 10, data.adl, '/10')}
            </div>
          </div>

          <!-- SLIDE 13: Keluhan Memori & Perilaku -->
          <div class="slide-pane typeform-pane ${initialStep === 13 ? 'active' : ''}" data-step="13">
            <div class="tf-section-label advanced-label">🔬 Keluhan Kognitif</div>
            <div class="tf-question-number">13 <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg></div>
            <div class="tf-question-label">Keluhan fungsi memori & perilaku? <span class="tf-optional">(opsional)</span></div>
            <div class="tf-hint">Tandai gejala yang sering Anda rasakan dalam 3–6 bulan terakhir.</div>
            <div class="tf-adv-group">
              ${binaryRow('memoryComplaints', '🧠 Sering lupa (Keluhan Memori)')}
              ${binaryRow('behavioralProblems', '😤 Masalah perilaku / emosi')}
              ${binaryRow('confusion', '😵 Bingung / mudah tersesat')}
              ${binaryRow('disorientation', '🗺️ Disorientasi waktu & tempat')}
              ${binaryRow('personalityChanges', '🔄 Perubahan kepribadian drastis')}
              ${binaryRow('difficultyCompletingTasks', '📋 Sulit menyelesaikan tugas rutin')}
              ${binaryRow('forgetfulness', '📦 Sering lupa menaruh barang')}
            </div>
          </div>

          <!-- SLIDE 14: Keluhan Kognitif (chips legacy + gejala lain) -->
          <div class="slide-pane typeform-pane ${initialStep === 14 ? 'active' : ''}" data-step="14">
            <div class="tf-section-label advanced-label">🔬 Keluhan Kognitif</div>
            <div class="tf-question-number">14 <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg></div>
            <div class="tf-question-label">Keluhan fungsi kognitif tambahan? <span class="tf-required">*</span></div>
            <div class="tf-hint">Pilih semua gejala yang Anda rasakan (minimal 1 pilihan).</div>
            <div class="profile-chips-grid" id="${formId}_symptoms_grid">
              <div class="profile-chip ${data.symptoms.includes('Sering lupa peristiwa terkini') ? 'selected' : ''}" data-val="Sering lupa peristiwa terkini" onclick="onProfileSymptomToggle('${formId}', this, 'Sering lupa peristiwa terkini')">
                <span>Sering lupa peristiwa yang baru terjadi</span>
              </div>
              <div class="profile-chip ${data.symptoms.includes('Sulit fokus & konsentrasi') ? 'selected' : ''}" data-val="Sulit fokus & konsentrasi" onclick="onProfileSymptomToggle('${formId}', this, 'Sulit fokus & konsentrasi')">
                <span>Sulit fokus / menyelesaikan tugas rutin</span>
              </div>
              <div class="profile-chip ${data.symptoms.includes('Sering salah menaruh barang') ? 'selected' : ''}" data-val="Sering salah menaruh barang" onclick="onProfileSymptomToggle('${formId}', this, 'Sering salah menaruh barang')">
                <span>Sering salah taruh barang &amp; bingung mencari</span>
              </div>
              <div class="profile-chip ${data.symptoms.includes('Disorientasi waktu & tempat') ? 'selected' : ''}" data-val="Disorientasi waktu & tempat" onclick="onProfileSymptomToggle('${formId}', this, 'Disorientasi waktu & tempat')">
                <span>Disorientasi waktu atau arah jalan</span>
              </div>
              <div class="profile-chip ${data.symptoms.includes('Pencegahan & skrining umum') ? 'selected' : ''}" data-val="Pencegahan & skrining umum" onclick="onProfileSymptomToggle('${formId}', this, 'Pencegahan & skrining umum')">
                <span>Tidak ada keluhan (skrining preventif)</span>
              </div>
            </div>
          </div>

          <!-- SLIDE 15: Riwayat Penyakit Lain (komorbiditas chips) -->
          <div class="slide-pane typeform-pane ${initialStep === 15 ? 'active' : ''}" data-step="15">
            <div class="tf-section-label advanced-label">🔬 Komorbiditas</div>
            <div class="tf-question-number">15 <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg></div>
            <div class="tf-question-label">Penyakit penyerta yang dimiliki? <span class="tf-optional">(opsional)</span></div>
            <div class="tf-hint">Pilih semua yang sesuai — atau lewati jika tidak ada.</div>
            <div class="profile-chips-grid" id="${formId}_comorbidities_grid">
              <div class="profile-chip ${data.comorbidities.includes('Hipertensi') ? 'selected' : ''}" data-val="Hipertensi" onclick="onProfileComorbidityToggle('${formId}', this, 'Hipertensi')">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                <span>Hipertensi</span>
              </div>
              <div class="profile-chip ${data.comorbidities.includes('Diabetes Mellitus') ? 'selected' : ''}" data-val="Diabetes Mellitus" onclick="onProfileComorbidityToggle('${formId}', this, 'Diabetes Mellitus')">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M7 2v11h3v9l7-12h-4l4-8z"/></svg>
                <span>Diabetes Mellitus</span>
              </div>
              <div class="profile-chip ${data.comorbidities.includes('Kolesterol Tinggi') ? 'selected' : ''}" data-val="Kolesterol Tinggi" onclick="onProfileComorbidityToggle('${formId}', this, 'Kolesterol Tinggi')">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm1 14.93V18h-2v-1.07A4.49 4.49 0 0 1 8 13h2a2.5 2.5 0 0 0 5 0c0-1.5-1-2-2.5-2.5S9 9 9 7.5A3.5 3.5 0 0 1 11 4.07V3h2v1.07A4.49 4.49 0 0 1 16 8h-2a2.5 2.5 0 0 0-5 0c0 1.5 1 2 2.5 2.5s3.5 1.5 3.5 3a3.5 3.5 0 0 1-2 3.43z"/></svg>
                <span>Kolesterol Tinggi</span>
              </div>
              <div class="profile-chip ${data.comorbidities.includes('Penyakit Jantung') ? 'selected' : ''}" data-val="Penyakit Jantung" onclick="onProfileComorbidityToggle('${formId}', this, 'Penyakit Jantung')">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14l-5-5 1.41-1.41L12 14.17l7.59-7.59L21 8l-9 9z"/></svg>
                <span>Penyakit Jantung</span>
              </div>
              <div class="profile-chip ${data.comorbidities.includes('Gangguan Tidur / Insomnia') ? 'selected' : ''}" data-val="Gangguan Tidur / Insomnia" onclick="onProfileComorbidityToggle('${formId}', this, 'Gangguan Tidur / Insomnia')">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12.3 2a10 10 0 0 0-1.9 19.8 10 10 0 0 0 11.4-11.4A10 10 0 0 1 12.3 2z"/></svg>
                <span>Insomnia / Gangguan Tidur</span>
              </div>
              <div class="profile-chip ${data.comorbidities.includes('Tidak Ada') ? 'selected' : ''}" data-val="Tidak Ada" onclick="onProfileComorbidityToggle('${formId}', this, 'Tidak Ada')">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"/></svg>
                <span>Tidak Ada Penyakit Lain</span>
              </div>
            </div>
          </div>

          <!-- SLIDE 16: Konfirmasi Akhir -->
          <div class="slide-pane typeform-pane ${initialStep === 16 ? 'active' : ''}" data-step="16">
            <div class="tf-section-label advanced-label">✅ Konfirmasi</div>
            <div class="tf-question-number">16 <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg></div>
            <div class="tf-question-label">Data Anda siap disimpan!</div>
            <div class="tf-hint">Semua data klinis lengkap akan digunakan untuk prediksi risiko Alzheimer yang akurat oleh model XGBoost Neura.</div>
            <div class="tf-confirmation-box">
              <div class="tf-confirm-row">
                <span class="tf-confirm-icon">📋</span>
                <span>Profil dasar tersimpan</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4CAF50" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <div class="tf-confirm-row">
                <span class="tf-confirm-icon">🧬</span>
                <span>Riwayat medis &amp; gaya hidup</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4CAF50" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <div class="tf-confirm-row">
                <span class="tf-confirm-icon">🔬</span>
                <span>Biomarker klinis lanjutan</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4CAF50" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <div class="tf-confirm-row">
                <span class="tf-confirm-icon">🧠</span>
                <span>Skor &amp; gejala kognitif</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4CAF50" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <div class="tf-confirm-cta">Klik <strong>Simpan &amp; Mulai Konsultasi</strong> untuk memulai prediksi biomarker Alzheimer.</div>
            </div>
          </div>

        </div>
      </div>

      <div class="slide-nav-footer">
        <button type="button" class="slide-btn-prev" id="${formId}_btn_prev"
          style="visibility:${initialStep > 1 ? 'visible' : 'hidden'}"
          onclick="prevProfileSlide('${formId}')">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
          Kembali
        </button>
        <button type="button" class="slide-btn-next" id="${formId}_btn_next"
          ${!hasSaved ? 'disabled' : ''}
          onclick="nextProfileSlide('${formId}')">
          <span>${hasSaved ? '✓ Simpan & Mulai Konsultasi' : 'Lanjut'}</span>
          ${!hasSaved ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>' : ''}
        </button>
      </div>
    </div>
  `;
}



function syncProfileCardToStorage(formId) {
  const card = document.getElementById(formId);
  if (!card) return;

  const saved = getUserProfile();
  const hasSaved = !!(saved && saved.name);
  const TOTAL_STEPS = 16;
  const targetStep = hasSaved ? TOTAL_STEPS : 1;

  const buildData = (s) => ({
    name: s.name || '', age: parseInt(s.age) || 40, gender: s.gender || '',
    ethnicity: s.ethnicity ?? 0, educationLevel: s.educationLevel ?? 1,
    height: s.height || '', weight: s.weight || '',
    smoking: s.smoking ?? 0, alcoholConsumption: s.alcoholConsumption ?? 5,
    physicalActivity: s.physicalActivity ?? 5, dietQuality: s.dietQuality ?? 5, sleepQuality: s.sleepQuality ?? 7,
    familyHistoryAlzheimers: s.familyHistoryAlzheimers ?? 0, cardiovascularDisease: s.cardiovascularDisease ?? 0,
    diabetes: s.diabetes ?? 0, depression: s.depression ?? 0, headInjury: s.headInjury ?? 0, hypertension: s.hypertension ?? 0,
    systolicBP: s.systolicBP ?? 120, diastolicBP: s.diastolicBP ?? 80,
    cholesterolTotal: s.cholesterolTotal ?? 200, cholesterolLDL: s.cholesterolLDL ?? 100,
    cholesterolHDL: s.cholesterolHDL ?? 50, cholesterolTriglycerides: s.cholesterolTriglycerides ?? 150,
    mmse: s.mmse ?? 25, functionalAssessment: s.functionalAssessment ?? 7, adl: s.adl ?? 7,
    memoryComplaints: s.memoryComplaints ?? 0, behavioralProblems: s.behavioralProblems ?? 0,
    confusion: s.confusion ?? 0, disorientation: s.disorientation ?? 0, personalityChanges: s.personalityChanges ?? 0,
    difficultyCompletingTasks: s.difficultyCompletingTasks ?? 0, forgetfulness: s.forgetfulness ?? 0,
    comorbidities: Array.isArray(s.comorbidities) ? s.comorbidities : [],
    symptoms: Array.isArray(s.symptoms) ? s.symptoms : [],
    familyHistory: s.familyHistory || 'no'
  });

  const emptyData = buildData({});

  let form = activeProfileForms[formId];
  if (!form) {
    form = { currentStep: targetStep, totalSteps: TOTAL_STEPS, data: hasSaved ? buildData(saved) : emptyData };
    activeProfileForms[formId] = form;
  } else {
    form.currentStep = targetStep;
    form.totalSteps = TOTAL_STEPS;
    if (hasSaved) form.data = buildData(saved);
  }

  // Sync DOM elements
  const nameInput = document.getElementById(`${formId}_name`);
  if (nameInput) nameInput.value = form.data.name;

  const ageSlider = document.getElementById(`${formId}_age`);
  const ageDisplay = document.getElementById(`${formId}_age_display`);
  if (ageSlider) ageSlider.value = form.data.age;
  if (ageDisplay) ageDisplay.innerHTML = `${form.data.age} <span>tahun</span>`;

  const maleBtn = document.getElementById(`${formId}_gender_male`);
  const femaleBtn = document.getElementById(`${formId}_gender_female`);
  if (maleBtn) maleBtn.classList.toggle('active', form.data.gender === 'male');
  if (femaleBtn) femaleBtn.classList.toggle('active', form.data.gender === 'female');

  const hInput = document.getElementById(`${formId}_height`);
  if (hInput) hInput.value = form.data.height;

  const wInput = document.getElementById(`${formId}_weight`);
  if (wInput) wInput.value = form.data.weight;

  const bmiRes = calculateBMI(form.data.weight, form.data.height);
  const bmiVal = document.getElementById(`${formId}_bmi_val`);
  const bmiPill = document.getElementById(`${formId}_bmi_pill`);
  if (bmiVal && bmiPill) {
    if (bmiRes) {
      bmiVal.textContent = bmiRes.bmi;
      bmiPill.textContent = bmiRes.category;
      bmiPill.className = 'profile-bmi-pill ' + bmiRes.pillClass;
      bmiPill.style.display = 'inline-block';
    } else {
      bmiVal.textContent = '—';
      bmiPill.style.display = 'none';
    }
  }

  const comorbGrid = document.getElementById(`${formId}_comorbidities_grid`);
  if (comorbGrid) {
    comorbGrid.querySelectorAll('.profile-chip').forEach(c => {
      c.classList.toggle('selected', form.data.comorbidities.includes(c.getAttribute('data-val')));
    });
  }

  const sympGrid = document.getElementById(`${formId}_symptoms_grid`);
  if (sympGrid) {
    sympGrid.querySelectorAll('.profile-chip').forEach(c => {
      c.classList.toggle('selected', form.data.symptoms.includes(c.getAttribute('data-val')));
    });
  }

  ['yes', 'no', 'unknown'].forEach(v => {
    const btn = document.getElementById(`${formId}_fam_${v}`);
    if (btn) btn.classList.toggle('active', form.data.familyHistory === v);
  });

  applySlideTransition(formId, 'next');
  updateSlideNavState(formId);
}

// Handler untuk slider advanced (gaya hidup, kognitif)
window.onAdvSlider = function (formId, field, val, unit) {
  const form = getOrCreateProfileForm(formId);
  if (!form) return;
  const numVal = parseFloat(val);
  form.data[field] = numVal;
  const valEl = document.getElementById(`${formId}_${field}_val`);
  if (valEl) valEl.textContent = numVal + (unit || '');
  const sliderEl = document.getElementById(`${formId}_${field}`);
  if (sliderEl) {
    const min = parseFloat(sliderEl.min), max = parseFloat(sliderEl.max);
    sliderEl.style.setProperty('--slider-pct', `${((numVal - min) / (max - min)) * 100}%`);
  }
  updateSlideNavState(formId);
};

// Handler untuk tombol binary (Ya/Tidak)
window.onBinaryToggle = function (formId, field, val, btn) {
  const form = getOrCreateProfileForm(formId);
  if (!form) return;
  form.data[field] = parseInt(val);
  const row = btn.closest('.tf-binary-toggle');
  if (row) {
    row.querySelectorAll('.tf-binary-btn').forEach(b => {
      b.classList.remove('active-yes', 'active-no');
    });
    btn.classList.add(val === '1' ? 'active-yes' : 'active-no');
  }
  updateSlideNavState(formId);
};

// Handler untuk chip select tunggal (Ethnicity, EducationLevel)
window.onChipSelect = function (formId, field, val, btn) {
  const form = getOrCreateProfileForm(formId);
  if (!form) return;
  form.data[field] = parseInt(val);
  const row = btn.closest('.tf-chip-row');
  if (row) {
    row.querySelectorAll('.tf-chip-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
  }
  updateSlideNavState(formId);
};

function getOrCreateProfileForm(formId) {
  if (activeProfileForms[formId]) {
    return activeProfileForms[formId];
  }

  const card = document.getElementById(formId);
  if (!card) return null;

  syncProfileCardToStorage(formId);
  return activeProfileForms[formId];
}

function onProfileInput(formId, field, val) {
  const form = getOrCreateProfileForm(formId);
  if (!form) return;
  form.data[field] = val;

  if (field === 'height' || field === 'weight') {
    const bmiRes = calculateBMI(form.data.weight, form.data.height);
    const valEl = document.getElementById(`${formId}_bmi_val`);
    const pillEl = document.getElementById(`${formId}_bmi_pill`);
    if (valEl && pillEl) {
      if (bmiRes) {
        valEl.textContent = bmiRes.bmi;
        pillEl.textContent = bmiRes.category;
        pillEl.className = 'profile-bmi-pill ' + bmiRes.pillClass;
        pillEl.style.display = 'inline-block';
      } else {
        valEl.textContent = '—';
        pillEl.style.display = 'none';
      }
    }
  }

  updateSlideNavState(formId);
}

function onProfileAgeSlider(formId, val) {
  const form = getOrCreateProfileForm(formId);
  if (!form) return;
  const age = parseInt(val);
  form.data.age = age;

  const displayEl = document.getElementById(`${formId}_age_display`);
  if (displayEl) displayEl.innerHTML = `${age} <span>tahun</span>`;

  const riskEl = document.getElementById(`${formId}_age_risk`);
  if (riskEl) {
    let t = '';
    if (age < 18) t = 'Anak-anak / remaja — profil khusus pediatri';
    else if (age < 40) t = 'Usia muda — risiko Alzheimer sangat rendah';
    else if (age < 50) t = 'Dewasa — risiko rendah, deteksi dini disarankan';
    else if (age < 60) t = 'Pra-lansia — risiko mulai meningkat, pantau biomarker';
    else if (age < 70) t = 'Lansia awal — risiko menengah hingga tinggi';
    else t = 'Lansia — risiko tinggi, konsultasi berkala sangat dianjurkan';
    riskEl.textContent = t;
  }

  const sliderEl = document.getElementById(`${formId}_age`);
  if (sliderEl) {
    const pct = ((age - 1) / 99) * 100;
    sliderEl.style.setProperty('--slider-pct', `${pct}%`);
  }

  updateSlideNavState(formId);
}

function onProfileGender(formId, gender) {
  const form = getOrCreateProfileForm(formId);
  if (!form) return;
  form.data.gender = gender;

  // New Typeform large icon buttons
  const maleBtn = document.getElementById(`${formId}_gender_male`);
  const femaleBtn = document.getElementById(`${formId}_gender_female`);
  if (maleBtn && femaleBtn) {
    maleBtn.classList.toggle('active', gender === 'male');
    femaleBtn.classList.toggle('active', gender === 'female');
  } else {
    // fallback: old segmented style
    const seg = document.getElementById(`${formId}_gender_seg`);
    if (seg) {
      seg.querySelectorAll('.profile-seg-btn').forEach(b => {
        b.classList.toggle('active', b.getAttribute('data-gender') === gender);
      });
    }
  }
  updateSlideNavState(formId);
}

function onProfileComorbidityToggle(formId, el, condition) {
  const form = getOrCreateProfileForm(formId);
  if (!form) return;
  if (!form.data.comorbidities) form.data.comorbidities = [];

  const grid = document.getElementById(`${formId}_comorbidities_grid`);
  if (!grid) return;

  if (condition === 'Tidak Ada') {
    form.data.comorbidities = ['Tidak Ada'];
    const allChips = grid.querySelectorAll('.profile-chip');
    allChips.forEach(c => c.classList.remove('selected'));
    el.classList.add('selected');
  } else {
    form.data.comorbidities = form.data.comorbidities.filter(c => c !== 'Tidak Ada');
    const noneChip = grid.querySelector('.profile-chip[data-val="Tidak Ada"]');
    if (noneChip) noneChip.classList.remove('selected');

    const idx = form.data.comorbidities.indexOf(condition);
    if (idx > -1) {
      form.data.comorbidities.splice(idx, 1);
      el.classList.remove('selected');
    } else {
      form.data.comorbidities.push(condition);
      el.classList.add('selected');
    }
  }
  updateSlideNavState(formId);
}

function onProfileSymptomToggle(formId, el, symptom) {
  const form = getOrCreateProfileForm(formId);
  if (!form) return;
  if (!form.data.symptoms) form.data.symptoms = [];

  const idx = form.data.symptoms.indexOf(symptom);
  if (idx > -1) {
    form.data.symptoms.splice(idx, 1);
    el.classList.remove('selected');
  } else {
    form.data.symptoms.push(symptom);
    el.classList.add('selected');
  }
  updateSlideNavState(formId);
}

function onProfileFamilyHistory(formId, val) {
  const form = getOrCreateProfileForm(formId);
  if (!form) return;
  form.data.familyHistory = val;

  // New Typeform card buttons
  ['yes', 'no', 'unknown'].forEach(v => {
    const btn = document.getElementById(`${formId}_fam_${v}`);
    if (btn) btn.classList.toggle('active', v === val);
  });

  // Fallback: old segmented style
  const seg = document.getElementById(`${formId}_family_seg`);
  if (seg) {
    seg.querySelectorAll('.profile-seg-btn').forEach(b => {
      b.classList.toggle('active', b.getAttribute('data-val') === val);
    });
  }
  updateSlideNavState(formId);
}

function validateProfileSlide(formId, step) {
  const form = getOrCreateProfileForm(formId);
  if (!form) return false;
  const d = form.data || {};

  switch (step) {
    case 1: {
      const domVal = document.getElementById(`${formId}_name`)?.value;
      const nameVal = (typeof d.name === 'string' && d.name.trim().length > 0)
        ? d.name.trim() : (domVal ? domVal.trim() : '');
      return nameVal.length >= 2;
    }
    case 2: {
      const ageVal = parseInt(d.age || 40);
      return !isNaN(ageVal) && ageVal >= 1 && ageVal <= 100;
    }
    case 3: return !!d.gender;
    case 4: return true; // demografi opsional
    case 5: {
      const domVal = document.getElementById(`${formId}_height`)?.value;
      const h = parseFloat(d.height || domVal);
      return !isNaN(h) && h >= 100 && h <= 240;
    }
    case 6: {
      const domVal = document.getElementById(`${formId}_weight`)?.value;
      const w = parseFloat(d.weight || domVal);
      return !isNaN(w) && w >= 30 && w <= 250;
    }
    case 7: return true;  // gaya hidup — selalu valid (slider punya default)
    case 8: return true;  // riwayat penyakit opsional
    case 9: return !!d.familyHistory;
    // Advanced: opsional, selalu lanjut
    case 10: case 11: case 12: case 13: case 15: return true;
    // Slide 14: keluhan kognitif wajib minimal 1
    case 14: return d.symptoms && d.symptoms.length > 0;
    // Slide 16: konfirmasi akhir
    case 16: return true;
    default: return true;
  }
}

function updateSlideNavState(formId) {
  const form = getOrCreateProfileForm(formId);
  if (!form) return;
  const btnNext = document.getElementById(`${formId}_btn_next`);
  if (!btnNext) return;

  const isValid = validateProfileSlide(formId, form.currentStep);
  if (isValid) {
    btnNext.disabled = false;
    btnNext.removeAttribute('disabled');
    btnNext.style.opacity = '1';
    btnNext.style.pointerEvents = 'auto';
    btnNext.style.cursor = 'pointer';
  } else {
    btnNext.disabled = true;
    btnNext.setAttribute('disabled', 'true');
    btnNext.style.opacity = '0.45';
    btnNext.style.pointerEvents = 'none';
    btnNext.style.cursor = 'not-allowed';
  }
}

function nextProfileSlide(formId) {
  const form = getOrCreateProfileForm(formId);
  if (!form) return;

  // Pre-sync DOM input values before validating
  const step = form.currentStep;
  if (step === 1) {
    const el = document.getElementById(`${formId}_name`);
    if (el) form.data.name = el.value.trim();
  } else if (step === 5) {
    const el = document.getElementById(`${formId}_height`);
    if (el) form.data.height = el.value;
  } else if (step === 6) {
    const el = document.getElementById(`${formId}_weight`);
    if (el) form.data.weight = el.value;
  } else if (step === 10) {
    const sEl = document.getElementById(`${formId}_systolicBP`);
    const dEl = document.getElementById(`${formId}_diastolicBP`);
    if (sEl) form.data.systolicBP = parseFloat(sEl.value) || 120;
    if (dEl) form.data.diastolicBP = parseFloat(dEl.value) || 80;
  } else if (step === 11) {
    ['cholesterolTotal', 'cholesterolLDL', 'cholesterolHDL', 'cholesterolTriglycerides'].forEach(f => {
      const el = document.getElementById(`${formId}_${f}`);
      if (el && el.value) form.data[f] = parseFloat(el.value);
    });
  }

  if (!validateProfileSlide(formId, form.currentStep)) {
    updateSlideNavState(formId);
    return;
  }

  if (form.currentStep === form.totalSteps) {
    submitProfileForm(formId);
    return;
  }

  form.currentStep++;
  applySlideTransition(formId, 'next');
}

function prevProfileSlide(formId) {
  const form = getOrCreateProfileForm(formId);
  if (!form || form.currentStep <= 1) return;

  form.currentStep--;
  applySlideTransition(formId, 'prev');
}

function applySlideTransition(formId, direction = 'next') {
  const form = getOrCreateProfileForm(formId);
  if (!form) return;

  const card = document.getElementById(formId);
  if (!card) return;

  const counter = document.getElementById(`${formId}_counter`);
  const progress = document.getElementById(`${formId}_progress`);
  const btnPrev = document.getElementById(`${formId}_btn_prev`);
  const btnNext = document.getElementById(`${formId}_btn_next`);

  // Activate only currentStep slide, hide all others to prevent horizontal spillover
  const panes = card.querySelectorAll('.slide-pane');
  panes.forEach(pane => {
    const stepNum = parseInt(pane.getAttribute('data-step'));
    if (stepNum === form.currentStep) {
      pane.classList.add('active');
      if (direction === 'prev') {
        pane.classList.add('slide-from-prev');
      } else {
        pane.classList.remove('slide-from-prev');
      }
    } else {
      pane.classList.remove('active', 'slide-from-prev');
    }
  });

  if (counter) {
    counter.textContent = `${form.currentStep} / ${form.totalSteps}`;
  }

  const pct = Math.round((form.currentStep / form.totalSteps) * 100);
  if (progress) {
    progress.style.width = `${pct}%`;
  }

  const pctEl = document.getElementById(`${formId}_pct`);
  if (pctEl) {
    pctEl.textContent = `${pct}%`;
  }

  const tagReguler = document.getElementById(`${formId}_tag_reguler`);
  const tagAdvanced = document.getElementById(`${formId}_tag_advanced`);
  if (tagReguler && tagAdvanced) {
    if (form.currentStep <= 9) {
      tagReguler.className = 'profile-phase-tag phase-reguler is-active';
      const icon = tagReguler.querySelector('.phase-tag-icon');
      if (icon) icon.textContent = '📋';
      tagAdvanced.className = 'profile-phase-tag phase-advanced is-upcoming';
    } else {
      tagReguler.className = 'profile-phase-tag phase-reguler is-completed';
      const icon = tagReguler.querySelector('.phase-tag-icon');
      if (icon) icon.textContent = '✓';
      tagAdvanced.className = 'profile-phase-tag phase-advanced is-active';
    }
  }

  if (btnPrev) {
    btnPrev.style.visibility = form.currentStep > 1 ? 'visible' : 'hidden';
  }

  if (btnNext) {
    const isLast = form.currentStep === form.totalSteps;
    const labels = {
      1: 'Lanjut →', 2: 'Konfirmasi Usia', 3: 'Lanjut →',
      4: 'Lanjut ke Fisik', 5: 'Lanjut ke Berat Badan', 6: 'Lanjut ke Gaya Hidup',
      7: 'Lanjut ke Riwayat Penyakit', 8: 'Lanjut ke Riwayat Keluarga',
      9: '🔬 Lanjut ke Data Klinis', 10: 'Lanjut ke Kolesterol',
      11: 'Lanjut ke Skor Kognitif', 12: 'Lanjut ke Keluhan',
      13: 'Lanjut ke Keluhan Lanjutan', 14: 'Lanjut ke Komorbiditas',
      15: 'Lanjut ke Konfirmasi', 16: '✓ Simpan & Mulai Konsultasi'
    };
    const nextLabel = labels[form.currentStep] || 'Lanjut';
    btnNext.innerHTML = `
      <span>${nextLabel}</span>
      ${!isLast ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>' : ''}
    `;
    updateSlideNavState(formId);
  }

  // Auto focus input on the current active slide
  setTimeout(() => {
    if (form.currentStep === 1) document.getElementById(`${formId}_name`)?.focus();
    else if (form.currentStep === 5) document.getElementById(`${formId}_height`)?.focus();
    else if (form.currentStep === 6) document.getElementById(`${formId}_weight`)?.focus();
    else if (form.currentStep === 10) document.getElementById(`${formId}_systolicBP`)?.focus();
  }, 80);
}

function submitProfileForm(formId) {
  const form = getOrCreateProfileForm(formId);
  if (!form) return;

  const d = form.data;
  const bmiInfo = calculateBMI(d.weight, d.height);

  const profile = {
    // Data dasar
    name: d.name.trim(),
    age: parseInt(d.age),
    gender: d.gender,
    ethnicity: d.ethnicity ?? 0,
    educationLevel: d.educationLevel ?? 1,
    height: parseFloat(d.height),
    weight: parseFloat(d.weight),
    bmi: bmiInfo ? bmiInfo.bmi : null,
    bmiCategory: bmiInfo ? bmiInfo.category : 'Normal',
    // Gaya hidup
    smoking: d.smoking ?? 0,
    alcoholConsumption: d.alcoholConsumption ?? 5,
    physicalActivity: d.physicalActivity ?? 5,
    dietQuality: d.dietQuality ?? 5,
    sleepQuality: d.sleepQuality ?? 7,
    // Riwayat penyakit
    familyHistoryAlzheimers: d.familyHistoryAlzheimers ?? 0,
    cardiovascularDisease: d.cardiovascularDisease ?? 0,
    diabetes: d.diabetes ?? 0,
    depression: d.depression ?? 0,
    headInjury: d.headInjury ?? 0,
    hypertension: d.hypertension ?? 0,
    // Biomarker tekanan darah
    systolicBP: d.systolicBP ?? 120,
    diastolicBP: d.diastolicBP ?? 80,
    // Biomarker kolesterol
    cholesterolTotal: d.cholesterolTotal ?? 200,
    cholesterolLDL: d.cholesterolLDL ?? 100,
    cholesterolHDL: d.cholesterolHDL ?? 50,
    cholesterolTriglycerides: d.cholesterolTriglycerides ?? 150,
    // Skor kognitif
    mmse: d.mmse ?? 25,
    functionalAssessment: d.functionalAssessment ?? 7,
    adl: d.adl ?? 7,
    // Gejala kognitif spesifik
    memoryComplaints: d.memoryComplaints ?? 0,
    behavioralProblems: d.behavioralProblems ?? 0,
    confusion: d.confusion ?? 0,
    disorientation: d.disorientation ?? 0,
    personalityChanges: d.personalityChanges ?? 0,
    difficultyCompletingTasks: d.difficultyCompletingTasks ?? 0,
    forgetfulness: d.forgetfulness ?? 0,
    // Legacy
    comorbidities: d.comorbidities || [],
    symptoms: d.symptoms || [],
    familyHistory: d.familyHistory || 'no'
  };

  saveUserProfile(profile);

  // Replace form card with confirmed summary card
  const cardEl = document.getElementById(formId);
  if (cardEl) {
    cardEl.outerHTML = renderSavedProfileCard(profile);
  }

  showToast('Data diri dan profil klinis lengkap berhasil disimpan!', 'success');

  // Trigger personalized consultation follow-up
  startPersonalizedConsultation(profile);
}

function renderSavedProfileCard(p) {
  if (!p) return '';
  const comorbs = (p.comorbidities && p.comorbidities.length > 0)
    ? p.comorbidities.map(c => `<span class="profile-summary-tag">${escapeHtml(c)}</span>`).join('')
    : '<span class="profile-summary-tag">Tidak ada komorbiditas</span>';
  const genderLabel = p.gender === 'female' ? 'Perempuan' : 'Laki-laki';

  return `
    <div class="profile-summary-card">
      <div class="profile-summary-header">
        <div style="display:flex;align-items:center;gap:6px;">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
          <span>Profil Pasien Terverifikasi (${escapeHtml(p.name)})</span>
        </div>
        <button type="button" class="profile-edit-btn" onclick="submitCommand('ubah data diri')">Ubah Data Diri</button>
      </div>
      <div class="profile-summary-tags">
        <span class="profile-summary-tag">${escapeHtml(p.name)}, ${p.age} thn (${genderLabel})</span>
        <span class="profile-summary-tag">TB: ${p.height} cm | BB: ${p.weight} kg</span>
        <span class="profile-summary-tag">BMI: ${p.bmi || '—'} (${escapeHtml(p.bmiCategory)})</span>
        ${comorbs}
      </div>
    </div>
  `;
}

async function startPersonalizedConsultation(profile) {
  setDynamicIslandState('generating', {
    sub: `Konsultasi Klinis \u2022 ${profile.name}`,
    main: 'Generating'
  });

  const ageRisk = profile.age >= 65
    ? 'kategori usia risiko tinggi (>65 tahun)'
    : profile.age >= 50
      ? 'kategori usia risiko menengah (50–65 tahun)'
      : 'kategori usia muda/dewasa (<50 tahun)';
  const comorbText = profile.comorbidities && profile.comorbidities.length > 0
    ? profile.comorbidities.join(', ')
    : 'Tidak ada komorbiditas dilaporkan';
  const sympText = profile.symptoms && profile.symptoms.length > 0
    ? profile.symptoms.join(', ')
    : 'Skrining preventif';
  const famText = profile.familyHistory === 'yes'
    ? 'Terdapat riwayat keluarga dengan Alzheimer/Demensia (faktor genetik perlu diwaspadai)'
    : profile.familyHistory === 'unknown'
      ? 'Riwayat keluarga belum terkonfirmasi'
      : 'Tidak ada riwayat keluarga';

  const replyHtml = `
    <p>Terima kasih, <strong>${escapeHtml(profile.name)}</strong>! Profil kesehatan klinis Anda telah tersimpan dan siap digunakan untuk konsultasi.</p>
    
    <p><strong>Ringkasan Parameter Klinis Anda:</strong></p>
    <ul>
      <li><strong>Faktor Usia (${profile.age} tahun):</strong> Berada pada <em>${ageRisk}</em>.</li>
      <li><strong>Indeks Massa Tubuh (BMI ${profile.bmi || '—'}):</strong> Status <strong>${escapeHtml(profile.bmiCategory)}</strong>.</li>
      <li><strong>Riwayat Komorbiditas:</strong> ${escapeHtml(comorbText)}.</li>
      <li><strong>Keluhan yang Dirasakan:</strong> ${escapeHtml(sympText)}.</li>
      <li><strong>Riwayat Keluarga:</strong> ${escapeHtml(famText)}.</li>
    </ul>

    <p>💡 <strong>Analisis & Saran Awal Neura:</strong><br>
    Berdasarkan data di atas, keluhan fungsi memori yang Anda alami dapat diperiksa lebih dalam dengan pemodelan biomarker (skor MMSE, Functional Assessment, dan biomarker darah). Model machine learning Neura dapat melakukan estimasi komprehensif terhadap kemungkinan risiko Alzheimer.</p>

    <p>Apakah Anda ingin menjalankan prediksi biomarker lengkap dengan perintah <code>/predict</code> sekarang?</p>
  `;

  appendAssistantMessage(replyHtml, {
    stream: true,
    suggestions: ['/predict', 'Bagaimana cara mencegah Alzheimer?', 'Gejala awal demensia', 'Ubah data diri']
  });
}

