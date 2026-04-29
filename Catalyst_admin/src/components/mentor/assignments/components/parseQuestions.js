import Papa from 'papaparse';

// ── Validation ────────────────────────────────────────────────
function validateRow(raw) {
  const errors = [];

  const title = (raw.title || '').trim();
  if (!title) errors.push('title is missing');

  const choices = {
    A: (raw.choice_a || '').trim(),
    B: (raw.choice_b || '').trim(),
    C: (raw.choice_c || '').trim(),
    D: (raw.choice_d || '').trim(),
  };
  ['A', 'B', 'C', 'D'].forEach((k) => {
    if (!choices[k]) errors.push(`choice_${k.toLowerCase()} is empty`);
  });

  const correctAnswer = (raw.correct_answer || '').trim().toUpperCase();
  if (!['A', 'B', 'C', 'D'].includes(correctAnswer)) {
    errors.push(`correct_answer must be A/B/C/D (got "${raw.correct_answer || ''}")`);
  }

  if (errors.length > 0) return { ok: false, errors };

  const rawScore  = parseFloat(raw.score);
  const rawModule = parseInt(raw.module, 10);
  const moduleNum = rawModule === 2 ? 2 : 1;

  return {
    ok: true,
    question: {
      id:            `q-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      number:        0, // assigned by caller
      module:        moduleNum,
      title,
      description:   (raw.description || '').trim(),
      choices,
      correctAnswer,
      explanation:   (raw.explanation || '').trim(),
      score:         isNaN(rawScore) || rawScore <= 0 ? 1 : rawScore,
      topic:         (raw.topic || '').trim(),
    },
  };
}

// ── CSV parser ────────────────────────────────────────────────
function fromCSV(text) {
  const result = Papa.parse(text.trim(), {
    header:        true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase().replace(/[\s-]+/g, '_'),
  });

  if (result.errors.length && !result.data.length) {
    return { rows: [], fileError: `CSV parse error: ${result.errors[0].message}` };
  }

  const rows = result.data.map((raw, i) => ({ rowNum: i + 1, raw, ...validateRow(raw) }));
  return { rows, fileError: null };
}

// ── JSON parser ───────────────────────────────────────────────
function fromJSON(text) {
  let data;
  try { data = JSON.parse(text); }
  catch { return { rows: [], fileError: 'Invalid JSON — could not parse file.' }; }

  if (!Array.isArray(data)) {
    return { rows: [], fileError: 'JSON must be an array of question objects.' };
  }

  const rows = data.map((item, i) => {
    const raw = {
      title:          item.title         || '',
      description:    item.description   || '',
      choice_a:       item.choices?.A    || item.choice_a || '',
      choice_b:       item.choices?.B    || item.choice_b || '',
      choice_c:       item.choices?.C    || item.choice_c || '',
      choice_d:       item.choices?.D    || item.choice_d || '',
      correct_answer: item.correctAnswer || item.correct_answer || '',
      explanation:    item.explanation   || '',
      score:          item.score         ?? 1,
      module:         item.module        ?? 1,
      topic:          item.topic         || '',
    };
    return { rowNum: i + 1, raw, ...validateRow(raw) };
  });

  return { rows, fileError: null };
}

// ── Public API ────────────────────────────────────────────────
export async function parseQuestionFile(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  const text = await file.text();

  if (ext === 'csv')  return fromCSV(text);
  if (ext === 'json') return fromJSON(text);
  return { rows: [], fileError: 'Unsupported file. Please upload a .csv or .json file.' };
}

// ── CSV template (for download) ───────────────────────────────
export const CSV_TEMPLATE_CONTENT =
  'title,description,choice_a,choice_b,choice_c,choice_d,correct_answer,explanation,score,module,topic\n' +
  '"What is 2 + 2?","","1","2","4","5","C","2+2 equals 4",1,1,"Arithmetic"\n' +
  '"Which word is a noun?","Read the sentence below.","Run","Quickly","Table","Jumped","C","A noun names a thing",1,1,"Parts of Speech"\n' +
  '"Solve for x: 3x = 9","","x=1","x=2","x=3","x=4","C","Divide both sides by 3",1,2,"Linear Equations"\n';
