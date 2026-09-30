import { kana, kanaById, groups, groupById } from '../data/kana.js';

export const STORAGE_KEY = 'nihongo-quest.progress.v1';
export const VERSION = 1;
export const hasKana = id => Object.hasOwn(kanaById,id);
export const hasGroup = id => Object.hasOwn(groupById,id);
export const jakartaDate = (now = new Date()) => {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(now));
  const get = type => parts.find(part => part.type === type).value;
  return `${get('year')}-${get('month')}-${get('day')}`;
};
export const previousDate = date => new Date(Date.parse(`${date}T00:00:00Z`) - 86400000).toISOString().slice(0,10);
export const uid = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
export const createProgress = () => ({ version: VERSION, xp: 0, kana: Object.fromEntries(kana.map(k => [k.id, { introduced: false, attempts: 0, correct: 0 }])), activityDates: [], daily: {}, history: [], results: [], activeQuiz: null });
export const getStatus = item => item.attempts >= 5 && item.correct / item.attempts >= .8 ? 'mastered' : item.introduced || item.attempts > 0 ? 'learned' : 'new';
export const getAccuracy = item => item.attempts ? Math.round(item.correct / item.attempts * 100) : 0;
export function getStreak(state, now = new Date()) {
  const dates = new Set(state.activityDates);
  let date = jakartaDate(now);
  if (!dates.has(date)) date = previousDate(date);
  let streak = 0;
  while (dates.has(date)) { streak++; date = previousDate(date); }
  return streak;
}
export function getSummary(state, now = new Date()) {
  const values = Object.values(state.kana);
  const counts = { new: 0, learned: 0, mastered: 0 };
  values.forEach(item => counts[getStatus(item)]++);
  const attempts = values.reduce((sum,item) => sum + item.attempts,0);
  const correct = values.reduce((sum,item) => sum + item.correct,0);
  return { ...counts, learnedTotal: counts.learned + counts.mastered, mastery: Math.round(counts.mastered/46*100), attempts, correct, accuracy: attempts ? Math.round(correct/attempts*100) : 0, level: Math.floor(state.xp/100)+1, levelXp: state.xp%100, streak: getStreak(state,now) };
}
export const learnedKana = state => kana.filter(k => getStatus(state.kana[k.id]) !== 'new');
export const difficultKana = state => kana.filter(k => state.kana[k.id].attempts > 0 && state.kana[k.id].correct/state.kana[k.id].attempts < .7).sort((a,b) => state.kana[a.id].correct/state.kana[a.id].attempts - state.kana[b.id].correct/state.kana[b.id].attempts);
export const nextGroup = state => groups.find(g => g.kana.some(k => !state.kana[k.id].introduced)) ?? groups[0];
function activity(state, now) {
  const date = jakartaDate(now);
  if (!state.activityDates.includes(date)) state.activityDates.push(date);
  state.activityDates.sort();
  state.daily[date] ??= { answers: 0, introduced: [], groups: [] };
  return state.daily[date];
}
export function introduceKana(state, id, now = new Date()) {
  if (!hasKana(id) || state.kana[id].introduced) return state;
  const next = structuredClone(state);
  next.kana[id].introduced = true;
  next.xp += 2;
  activity(next,now).introduced.push(id);
  return finishLesson(next,kanaById[id].group,now);
}
export function finishLesson(state, groupId, now = new Date()) {
  const group = hasGroup(groupId) ? groupById[groupId] : null;
  if (!group || !group.kana.every(k => state.kana[k.id].introduced) || state.history.some(h=>h.type==='lesson' && h.groupId===groupId)) return state;
  const next = structuredClone(state);
  const day = activity(next,now);
  // A group counts on the day its final new character is first recognized.
  if (!day.groups.includes(groupId)) day.groups.push(groupId);
  next.history.unshift({ id: uid(), type: 'lesson', groupId, date: new Date(now).toISOString(), xp: group.kana.length*2 });
  return next;
}
export const shuffle = (items, random = Math.random) => {
  const result = [...items];
  for (let i=result.length-1;i>0;i--) { const j=Math.floor(random()*(i+1)); [result[i],result[j]]=[result[j],result[i]]; }
  return result;
};
export function weightedPick(pool, state, random = Math.random) {
  const weights = pool.map(k => 1 + (1-state.kana[k.id].correct/state.kana[k.id].attempts)*4);
  let target = random()*weights.reduce((a,b)=>a+b,0);
  for(let i=0;i<pool.length;i++) { target-=weights[i]; if(target<=0) return pool[i]; }
  return pool.at(-1);
}
export function createQuiz(state, mode='general', groupId=null, random=Math.random) {
  if(mode==='adaptive' && !Object.values(state.kana).some(k=>k.attempts>0))return null;
  const weak = difficultKana(state);
  const pool = mode === 'group' ? (hasGroup(groupId) ? groupById[groupId].kana : []) : mode === 'adaptive' && weak.length ? weak : learnedKana(state);
  if (!pool.length) return null;
  const choicePool=mode==='adaptive'?learnedKana(state):pool;
  const types = shuffle(['kana-romaji','romaji-kana','typing','kana-romaji','romaji-kana','typing','kana-romaji','romaji-kana','typing','typing'],random);
  const deck = shuffle(pool,random);
  const questions = types.map((type,index) => {
    const target = mode==='adaptive' && weak.length ? weightedPick(pool,state,random) : deck[index%deck.length];
    const distractors=choicePool.filter(k=>k.id!==target.id && (type!=='kana-romaji'||!target.alternatives.includes(k.romaji)));
    const choices = type==='typing' ? [] : shuffle([target,...shuffle(distractors,random).slice(0,3)],random).map(k=>k.id);
    return { id: uid(), kanaId: target.id, type, choices };
  });
  return { id: uid(), mode, groupId: mode==='group' ? groupId : null, review: mode==='adaptive' && !weak.length, startedAt: new Date().toISOString(), questions, answers: [], index: 0 };
}
export function isCorrect(question, value) {
  const target = kanaById[question.kanaId];
  if (question.type!=='typing') return value === target.id;
  return [target.romaji,...target.alternatives].includes(String(value).trim().toLowerCase());
}
export function answerQuiz(state, sessionId, questionId, value, now = new Date()) {
  const session = state.activeQuiz;
  if (!session || session.id!==sessionId || session.answers.length!==session.index || session.questions[session.index]?.id!==questionId) return state;
  const question = session.questions[session.index];
  if (question.type!=='typing' && !question.choices.includes(value)) return state;
  const next = structuredClone(state);
  const correct = isCorrect(question,value);
  const item = next.kana[question.kanaId];
  item.attempts++;
  if (correct) { item.correct++; next.xp+=2; }
  activity(next,now).answers++;
  next.activeQuiz.answers.push({ questionId, kanaId: question.kanaId, type: question.type, value: String(value), correct });
  return next;
}
export function advanceQuiz(state, sessionId, now = new Date()) {
  const session = state.activeQuiz;
  if(!session || session.id!==sessionId || session.answers.length!==session.index+1) return state;
  const next = structuredClone(state);
  if(session.index<9) { next.activeQuiz.index++; return next; }
  const score = session.answers.filter(a=>a.correct).length;
  const bonus = 10+(score===10?10:0);
  const result = { id: session.id, mode: session.mode, groupId: session.groupId, date: new Date(now).toISOString(), score, total: 10, xp: score*2+bonus, answers: session.answers };
  next.xp+=bonus;
  activity(next,now);
  next.results.unshift(result);
  next.history.unshift({ id: session.id, type: 'quiz', groupId: session.groupId, mode: session.mode, date: result.date, score, xp: result.xp });
  next.activeQuiz=null;
  return next;
}

const plain = value => value && typeof value==='object' && !Array.isArray(value);
const integer = value => Number.isSafeInteger(value) && value>=0;
const validDate = value => typeof value==='string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0,10)===value;
const timestamp = value => typeof value==='string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString()===value;
const modeValid = value => ['group','general','adaptive'].includes(value);
const assertion = condition => { if(!condition) throw new Error('File progres tidak valid atau versinya tidak didukung.'); };
function validateAnswers(answers, questions=null) {
  assertion(Array.isArray(answers) && answers.length<=10);
  answers.forEach((a,i)=> {
    assertion(plain(a) && typeof a.questionId==='string' && a.questionId.length>0 && hasKana(a.kanaId) && typeof a.value==='string' && typeof a.correct==='boolean');
    // Earlier v1 exports had no answer type. Active questions provide it;
    // completed legacy answers can only be checked using their recorded outcome.
    const type=questions?.[i]?.type ?? a.type ?? (a.correct?'typing':'kana-romaji');
    assertion(['kana-romaji','romaji-kana','typing'].includes(type));
    if(a.type!==undefined)assertion(a.type===type);
    assertion(a.correct===isCorrect({kanaId:a.kanaId,type},a.value));
    if(questions) assertion(a.questionId===questions[i].id && a.kanaId===questions[i].kanaId && a.correct===isCorrect(questions[i],a.value));
  });
}
export function validateProgress(input) {
  assertion(plain(input) && input.version===VERSION && integer(input.xp) && plain(input.kana));
  assertion(Object.keys(input.kana).length===46 && Object.keys(input.kana).every(hasKana));
  const output=createProgress(); output.xp=input.xp;
  kana.forEach(k=> { const p=input.kana[k.id]; assertion(plain(p) && typeof p.introduced==='boolean' && integer(p.attempts) && integer(p.correct) && p.correct<=p.attempts); output.kana[k.id]={introduced:p.introduced,attempts:p.attempts,correct:p.correct}; });
  assertion(Array.isArray(input.activityDates) && input.activityDates.every(validDate) && new Set(input.activityDates).size===input.activityDates.length);
  output.activityDates=[...input.activityDates].sort();
  assertion(plain(input.daily));
  Object.entries(input.daily).forEach(([date,day])=> {
    assertion(validDate(date) && plain(day) && integer(day.answers) && Array.isArray(day.introduced) && day.introduced.every(hasKana) && new Set(day.introduced).size===day.introduced.length && Array.isArray(day.groups) && day.groups.every(hasGroup) && new Set(day.groups).size===day.groups.length);
    output.daily[date]={answers:day.answers,introduced:[...day.introduced],groups:[...day.groups]};
  });
  assertion(Array.isArray(input.history) && Array.isArray(input.results));
  input.history.forEach(h=> {
    assertion(plain(h) && typeof h.id==='string' && ['lesson','quiz'].includes(h.type) && timestamp(h.date) && integer(h.xp) && (h.groupId===null || hasGroup(h.groupId)));
    assertion(h.type==='lesson' ? hasGroup(h.groupId) : modeValid(h.mode) && integer(h.score) && h.score<=10);
    output.history.push({id:h.id,type:h.type,date:h.date,xp:h.xp,groupId:h.groupId,...(h.type==='quiz'?{mode:h.mode,score:h.score}:{})});
  });
  input.results.forEach(r=> {
    assertion(plain(r) && typeof r.id==='string' && modeValid(r.mode) && timestamp(r.date) && (r.mode==='group' ? hasGroup(r.groupId) : r.groupId===null) && r.total===10 && integer(r.score) && r.score<=10);
    validateAnswers(r.answers);
    assertion(r.answers.length===10 && r.score===r.answers.filter(a=>a.correct).length && r.xp===r.score*2+10+(r.score===10?10:0));
    assertion(new Set(r.answers.map(a=>a.questionId)).size===10);
    if(r.mode==='group') assertion(r.answers.every(a=>kanaById[a.kanaId].group===r.groupId));
    output.results.push({id:r.id,mode:r.mode,groupId:r.groupId,date:r.date,score:r.score,total:10,xp:r.xp,answers:r.answers.map(cleanAnswer)});
  });
  assertion(new Set(output.results.map(r=>r.id)).size===output.results.length);
  if(input.activeQuiz!==null) {
    const q=input.activeQuiz;
    assertion(plain(q) && typeof q.id==='string' && modeValid(q.mode) && timestamp(q.startedAt) && typeof q.review==='boolean' && integer(q.index) && q.index<10 && (q.mode==='group'?hasGroup(q.groupId):q.groupId===null));
    assertion(Array.isArray(q.questions) && q.questions.length===10 && new Set(q.questions.map(x=>x.id)).size===10);
    q.questions.forEach(question=> {
      assertion(plain(question) && typeof question.id==='string' && hasKana(question.kanaId) && ['kana-romaji','romaji-kana','typing'].includes(question.type) && Array.isArray(question.choices));
      assertion(question.type==='typing' ? question.choices.length===0 : question.choices.length>0 && question.choices.length<=4 && new Set(question.choices).size===question.choices.length && question.choices.every(hasKana) && question.choices.includes(question.kanaId));
      if(question.type==='kana-romaji') assertion(question.choices.filter(id=>isCorrect({kanaId:question.kanaId,type:'typing'},kanaById[id].romaji)).length===1);
      if(q.mode==='group') assertion(kanaById[question.kanaId].group===q.groupId && question.choices.every(id=>kanaById[id].group===q.groupId));
    });
    validateAnswers(q.answers,q.questions);
    assertion(q.answers.length===q.index || q.answers.length===q.index+1);
    assertion(!output.results.some(r=>r.id===q.id));
    output.activeQuiz={id:q.id,mode:q.mode,groupId:q.groupId,review:q.review,startedAt:q.startedAt,index:q.index,questions:q.questions.map(x=>({id:x.id,kanaId:x.kanaId,type:x.type,choices:[...x.choices]})),answers:q.answers.map((a,i)=>cleanAnswer(a,q.questions[i].type))};
  }
  const expectedXp = Object.values(output.kana).reduce((sum,k)=>sum+(k.introduced?2:0)+k.correct*2,0) + output.results.reduce((sum,r)=>sum+10+(r.score===10?10:0),0);
  assertion(output.xp===expectedXp && Number.isSafeInteger(expectedXp));
  assertion(output.history.every(h=>h.type!=='quiz'||output.results.some(r=>r.id===h.id&&r.mode===h.mode&&r.score===h.score&&r.xp===h.xp&&r.groupId===h.groupId)));
  return output;
}
const cleanAnswer = (a,type=null) => ({questionId:a.questionId,kanaId:a.kanaId,type:typeof type==='string'?type:a.type??(a.correct?'typing':'kana-romaji'),value:a.value,correct:a.correct});
export function loadProgress(storage) {
  try { const resolved=typeof storage==='function'?storage():storage; const raw=resolved.getItem(STORAGE_KEY); return {state:raw?validateProgress(JSON.parse(raw)):createProgress(),notice:''}; }
  catch { return {state:createProgress(),notice:'Progres tersimpan tidak dapat dibaca. Anda dapat mulai lagi atau mengimpor cadangan melalui Pengaturan.'}; }
}
