import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Check, X, Zap, Target, Play, BookOpen, Keyboard, CheckCheck, LogOut, Trophy } from 'lucide-react';
import { useProgress } from '../context/ProgressContext.jsx';
import { kanaById, groupById } from '../data/kana.js';
import { difficultKana, learnedKana, hasGroup } from '../lib/progress.js';
import { EmptyState, PageTitle, ProgressBar, Modal } from '../components/ui.jsx';

export default function Quiz() {
  const {mode}=useParams(), [params]=useSearchParams();
  const groupId=params.get('group');
  const {state,actions}=useProgress();
  const navigate=useNavigate();
  const [started,setStarted]=useState(false),[text,setText]=useState(''),[confirm,setConfirm]=useState(null);
  const input=useRef(null);
  const session=state.activeQuiz;
  const matching=session?.mode===mode && (mode!=='group'||session.groupId===groupId);
  const valid=['group','general','adaptive'].includes(mode) && (mode!=='group'||hasGroup(groupId));
  const weak=difficultKana(state);
  const pool=mode==='group'?(hasGroup(groupId)?groupById[groupId].kana:[]):mode==='adaptive'&&weak.length?weak:learnedKana(state);
  const noAdaptiveHistory=mode==='adaptive'&&!Object.values(state.kana).some(k=>k.attempts>0);
  const title=mode==='group'?`Kuis ${hasGroup(groupId)?groupById[groupId].name:''}`:mode==='adaptive'?'Latihan Huruf Sulit':'Latihan umum';
  const current=session?.questions[session.index];
  useEffect(()=>{setText(''); if(current?.type==='typing')input.current?.focus();},[current?.id]);
  function start() {
    if(session) {setConfirm('replace');return;}
    actions.startQuiz(mode,groupId);setStarted(true);
  }
  function next() {
    const resultId=session.id;
    const updated=actions.advance(resultId);
    if(!updated.activeQuiz)navigate(`/hasil/${resultId}`);
  }
  if(!valid) return <EmptyState title="Latihan tidak ditemukan" description="Pilih kelompok di Peta Hiragana untuk mulai."/>;
  if(!pool.length||noAdaptiveHistory) return <><PageTitle title={title}/><div className="card"><EmptyState title={noAdaptiveHistory?'Belum ada riwayat latihan':'Kenali huruf pertamamu dulu'} description="Mulai dengan kelompok あ・い・う・え・お, lalu kerjakan kuis pertamamu. Latihan adaptif akan menyesuaikan riwayat jawabanmu."/></div></>;
  if(!matching || !started) return <div className="page-enter"><PageTitle eyebrow="SAATNYA MENGASAH INGATAN" title={title} description={mode==='adaptive'?(difficultKana(state).length?'Latihan berbobot dari huruf dengan akurasi di bawah 70%.':'Semua huruf cukup baik. Mari review huruf yang sudah dipelajari.'):'Sepuluh soal singkat untuk mengenali hiragana dengan lebih percaya diri.'}/><section className="card quiz-intro"><div className="intro-icon"><Target size={35}/></div><h2>Latihan kecil, ingatan lebih kuat.</h2><p>{pool.length} kana tersedia · 10 soal · tanpa batas waktu</p><div className="quiz-modes"><div><CheckCheck size={23}/><strong>Kana ke romaji</strong><span>Pilih bunyi yang tepat</span></div><div><BookOpen size={23}/><strong>Romaji ke kana</strong><span>Temukan karakternya</span></div><div><Keyboard size={23}/><strong>Ketik romaji</strong><span>Latih ingatan tanpa petunjuk</span></div></div><div className="quiz-xp-info"><Zap size={17}/><p>+2 XP tiap jawaban benar · +10 XP selesai · +10 XP jika sempurna</p></div>{matching&&<div className="resume-note">Ada sesi tersimpan: soal {Math.min(session.index+1,10)} dari 10.</div>}<div className="button-row">{matching&&<button className="button primary" onClick={()=>setStarted(true)}>Lanjutkan sesi</button>}<button className={`button ${matching?'secondary':'primary'}`} onClick={start}><Play size={17}/>{session?'Mulai sesi baru':'Mulai 10 soal'}</button><Link className="button ghost" to="/">Kembali</Link></div></section><Modal open={confirm==='replace'} onClose={()=>setConfirm(null)} title="Mulai sesi baru?"><p className="modal-copy">Sesi sebelumnya akan ditinggalkan. Jawaban dan XP yang sudah diperoleh tetap tersimpan, tetapi bonus penyelesaian belum diberikan.</p><div className="button-row"><button className="button ghost" onClick={()=>setConfirm(null)}>Batal</button><button className="button primary" onClick={()=>{actions.startQuiz(mode,groupId);setStarted(true);setConfirm(null);}}>Mulai sesi baru</button></div></Modal></div>;
  const item=kanaById[current.kanaId];
  const answered=session.answers[session.index];
  const correctCount=session.answers.filter(a=>a.correct).length;
  return <div className="page-enter quiz-page"><div className="quiz-heading"><div><p className="eyebrow">{session.review?'REVIEW HIRAGANA':title.toUpperCase()}</p><h1>Latih ingatanmu</h1></div><button className="button ghost small-button" onClick={()=>setConfirm('leave')}><LogOut size={16}/> Akhiri</button></div><div className="quiz-progress"><span>Soal {session.index+1} <span className="muted">dari 10</span></span><span><Check size={16}/> {correctCount} benar</span></div><ProgressBar value={session.index+(answered?1:0)} max={10} label="Progres kuis"/>
    <section className="card question-card" key={current.id}><p className="question-type">{current.type==='kana-romaji'?'PILIH ROMAJI':current.type==='romaji-kana'?'PILIH HIRAGANA':'KETIK ROMAJI'}</p><h2>{current.type==='romaji-kana'?'Karakter mana yang berbunyi ini?':'Bagaimana karakter ini dibaca?'}</h2><div className={`quiz-character ${current.type==='romaji-kana'?'romaji-prompt':'kana-font'}`}>{current.type==='romaji-kana'?item.romaji:item.character}</div>
      {current.type==='typing'?<form className="typing-form" onSubmit={e=>{e.preventDefault();if(text.trim()&&!answered)actions.answer(session.id,current.id,text);}}><label htmlFor="romaji-answer">Jawaban romaji</label><div><input ref={input} id="romaji-answer" type="text" autoComplete="off" autoCapitalize="none" spellCheck="false" value={answered?answered.value:text} onChange={e=>setText(e.target.value)} disabled={!!answered} placeholder="Tulis romaji di sini"/><button className="button primary" disabled={!!answered||!text.trim()} type="submit">Periksa</button></div><small>Kapital dan spasi di awal/akhir tidak memengaruhi jawaban.</small></form>:<div className="answer-choices">{current.choices.map((id,i)=>{const option=kanaById[id];const status=answered?(id===item.id?'correct':answered.value===id?'incorrect':''):'';return <button key={id} className={`answer-choice ${status}`} disabled={!!answered} onClick={()=>actions.answer(session.id,current.id,id)}><span className="choice-letter">{String.fromCharCode(65+i)}</span><span className={current.type==='romaji-kana'?'kana-font':''}>{current.type==='romaji-kana'?option.character:option.romaji}</span>{status==='correct'?<Check size={21}/>:status==='incorrect'?<X size={21}/>:null}</button>;})}</div>}
      {answered&&<div role="status" className={`answer-feedback ${answered.correct?'correct':'incorrect'}`}><span className="feedback-icon">{answered.correct?<Check size={22}/>:<X size={22}/>}</span><div><strong>{answered.correct?'Tepat sekali!':'Belum tepat. Tidak apa-apa.'}</strong><p><span className="kana-font">{item.character}</span> dibaca <b>{item.romaji}</b>.{item.note?' Sebagai partikel dibaca o.':''}</p></div>{answered.correct&&<span className="xp-earned">+2 XP</span>}</div>}
    </section><div className="quiz-next">{answered?<button className="button primary" onClick={next}>{session.index===9?<><Trophy size={18}/> Lihat hasil</>:'Lanjut'}</button>:<p>Pilih atau tulis jawabanmu untuk melanjutkan.</p>}</div>
    <Modal open={confirm==='leave'} onClose={()=>setConfirm(null)} title="Akhiri latihan ini?"><p className="modal-copy">Jawabanmu tetap tersimpan. Bonus penyelesaian diberikan setelah semua 10 soal selesai.</p><div className="button-row"><button className="button ghost" onClick={()=>setConfirm(null)}>Lanjutkan latihan</button><button className="button secondary" onClick={()=>{actions.abandon();navigate('/');}}>Akhiri latihan</button></div></Modal>
  </div>;
}
