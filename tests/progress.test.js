import test from 'node:test';
import assert from 'node:assert/strict';
import { kana, groups, kanaById } from '../src/data/kana.js';
import { createProgress, introduceKana, finishLesson, getStatus, getSummary, getStreak, jakartaDate, createQuiz, answerQuiz, advanceQuiz, difficultKana, learnedKana, weightedPick, isCorrect, validateProgress, loadProgress, STORAGE_KEY } from '../src/lib/progress.js';

const today=new Date('2026-10-01T05:00:00Z');
function seeded(seed=7) { return ()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;}; }
function recognized(ids=['a','i','u','e','o']) {return ids.reduce((s,id)=>introduceKana(s,id,today),createProgress());}
function complete(state,mode='group',group='vowels',wrongIndices=[]) {
  state={...state,activeQuiz:createQuiz(state,mode,group,seeded())};
  const id=state.activeQuiz.id;
  for(let i=0;i<10;i++) {
    const q=state.activeQuiz.questions[i];
    const value=wrongIndices.includes(i)?(q.type==='typing'?'wrong':q.choices.find(id=>id!==q.kanaId)):q.kanaId;
    state=answerQuiz(state,id,q.id,value,today);
    state=advanceQuiz(state,id,today);
  }
  return state;
}

test('46 unique basic kana, correct ordering and short rows',()=> {
  assert.equal(kana.length,46);assert.equal(new Set(kana.map(k=>k.character)).size,46);
  assert.deepEqual(groups.map(g=>g.kana.length),[5,5,5,5,5,5,5,3,5,2,1]);
  assert.equal(kana.at(-1).character,'ん'); assert.deepEqual(kana.map(k=>k.order),Array.from({length:46},(_,i)=>i));
  assert.ok(kana.every(k=>k.example&&k.meaning));
});
test('new dashboard has no fabricated statistics',()=> {
  const s=getSummary(createProgress(),today);
  assert.equal(s.new,46);assert.equal(s.learnedTotal,0);assert.equal(s.accuracy,0);assert.equal(s.level,1);assert.equal(s.streak,0);
});
test('first introduction gives XP once; final card completes lesson and mission',()=> {
  let s=introduceKana(createProgress(),'a',today);assert.equal(s.xp,2);assert.equal(getStatus(s.kana.a),'learned');
  assert.strictEqual(introduceKana(s,'a',today),s);
  s=recognized();assert.equal(s.xp,10);assert.deepEqual(s.daily['2026-10-01'].groups,['vowels']);assert.equal(s.history.length,1);
  assert.strictEqual(finishLesson(s,'vowels',today),s);
  assert.equal(getSummary(s).mastered,0);
});
test('mastery depends on attempts and can decrease; aggregate accuracy is weighted',()=> {
  assert.equal(getStatus({introduced:true,attempts:4,correct:4}),'learned');
  assert.equal(getStatus({introduced:false,attempts:5,correct:4}),'mastered');
  assert.equal(getStatus({introduced:true,attempts:6,correct:4}),'learned');
  const s=createProgress();s.kana.a={introduced:true,attempts:9,correct:9};s.kana.i={introduced:false,attempts:1,correct:0};
  assert.equal(getSummary(s).accuracy,90);assert.equal(getSummary(s).learnedTotal,2);
});
test('question submits lock immediately and abandon has no completion bonus',()=> {
  let s=recognized();s.activeQuiz=createQuiz(s,'group','vowels',seeded());
  const {id,questions}=s.activeQuiz;const q=questions[0];
  s=answerQuiz(s,id,q.id,q.kanaId,today);assert.equal(s.xp,12);assert.equal(s.kana[q.kanaId].attempts,1);
  assert.strictEqual(answerQuiz(s,id,q.id,q.kanaId,today),s);assert.equal(s.results.length,0);
  const saved=validateProgress(JSON.parse(JSON.stringify(s)));assert.equal(saved.xp,12);assert.equal(saved.activeQuiz.answers.length,1);
  s={...s,activeQuiz:null};assert.equal(s.xp,12);assert.equal(s.results.length,0);
});
test('perfect quiz earns 40 XP and finish/result refresh is idempotent',()=> {
  const s=complete(recognized());assert.equal(s.xp,50);assert.equal(s.results[0].xp,40);assert.equal(s.results[0].score,10);
  assert.strictEqual(advanceQuiz(s,s.results[0].id,today),s);
  const saved=validateProgress(JSON.parse(JSON.stringify(s)));assert.equal(saved.xp,50);assert.equal(saved.activeQuiz,null);
  assert.equal(getSummary(saved).attempts,10);assert.equal(saved.daily['2026-10-01'].answers,10);
});
test('non-perfect results retain actual errors and correct XP',()=> {
  const s=complete(recognized(),'group','vowels',[0,3]);assert.equal(s.xp,36);assert.equal(s.results[0].xp,26);assert.equal(s.results[0].score,8);
  assert.equal(s.results[0].answers.filter(a=>!a.correct).length,2);assert.equal(getSummary(s).accuracy,80);
  assert.deepEqual(validateProgress(s),s);
});
test('all groups include three quiz modes and unique correct options in group',()=> {
  for(const group of groups)for(let seed=1;seed<20;seed++) {
    const q=createQuiz(createProgress(),'group',group.id,seeded(seed));
    assert.equal(q.questions.length,10);assert.equal(new Set(q.questions.map(q=>q.type)).size,3);
    for(const question of q.questions) {
      assert.equal(kanaById[question.kanaId].group,group.id);
      if(question.type!=='typing') {
        assert.equal(question.choices.length,Math.min(4,group.kana.length));
        assert.equal(new Set(question.choices).size,question.choices.length);
        assert.equal(question.choices.filter(id=>id===question.kanaId).length,1);
        assert.ok(question.choices.every(id=>kanaById[id].group===group.id));
      }
    }
  }
});
test('wo does not get its accepted o alias as a second correct distractor',()=> {
  const s=recognized(kana.map(k=>k.id));
  for(let seed=1;seed<100;seed++)for(const q of createQuiz(s,'general',null,seeded(seed)).questions) {
    if(q.type==='kana-romaji')assert.equal(q.choices.filter(id=>isCorrect({...q,type:'typing'},kanaById[id].romaji)).length,1);
  }
});
test('wrong お choice for wo survives active and completed round trips',()=> {
  let state=recognized(['wo','o']);let quiz;
  for(let seed=1;seed<100;seed++) {
    const candidate=createQuiz(state,'general',null,seeded(seed));
    if(candidate.questions.some(q=>q.type==='romaji-kana'&&q.kanaId==='wo')) {quiz=candidate;break;}
  }
  assert.ok(quiz);state.activeQuiz=quiz;
  const id=quiz.id;
  for(let i=0;i<10;i++) {
    const q=state.activeQuiz.questions[i];
    const wrong=q.type==='romaji-kana'&&q.kanaId==='wo';
    state=answerQuiz(state,id,q.id,wrong?'o':q.kanaId,today);
    assert.deepEqual(validateProgress(JSON.parse(JSON.stringify(state))),state);
    if(wrong)assert.equal(state.activeQuiz.answers[i].correct,false);
    state=advanceQuiz(state,id,today);
  }
  assert.deepEqual(validateProgress(JSON.parse(JSON.stringify(state))),state);
  assert.ok(state.results[0].score<10);
});
test('typing accepts capitalization, trim and romaji aliases',()=> {
  for(const [id,value] of [['shi',' Si '],['chi','TI'],['tsu','tu'],['fu','HU'],['wo',' o '],['n','NN']]) assert.equal(isCorrect({kanaId:id,type:'typing'},value),true);
  assert.equal(isCorrect({kanaId:'ha',type:'typing'},'wa'),false);assert.equal(isCorrect({kanaId:'shi',type:'typing'},'s hi'),false);
});
test('adaptive excludes unseen kana, weights weaker more, reviews healthy pool',()=> {
  let s=createProgress();assert.equal(createQuiz(s,'adaptive'),null);
  s=recognized(['a','i','u']);assert.equal(difficultKana(s).length,0);assert.equal(createQuiz(s,'adaptive'),null);
  s.kana.a={introduced:true,attempts:1,correct:1};assert.equal(createQuiz(s,'adaptive').review,true);
  s.kana.a={introduced:true,attempts:10,correct:0};s.kana.i={introduced:true,attempts:10,correct:6};s.kana.u={introduced:true,attempts:10,correct:7};
  assert.deepEqual(difficultKana(s).map(k=>k.id),['a','i']);
  for(const q of createQuiz(s,'adaptive',null,seeded()).questions) assert.ok(['a','i'].includes(q.kanaId));
  const rng=seeded(20),counts={a:0,i:0};for(let i=0;i<12000;i++)counts[weightedPick(difficultKana(s),s,rng).id]++;
  assert.ok(counts.a>counts.i*1.5);assert.equal(learnedKana(s).length,3);
});
test('Jakarta date boundary and streak continuation, grace day, reset',()=> {
  assert.equal(jakartaDate('2026-09-30T16:59:59Z'),'2026-09-30');assert.equal(jakartaDate('2026-09-30T17:00:00Z'),'2026-10-01');
  let s=createProgress();s.activityDates=['2026-09-29','2026-09-30'];assert.equal(getStreak(s,today),2);
  s=introduceKana(s,'a',today);assert.equal(getStreak(s,today),3);s=introduceKana(s,'i',today);assert.equal(getStreak(s,today),3);
  assert.equal(getStreak(s,'2026-10-02T05:00:00Z'),3);assert.equal(getStreak(s,'2026-10-03T05:00:00Z'),0);
  s=introduceKana(s,'u','2026-10-03T05:00:00Z');assert.equal(getStreak(s,'2026-10-03T05:00:00Z'),1);
});
test('level starts at 1 and increases every 100 XP',()=> {
  const s=createProgress();for(const [xp,level,remainder] of [[0,1,0],[99,1,99],[100,2,0],[235,3,35]]){s.xp=xp;assert.equal(getSummary(s).level,level);assert.equal(getSummary(s).levelXp,remainder);}
});
test('round trip restores progress, feedback and next question',()=> {
  let s=recognized();s.activeQuiz=createQuiz(s,'group','vowels',seeded());const q=s.activeQuiz.questions[0];
  s=answerQuiz(s,s.activeQuiz.id,q.id,q.kanaId,today);
  const storage={getItem:key=>key===STORAGE_KEY?JSON.stringify(s):null};const loaded=loadProgress(storage);
  assert.deepEqual(loaded.state,s);assert.equal(loaded.notice,'');
  s=advanceQuiz(loaded.state,s.activeQuiz.id,today);assert.equal(s.activeQuiz.index,1);assert.deepEqual(validateProgress(s),s);
});
test('corrupt/unavailable storage recovers without crashing',()=> {
  for(const storage of [{getItem:()=>'{oops'},{getItem:()=>JSON.stringify({version:999})},()=>{throw new Error('denied');}]) {const loaded=loadProgress(storage);assert.equal(loaded.state.xp,0);assert.ok(loaded.notice);}
  assert.equal(loadProgress({getItem:()=>null}).notice,'');
});
test('imports reject malformed counts, versions, IDs and inconsistent rewards',()=> {
  const valid=complete(recognized());
  const alterations=[s=>s.version=2,s=>s.kana.a.correct=-1,s=>s.kana.a.attempts=0,s=>s.xp++,s=>s.results[0].score=9,s=>s.results[0].xp=999,s=>s.results[0].answers[0].kanaId='toString',s=>s.activityDates.push('2026-02-30'),s=>s.history[0].groupId='__proto__'];
  for(const alter of alterations){const changed=structuredClone(valid);alter(changed);assert.throws(()=>validateProgress(changed));}
  const active=recognized();active.activeQuiz=createQuiz(active,'group','vowels',seeded());active.activeQuiz.questions[0].kanaId='toString';assert.throws(()=>validateProgress(active));
  assert.deepEqual(validateProgress(valid),valid);
});
