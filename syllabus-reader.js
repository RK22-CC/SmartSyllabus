// SmartSyllabus multi-course static-page engine
// Course data is saved in localStorage keys sr_course_1 through sr_course_5.
let currentAnalysis = null;
let currentTargetGrade = 'A-';
let uploadTargetSlot = null;
const MAX_COURSES = 5;
 
const STORAGE_VERSION_KEY = 'sr_storage_version';
const CURRENT_STORAGE_VERSION = 'no_default_courses_v1';
 
function resetOldDefaultCoursesOnce() {
  try {
    if (localStorage.getItem(STORAGE_VERSION_KEY) === CURRENT_STORAGE_VERSION) return;
    for (let i = 1; i <= MAX_COURSES; i++) {
      localStorage.removeItem(courseKey(i));
      localStorage.removeItem(scoreKey(i));
    }
    localStorage.setItem(STORAGE_VERSION_KEY, CURRENT_STORAGE_VERSION);
  } catch (err) {}
}
 
 
function getActiveSlot() {
  const bodySlot = document.body?.dataset?.courseSlot;
  if (bodySlot) return Number(bodySlot);
  return null;
}
 
function courseKey(slot) { return 'sr_course_' + slot; }
function scoreKey(slot) { return 'sr_scores_' + slot; }
 
function readCourse(slot) {
  try { return JSON.parse(localStorage.getItem(courseKey(slot)) || 'null'); } catch (err) { return null; }
}
function writeCourse(slot, analysis) {
  localStorage.setItem(courseKey(slot), JSON.stringify({ analysis, savedAt: new Date().toISOString() }));
}
function removeCourse(slot) {
  if (!slot) return;
  const label = courseLabel(slot);
  const ok = window.confirm('Remove ' + label + '? This deletes the saved syllabus analysis and grade simulator scores from this browser.');
  if (!ok) return;
  try {
    localStorage.removeItem(courseKey(slot));
    localStorage.removeItem(scoreKey(slot));
  } catch (err) {}
  if (getActiveSlot() === slot) {
    window.location.href = 'index.html#home';
    return;
  }
  renderCourseNav();
}
function firstEmptySlot() {
  for (let i = 1; i <= MAX_COURSES; i++) if (!readCourse(i)) return i;
  return null;
}
function courseLabel(slot) {
  const item = readCourse(slot);
  const a = item?.analysis;
  return (a?.courseCode || a?.courseName || ('Course ' + slot)).toString().slice(0, 22);
}
function fileForSlot(slot) { return 'course' + slot + '.html'; }
 
function renderCourseNav() {
  const nav = document.getElementById('courseNavLinks');
  const top = document.getElementById('courseTopButtons');
  const active = getActiveSlot();
  let buttons = '';
  for (let i = 1; i <= MAX_COURSES; i++) {
    if (readCourse(i)) {
      const label = courseLabel(i);
      const activeStyle = i === active ? 'background:#2563eb;color:#fff;border-color:#2563eb;' : '';
      buttons += '<a href="' + fileForSlot(i) + '" class="btn-ghost" style="padding:.55rem .75rem;white-space:nowrap;' + activeStyle + '">' + label + '</a>';
    }
  }
  if (nav) nav.innerHTML = '';
  if (top) top.innerHTML = buttons;
}
 
function setupNavToggle() {
  const navToggle = document.getElementById('navToggle');
  const navLinks = document.getElementById('navLinks');
  if (!navToggle || !navLinks) return;
  navToggle.addEventListener('click', () => {
    navToggle.classList.toggle('active');
    navLinks.classList.toggle('open');
    document.body.style.overflow = navLinks.classList.contains('open') ? 'hidden' : '';
    navToggle.setAttribute('aria-expanded', navToggle.classList.contains('active'));
  });
}
 
function setupFaq() {
  function faqOpen(item) { const answer = item.querySelector('.faq-answer'); item.classList.add('open'); if (answer) answer.style.maxHeight = answer.scrollHeight + 'px'; item.querySelector('.faq-question')?.setAttribute('aria-expanded','true'); }
  function faqClose(item) { const answer = item.querySelector('.faq-answer'); item.classList.remove('open'); if (answer) answer.style.maxHeight = '0'; item.querySelector('.faq-question')?.setAttribute('aria-expanded','false'); }
  document.querySelectorAll('.faq-question').forEach((btn) => { btn.addEventListener('click', () => { const item = btn.closest('.faq-item'); item?.classList.contains('open') ? faqClose(item) : faqOpen(item); }); });
  document.getElementById('faqExpandAll')?.addEventListener('click', () => document.querySelectorAll('.faq-item').forEach(faqOpen));
  document.getElementById('faqCollapseAll')?.addEventListener('click', () => document.querySelectorAll('.faq-item').forEach(faqClose));
}
 
function setupReveals() {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!prefersReduced && 'IntersectionObserver' in window) {
    const reveals = document.querySelectorAll('.reveal');
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry, i) => {
        if (entry.isIntersecting) { entry.target.style.transitionDelay = `${i * 60}ms`; entry.target.classList.add('visible'); observer.unobserve(entry.target); }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
    reveals.forEach((el) => observer.observe(el));
    setTimeout(() => reveals.forEach((el) => el.classList.add('visible')), 3000);
  } else { document.querySelectorAll('.reveal').forEach((el) => el.classList.add('visible')); }
}
 
function beginUpload(slot = null, replaceCurrent = false) {
  const input = document.getElementById('syllabusInput');
  if (!input) return;
  uploadTargetSlot = slot || (replaceCurrent ? getActiveSlot() : firstEmptySlot());
  if (!uploadTargetSlot) { alert('You already have 5 courses saved. Open one of the course pages and use Replace or Remove This Course.'); return; }
  input.click();
}
 
function showHomeUploadState(state, msg = '') {
  const box = document.getElementById('home-upload-status');
  const title = document.getElementById('home-upload-title');
  const detail = document.getElementById('home-upload-detail');
  const bar = document.getElementById('home-progress-bar');
  if (!box) return;
  box.style.display = 'block';
  if (state === 'loading') {
    if (title) title.textContent = 'Analyzing your syllabus...';
    if (detail) detail.textContent = 'Extracting assessments, calculating grade scenarios, and creating the course page.';
    if (bar) { bar.style.transition='none'; bar.style.width='0%'; setTimeout(()=>{bar.style.transition='width .8s ease'; bar.style.width='45%';},30); setTimeout(()=>{bar.style.width='78%';},800); }
  } else if (state === 'error') {
    if (title) title.textContent = 'Analysis failed';
    if (detail) detail.textContent = msg || 'Check your API key and try again.';
    if (bar) bar.style.width='0%';
  }
}
 
function showOverlayState(s) {
  ['overlay-loading','overlay-results','overlay-error','overlay-empty'].forEach(id => {
    const el = document.getElementById(id); if (el) el.style.display = 'none';
  });
  const active = document.getElementById('overlay-' + s);
  if (active) active.style.display = 'block';
}
 
async function runAnalysisForSlot(file, slot) {
  const activeSlot = getActiveSlot();
  if (activeSlot) {
    showOverlayState('loading');
    const bar = document.getElementById('overlay-progress-bar');
    if (bar) { bar.style.transition = 'none'; bar.style.width = '0%'; setTimeout(() => { bar.style.transition = 'width 0.8s ease'; bar.style.width = '40%'; }, 50); setTimeout(() => { bar.style.width = '75%'; }, 900); }
  } else {
    showHomeUploadState('loading');
  }
  try {
    let text = '';
    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) text = await extractPDFText(file);
    else text = await file.text();
    const result = await analyzeSyllabus(text);
    writeCourse(slot, result);
    renderCourseNav();
    if (activeSlot === slot) { currentAnalysis = result; renderResults(result); }
    else window.location.href = fileForSlot(slot);
  } catch (err) {
    const message = err.message || 'Analysis failed. Check your API key and try again.';
    if (activeSlot) { const el = document.getElementById('overlay-error-msg'); if (el) el.textContent = message; showOverlayState('error'); }
    else showHomeUploadState('error', message);
  }
}
 
function saveScoresForSlot(slot) {
  if (!slot || !currentAnalysis) return;
  const scores = {};
  (currentAnalysis.assessments || []).forEach((_, i) => {
    const el = document.getElementById('score-' + i);
    if (el && el.value !== '') scores[i] = el.value;
  });
  try { localStorage.setItem(scoreKey(slot), JSON.stringify(scores)); } catch (err) {}
}
function restoreScoresForSlot(slot) {
  if (!slot) return;
  try {
    const scores = JSON.parse(localStorage.getItem(scoreKey(slot)) || '{}');
    Object.entries(scores).forEach(([i, value]) => { const el = document.getElementById('score-' + i); if (el) el.value = value; });
  } catch (err) {}
  updateSimulator();
}
 
function loadCoursePage() {
  const slot = getActiveSlot();
  if (!slot) return;
  const item = readCourse(slot);
  if (!item?.analysis) { showOverlayState('empty'); return; }
  currentAnalysis = item.analysis;
  renderResults(currentAnalysis);
}
 
function setupUploads() {
  const input = document.getElementById('syllabusInput');
  document.querySelectorAll('.upload-syllabus-btn').forEach((btn) => btn.addEventListener('click', (e) => { e.preventDefault(); beginUpload(firstEmptySlot()); }));
  document.getElementById('replaceCourseBtn')?.addEventListener('click', () => beginUpload(getActiveSlot(), true));
  document.getElementById('removeCourseBtn')?.addEventListener('click', () => removeCourse(getActiveSlot()));
  input?.addEventListener('change', async () => {
    const file = input.files[0];
    input.value = '';
    if (!file) return;
    const slot = uploadTargetSlot || firstEmptySlot();
    if (!slot) { alert('You already have 5 courses saved. Open one course and replace or remove it.'); return; }
    await runAnalysisForSlot(file, slot);
  });
}
 
async function extractPDFText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(e.target.result) }).promise;
        let fullText = '';
        for (let i = 1; i <= Math.min(pdf.numPages, 20); i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          fullText += content.items.map(item => item.str).join(' ') + '\n';
        }
        resolve(fullText);
      } catch (err) { reject(new Error('PDF read failed: ' + err.message)); }
    };
    reader.onerror = () => reject(new Error('File read error'));
    reader.readAsArrayBuffer(file);
  });
}
 
async function analyzeSyllabus(text) {
  const today = new Date().toISOString().split('T')[0];
  const systemPrompt = 'You are a university syllabus parser. Return ONLY a valid JSON object with no markdown fences, no explanation.\n\nToday\'s date is ' + today + '. Use this to make the weeklyStrategy relative to today — periods should start from today or the nearest upcoming week, not from the course start. If the course end date has already passed relative to today, still return the data but set courseEndDate accordingly.\n\nSchema:\n{\n  "courseName": "string",\n  "courseCode": "string or null",\n  "courseEndDate": "YYYY-MM-DD or null",\n  "assessments": [\n    { "name": "string", "type": "exam|assignment|lab|quiz|project|participation|other", "weight": number, "bonus": boolean, "date": "string or null", "description": "string" }\n  ],\n  "riskScore": "number 0-100",\n  "riskFactors": ["string"],\n  "weeklyStrategy": [\n    { "period": "string", "focus": "string", "tasks": ["string","string","string"] }\n  ],\n  "gradingScale": { "A+": number, "A": number, "A-": number, "B+": number, "B": number, "B-": number, "C+": number, "C": number, "Pass": number }\n}\n\nRisk score: based on deadline clustering and high-weight items close together. 0-30=low, 31-60=moderate, 61-80=high, 81-100=critical.\nNon-bonus weights must sum to 100. Normalize non-bonus weights if needed. Bonus/extra-credit assessments must have bonus: true. CRITICAL: bonus weight must be the exact stated percentage (e.g. if syllabus says "1% bonus", set weight: 1). NEVER set a bonus weight to 0. Bonus weights are separate from and do not count toward the 100% total.\nIf no grading scale found, use: A+=90,A=85,A-=80,B+=77,B=73,B-=70,C+=67,C=63,Pass=50. Always include Pass=50 directly after C in the gradingScale.';
 
  const ANTHROPIC_KEY = 'YOUR_API_HERE'; // <-- paste your Anthropic API key
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5',
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: 'user', content: text.slice(0, 15000) }]
    })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || 'API error ' + res.status);
  }
  const data = await res.json();
  let raw = data.content[0].text.trim();
  raw = raw.replace(/^```json\s*/i, '').replace(/\s*```$/i, '');
  return JSON.parse(raw);
}
 
function riskColor(s) { return s<=30?'#16a34a':s<=60?'#d97706':s<=80?'#dc2626':'#7f1d1d'; }
function riskLabel(s) { return s<=30?'Low':s<=60?'Moderate':s<=80?'High':'Critical'; }
function typeIcon(t) {
  const m = {exam:'\u{1F4DD}',assignment:'\u{1F4C4}',lab:'\u{1F52C}',quiz:'\u2753',project:'\u{1F5C2}',participation:'\u{1F64B}',other:'\u{1F4CC}'};
  return m[t] || '\u{1F4CC}';
}
function getFinalIdx(assessments) {
  let idx=-1, maxW=-1;
  assessments.forEach((a,i)=>{if(a.type==='exam'&&a.weight>maxW){maxW=a.weight;idx=i;}});
  if(idx===-1){maxW=-1;assessments.forEach((a,i)=>{if(a.weight>maxW){maxW=a.weight;idx=i;}});}
  return idx;
}
 
function renderResults(data, options = {}) {
  document.getElementById('overlay-course-name').textContent = data.courseName || 'Course Analysis';
  document.getElementById('overlay-status').textContent = (data.courseCode ? data.courseCode + ' \u00b7 ' : '') + 'Analysis complete';
  const finalIdx = getFinalIdx(data.assessments);
  const rC = riskColor(data.riskScore);
  const defaultScale = {'A+':90,'A':85,'A-':80,'B+':77,'B':73,'B-':70,'C+':67,'C':63,'Pass':50};
  const sourceScale = data.gradingScale || {};
  const orderedScaleKeys = ['A+','A','A-','B+','B','B-','C+','C','Pass'];
  const scale = {};
  orderedScaleKeys.forEach(k => {
    if (sourceScale[k] !== undefined) scale[k] = sourceScale[k];
    else if (defaultScale[k] !== undefined) scale[k] = defaultScale[k];
  });
  Object.entries(sourceScale).forEach(([k,v]) => { if (scale[k] === undefined) scale[k] = v; });
  scale.Pass = 50;
  const scaleKeys = Object.keys(scale);
 
  const rows = data.assessments.map((a,i) => {
    const isFinal = i === finalIdx;
    const rowBg = isFinal ? 'background:#eff6ff;' : (i%2===0 ? '' : 'background:#fafafa');
    const badge = isFinal ? '<span style="background:#dbeafe;color:#1d4ed8;padding:.08rem .3rem;border-radius:3px;font-size:.66rem;font-weight:700;margin-left:.3rem;">FINAL</span>' : '';
    const bonusBadge = a.bonus ? '<span style="background:#dcfce7;color:#166534;padding:.08rem .3rem;border-radius:3px;font-size:.66rem;font-weight:700;margin-left:.3rem;">BONUS</span>' : '';
    const weightDisplay = a.bonus ? '+' + a.weight + '%' : a.weight + '%';
    const weightStyle = a.bonus ? 'color:#16a34a;font-weight:700;' : 'color:#0f172a;font-weight:700;';
    return '<tr style="border-bottom:1px solid #f1f5f9;' + rowBg + '">' +
      '<td style="padding:.5rem .75rem;color:#0f172a;font-weight:500;">' + typeIcon(a.type) + ' ' + a.name + badge + bonusBadge + '</td>' +
      '<td style="padding:.5rem .75rem;color:#64748b;">' +
      (a.date
        ? '<span>' + a.date + '</span>'
        : '<div style="display:flex;align-items:center;gap:.4rem;">' +
          '<input type="date" id="date-input-' + i + '" value="" onchange="onAssessmentDateChange(' + i + ', this.value)" ' +
          'style="padding:.2rem .4rem;border:1.5px solid #c7d2fe;border-radius:.35rem;font-size:.76rem;color:#374151;outline:none;cursor:pointer;background:#f0f4ff;" />' +
          '</div>') +
      '</td>' +
      '<td style="padding:.5rem .75rem;text-align:right;' + weightStyle + '">' + weightDisplay + '</td>' +
      '<td style="padding:.5rem .75rem;"><span style="background:#e0e7ff;color:#3730a3;padding:.12rem .4rem;border-radius:4px;font-size:.68rem;font-weight:600;">' + a.type + '</span></td></tr>';
  }).join('');
 
  const scoreInputs = data.assessments.map((a,i) =>
    '<div style="display:flex;align-items:center;gap:.6rem;margin-bottom:.5rem;">' +
    (a.bonus ? '<span style="flex:1;font-size:.79rem;color:#374151;">' + a.name + ' <span style="color:#16a34a;font-size:.72rem;">(+' + a.weight + '% bonus)</span></span>' : '<span style="flex:1;font-size:.79rem;color:#374151;">' + a.name + ' <span style="color:#9ca3af;font-size:.72rem;">(' + a.weight + '%)</span></span>') +
    '<input type="number" id="score-' + i + '" min="0" max="100" placeholder="\u2014" oninput="updateSimulator()" ' +
    'style="width:62px;padding:.28rem .4rem;border:1.5px solid #e2e8f0;border-radius:.35rem;font-size:.81rem;text-align:right;outline:none;color:#0f172a;" /></div>'
  ).join('');
 
  const sortedScaleEntries = Object.entries(scale).sort((a,b) => b[1]-a[1]);
  const targetBtns = sortedScaleEntries.map(([g,t], si) => {
    const nextT = si === 0 ? 101 : sortedScaleEntries[si-1][1];
    const rangeStr = si === 0 ? t+'-100' : t+'-'+(nextT-1);
    return '<button onclick="setTargetGrade(\'' + g + '\')" id="tgt-' + gradeId(g) + '" ' +
      'style="padding:.3rem .65rem;border-radius:8px;border:1.5px solid #e2e8f0;background:#fff;color:#374151;font-size:.74rem;cursor:pointer;font-weight:600;line-height:1.4;text-align:center;">' +
      g + ' <span style="font-size:.62rem;font-weight:400;color:#94a3b8;">' + rangeStr + '</span></button>';
  }).join('');
 
  const riskBadges = (data.riskFactors||[]).map(f =>
    '<span style="background:#fff;border:1px solid #fed7aa;color:#9a3412;padding:.18rem .5rem;border-radius:999px;font-size:.76rem;">' + f + '</span>'
  ).join('');
 
  const strategyCards = (data.weeklyStrategy||[]).map(w =>
    '<div style="background:#f8fafc;border-radius:.75rem;padding:1rem 1.2rem;border-left:3px solid #2563eb;">' +
    '<div style="display:flex;justify-content:space-between;align-items:baseline;gap:.5rem;flex-wrap:wrap;margin-bottom:.4rem;">' +
    '<span style="font-weight:700;color:#0f172a;font-size:.83rem;">' + w.period + '</span>' +
    '<span style="color:#2563eb;font-size:.76rem;font-weight:600;">' + w.focus + '</span></div>' +
    '<ul style="margin:0;padding-left:1.1rem;color:#374151;font-size:.77rem;line-height:1.7;">' +
    (w.tasks||[]).map(t => '<li>' + t + '</li>').join('') + '</ul></div>'
  ).join('');
 
  const html =
    '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:1rem;padding:1.5rem 1.75rem;background:#f8fafc;border-bottom:1px solid #e2e8f0;">' +
      '<div style="background:#fff;border-radius:.75rem;padding:1.2rem;border:1px solid #e2e8f0;">' +
        '<div style="font-size:.68rem;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.07em;">Risk Score</div>' +
        '<div style="font-size:2.1rem;font-weight:800;color:' + rC + ';margin:.2rem 0;">' + data.riskScore + '</div>' +
        '<div style="font-size:.76rem;color:' + rC + ';font-weight:600;">' + riskLabel(data.riskScore) + ' workload pressure</div></div>' +
      '<div style="background:#fff;border-radius:.75rem;padding:1.2rem;border:1px solid #e2e8f0;">' +
        '<div style="font-size:.68rem;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.07em;">Assessments Found</div>' +
        '<div style="font-size:2.1rem;font-weight:800;color:#0f172a;margin:.2rem 0;">' + data.assessments.length + '</div>' +
        '<div style="font-size:.76rem;color:#64748b;">grade components detected</div></div>' +
      '<div style="background:#fff;border-radius:.75rem;padding:1.2rem;border:1px solid #e2e8f0;">' +
        '<div style="font-size:.68rem;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.07em;">Heaviest Item</div>' +
        '<div style="font-size:2.1rem;font-weight:800;color:#2563eb;margin:.2rem 0;">' + (finalIdx>=0?data.assessments[finalIdx].weight:'\u2014') + '%</div>' +
        '<div style="font-size:.76rem;color:#64748b;">' + (finalIdx>=0?data.assessments[finalIdx].name:'of grade') + '</div></div>' +
    '</div>' +
    (riskBadges ? '<div style="padding:.9rem 1.75rem;background:#fff7ed;border-bottom:1px solid #fed7aa;display:flex;flex-wrap:wrap;gap:.5rem;align-items:center;">' +
      '<span style="font-size:.68rem;font-weight:700;color:#9a3412;text-transform:uppercase;letter-spacing:.07em;white-space:nowrap;">\u26a0 Risk Factors</span>' +
      riskBadges + '</div>' : '') +
    '<div style="padding:1.5rem 1.75rem;border-bottom:1px solid #e2e8f0;">' +
      '<div style="font-size:.86rem;font-weight:700;color:#0f172a;margin-bottom:.9rem;">\ud83d\udccb Detected Assessments</div>' +
      '<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:.81rem;">' +
      '<thead><tr style="background:#f8fafc;">' +
      '<th style="text-align:left;padding:.5rem .75rem;color:#64748b;font-weight:600;border-bottom:2px solid #e2e8f0;">Assessment</th>' +
      '<th style="text-align:left;padding:.5rem .75rem;color:#64748b;font-weight:600;border-bottom:2px solid #e2e8f0;">Date</th>' +
      '<th style="text-align:right;padding:.5rem .75rem;color:#64748b;font-weight:600;border-bottom:2px solid #e2e8f0;">Weight</th>' +
      '<th style="text-align:left;padding:.5rem .75rem;color:#64748b;font-weight:600;border-bottom:2px solid #e2e8f0;">Type</th>' +
      '</tr></thead><tbody>' + rows + '</tbody></table></div></div>' +
    '<div style="padding:1.5rem 1.75rem;border-bottom:1px solid #e2e8f0;">' +
      '<div style="font-size:.86rem;font-weight:700;color:#0f172a;margin-bottom:.25rem;">\ud83c\udfaf Grade Simulator</div>' +
      '<div style="font-size:.76rem;color:#64748b;margin-bottom:1.2rem;">Enter scores (real or hypothetical) to see your grade trajectory and what you need on the final exam.</div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:2rem;align-items:start;">' +
        '<div><div style="font-size:.68rem;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.07em;margin-bottom:.7rem;">Your Scores (%)</div>' +
        scoreInputs + '</div>' +
        '<div><div style="font-size:.68rem;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:.07em;margin-bottom:.7rem;">Target Grade</div>' +
        '<div style="display:flex;flex-wrap:wrap;gap:.3rem;margin-bottom:1.2rem;">' + targetBtns + '</div>' +
        '<div style="background:#f8fafc;border-radius:.75rem;padding:1.2rem;border:1px solid #e2e8f0;margin-bottom:.9rem;">' +
          '<div style="font-size:.68rem;color:#64748b;margin-bottom:.3rem;">Current Projected Grade</div>' +
          '<div id="sim-current" style="font-size:1.9rem;font-weight:800;color:#0f172a;">\u2014</div>' +
          '<div style="height:1px;background:#e2e8f0;margin:.7rem 0;"></div>' +
          '<div style="font-size:.68rem;color:#64748b;margin-bottom:.3rem;">Final Exam Needed For <span id="sim-target-label" style="font-weight:700;color:#2563eb;">A-</span></div>' +
          '<div id="sim-needed" style="font-size:1.55rem;font-weight:800;color:#2563eb;">\u2014</div>' +
          '<div id="sim-needed-sub" style="font-size:.72rem;color:#64748b;margin-top:.2rem;"></div>' +
        '<div id="final-needed-section"></div>' +
        '</div></div>' +
      '</div></div>' +
    '<div id="strategy-section" style="padding:1.5rem 1.75rem;">' +
      '<div style="font-size:.86rem;font-weight:700;color:#0f172a;margin-bottom:.9rem;">\ud83d\udcc5 Weekly Study Strategy</div>' +
      (data.courseEndDate && new Date(data.courseEndDate) < new Date()
        ? '<div style="background:#f1f5f9;border-radius:.75rem;padding:2rem;text-align:center;border:1px solid #e2e8f0;"><div style="font-size:2rem;margin-bottom:.75rem;">\ud83c\udf93</div><div style="font-weight:700;color:#0f172a;font-size:.95rem;margin-bottom:.4rem;">This course has already ended</div><div style="color:#64748b;font-size:.82rem;">Course end date: ' + data.courseEndDate + '. The grade simulator above is still available to calculate your final standing.</div></div>'
        : '<div style="display:grid;gap:.7rem;">' + strategyCards + '</div>') +
    '</div>';
 
  document.getElementById('overlay-results').innerHTML = html;
  document.getElementById('overlay-course-name').textContent = data.courseName || 'Course Analysis';
  document.getElementById('overlay-status').textContent = (data.courseCode ? data.courseCode + ' · ' : '') + 'Analysis saved in this browser';
  showOverlayState('results');
  if (options.save !== false) writeCourse(getActiveSlot(), data);
  //showAnalysisPage(!!options.jumpToPage);
  const defaultTarget = scaleKeys.includes('A-') ? 'A-' : (scaleKeys[2] || scaleKeys[0]);
  setTargetGrade(defaultTarget);
}
 
async function onAssessmentDateChange(index, value) {
  if (!currentAnalysis) return;
  currentAnalysis.assessments[index].date = value || null;
  writeCourse(getActiveSlot(), currentAnalysis);
  // Update the date cell display immediately
  const input = document.getElementById('date-input-' + index);
  if (input && value) {
    input.closest('td').innerHTML = '<span>' + value + '</span>';
  }
  await regenerateStrategy();
}
 
async function regenerateStrategy() {
  const section = document.getElementById('strategy-section');
  if (!section) return;
  // Show loading state inside strategy section
  const strategyContent = section.querySelector('div:last-child') || section.lastElementChild;
  const loadingHTML = '<div style="display:flex;align-items:center;gap:.6rem;padding:1rem;background:#f8fafc;border-radius:.75rem;border:1px solid #e2e8f0;">' +
    '<div style="width:16px;height:16px;border:2px solid #2563eb;border-top-color:transparent;border-radius:50%;animation:spin .7s linear infinite;flex-shrink:0;"></div>' +
    '<span style="font-size:.82rem;color:#64748b;">Updating study strategy with new dates...</span></div>';
  section.innerHTML = '<div style="font-size:.86rem;font-weight:700;color:#0f172a;margin-bottom:.9rem;">\ud83d\udcc5 Weekly Study Strategy</div>' + loadingHTML;
  if (!document.getElementById('sr-spin-style')) {
    const s = document.createElement('style');
    s.id = 'sr-spin-style';
    s.textContent = '@keyframes spin{to{transform:rotate(360deg)}}';
    document.head.appendChild(s);
  }
 
  try {
    const today = new Date().toISOString().split('T')[0];
    const assessmentSummary = currentAnalysis.assessments.map(a =>
      a.name + ' (' + (a.bonus ? 'bonus ' : '') + a.weight + '%)' + (a.date ? ' due ' + a.date : ' (no date)')
    ).join(', ');
 
    const prompt = 'Today is ' + today + '. Regenerate ONLY the weeklyStrategy array for a course with these assessments: ' + assessmentSummary + '.' +
      ' Course end date: ' + (currentAnalysis.courseEndDate || 'unknown') + '.' +
      ' Rules:\n- One entry per calendar week (Monday–Sunday), except the first week which starts on today and ends the coming Sunday.\n' +
      '- Label each period with its exact date range (e.g. \'June 10–15\').\n' +
      '- Only include tasks the student still needs to do from today onward. Never reference past deadlines.\n' +
      '- Final exam period: collapse all final prep weeks into ONE single block.\n' +
      '- Stop at the course end date.\n' +
      'Return ONLY a valid JSON object: { "weeklyStrategy": [ { "period": "string", "focus": "string", "tasks": ["string","string","string"] } ] }. No markdown, no explanation.';
 
    const ANTHROPIC_KEY = 'YOUR_API_HERE';
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 4000,
        system: 'You are a study strategy generator. Return ONLY raw JSON with no markdown fences.',
        messages: [{ role: 'user', content: prompt }]
      })
    });
 
    if (!res.ok) throw new Error('API error ' + res.status);
    const apiData = await res.json();
    let raw = apiData.content[0].text.trim().replace(/^```json\s*/i,'').replace(/\s*```$/i,'');
    const parsed = JSON.parse(raw);
 
    currentAnalysis.weeklyStrategy = parsed.weeklyStrategy;
    writeCourse(getActiveSlot(), currentAnalysis);
 
    const newStrategyCards = (currentAnalysis.weeklyStrategy||[]).map(w =>
      '<div style="background:#f8fafc;border-radius:.75rem;padding:1rem 1.2rem;border-left:3px solid #2563eb;">' +
      '<div style="display:flex;justify-content:space-between;align-items:baseline;gap:.5rem;flex-wrap:wrap;margin-bottom:.4rem;">' +
      '<span style="font-weight:700;color:#0f172a;font-size:.83rem;">' + w.period + '</span>' +
      '<span style="color:#2563eb;font-size:.76rem;font-weight:600;">' + w.focus + '</span></div>' +
      '<ul style="margin:0;padding-left:1.1rem;color:#374151;font-size:.77rem;line-height:1.7;">' +
      (w.tasks||[]).map(t => '<li>' + t + '</li>').join('') + '</ul></div>'
    ).join('');
 
    const updatedSection = document.getElementById('strategy-section');
    if (updatedSection) {
      updatedSection.innerHTML = '<div style="font-size:.86rem;font-weight:700;color:#0f172a;margin-bottom:.9rem;">\ud83d\udcc5 Weekly Study Strategy</div>' +
        (currentAnalysis.courseEndDate && new Date(currentAnalysis.courseEndDate) < new Date()
          ? '<div style="background:#f1f5f9;border-radius:.75rem;padding:2rem;text-align:center;border:1px solid #e2e8f0;"><div style="font-size:2rem;margin-bottom:.75rem;">\ud83c\udf93</div><div style="font-weight:700;color:#0f172a;font-size:.95rem;margin-bottom:.4rem;">This course has already ended</div></div>'
          : '<div style="display:grid;gap:.7rem;">' + newStrategyCards + '</div>');
    }
  } catch (err) {
    const updatedSection = document.getElementById('strategy-section');
    if (updatedSection) {
      updatedSection.innerHTML = '<div style="font-size:.86rem;font-weight:700;color:#0f172a;margin-bottom:.9rem;">\ud83d\udcc5 Weekly Study Strategy</div>' +
        '<div style="color:#dc2626;font-size:.82rem;padding:.75rem;background:#fef2f2;border-radius:.5rem;">Could not regenerate strategy: ' + (err.message||'unknown error') + '</div>';
    }
  }
}
 
 
 
function gradeId(grade) {
  return String(grade).replace(/[^a-zA-Z0-9]/g, (ch) => ({'+':'plus','-':'minus'}[ch] || ''));
}
 
function setTargetGrade(grade) {
  currentTargetGrade = grade;
  const lbl = document.getElementById('sim-target-label');
  if (lbl) lbl.textContent = grade;
  document.querySelectorAll('[id^="tgt-"]').forEach(btn => {
    btn.style.background='#fff'; btn.style.color='#374151'; btn.style.borderColor='#e2e8f0';
  });
  const active = document.getElementById('tgt-' + gradeId(grade));
  if (active) { active.style.background='#2563eb'; active.style.color='#fff'; active.style.borderColor='#2563eb'; }
  updateSimulator();
}
 
function updateSimulator() {
  if (!currentAnalysis) return;
  const assessments = currentAnalysis.assessments || [];
  const finalIdx = getFinalIdx(assessments);
  let earnedWeightedPoints = 0;
  let bonusPoints = 0;
  let hasNonFinalScore = false;
 
  assessments.forEach((a,i) => {
    if (i === finalIdx) return;
    const val = parseFloat(document.getElementById('score-' + i)?.value);
    if (!isNaN(val)) {
      if (a.bonus) bonusPoints += val * a.weight / 100;
      else {
        earnedWeightedPoints += val * a.weight;
        hasNonFinalScore = true;
      }
    }
  });
 
  const finalWeight = finalIdx >= 0 ? assessments[finalIdx].weight : 0;
  const finalVal = finalIdx >= 0 ? parseFloat(document.getElementById('score-' + finalIdx)?.value) : NaN;
  const finalEntered = !isNaN(finalVal);
 
  const simCurrent = document.getElementById('sim-current');
  if (!simCurrent) return;
  if (finalEntered) {
    const g = (earnedWeightedPoints + finalVal * finalWeight) / 100 + bonusPoints;
    const bStr = bonusPoints > 0 ? ' (+' + bonusPoints.toFixed(1) + '% bonus)' : '';
    simCurrent.textContent = g.toFixed(1) + '%' + bStr;
    simCurrent.style.color = g>=80?'#16a34a':g>=70?'#d97706':'#dc2626';
  } else {
    const partial = earnedWeightedPoints / 100 + bonusPoints;
    const bStr = bonusPoints > 0 ? ' (+' + bonusPoints.toFixed(1) + '% bonus)' : '';
    simCurrent.textContent = (hasNonFinalScore || bonusPoints > 0) ? partial.toFixed(1) + '%*' + bStr : '\u2014';
    simCurrent.style.color = (hasNonFinalScore || bonusPoints > 0) ? (partial>=80?'#16a34a':partial>=70?'#d97706':'#dc2626') : '#0f172a';
  }
 
  const defaultScale = {'A+':90,'A':85,'A-':80,'B+':77,'B':73,'B-':70,'C+':67,'C':63,'Pass':50};
  const scale = Object.assign({}, defaultScale, currentAnalysis.gradingScale || {}, { Pass: 50 });
  const threshold = scale[currentTargetGrade];
  const simNeeded = document.getElementById('sim-needed');
  const simSub = document.getElementById('sim-needed-sub');
 
  if (finalEntered) {
    if (simNeeded) { simNeeded.textContent='\u2014'; simNeeded.style.color='#94a3b8'; }
    if (simSub) { simSub.style.display='none'; simSub.textContent=''; }
    return;
  }
 
  if (simSub) simSub.style.display = '';
  if (threshold !== undefined && finalWeight > 0) {
    const needed = ((threshold - bonusPoints) * 100 - earnedWeightedPoints) / finalWeight;
    simNeeded.textContent = needed.toFixed(1) + '%';
    if (needed > 100) { simNeeded.style.color='#dc2626'; simSub.textContent='Not achievable \u2014 too many points needed from final alone.'; }
    else if (needed < 0) { simNeeded.style.color='#16a34a'; simSub.textContent='Already secured! Bonus marks and existing scores cover this target.'; }
    else if (needed >= 85) { simNeeded.style.color='#d97706'; simSub.textContent='Challenging \u2014 needs a strong final exam performance.'; }
    else { simNeeded.style.color='#16a34a'; simSub.textContent='Achievable with solid preparation.'; }
  } else {
    if (simNeeded) { simNeeded.textContent='\u2014'; simNeeded.style.color='#2563eb'; }
    if (simSub) simSub.textContent='Enter scores above to calculate.';
  }
}
 
 
function boot() {
  setupNavToggle();
  setupFaq();
  setupUploads();
  renderCourseNav();
  loadCoursePage();
  setupReveals();
}
 
document.addEventListener('DOMContentLoaded', boot);
 