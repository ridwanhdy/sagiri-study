import { useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, BookOpen, Check, ChevronLeft, ChevronRight, Eye, PenLine, Play, RotateCcw, Target, Trophy } from 'lucide-react';
import { groups, kana, kanaById, groupById } from '../data/kana.js';
import { hasGroup, hasKana, shuffle } from '../lib/progress.js';
import { hiraganaStrokes } from '../data/hiraganaStrokes.js';
import { evaluateHandwriting } from '../lib/handwriting.js';
import HandwritingCanvas from '../components/HandwritingCanvas.jsx';
import { PageTitle, ProgressBar } from '../components/ui.jsx';

function Reference({ item, compact = false }) {
  const reference = hiraganaStrokes[item.id];
  return <svg className={`writing-reference ${compact ? 'compact' : ''}`} viewBox="0 0 109 109" role="img" aria-label={`Contoh tulisan ${item.character}, dibaca ${item.romaji}`}>
    {reference.paths.map((path, i) => <path key={i} d={path} fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />)}
  </svg>;
}

export default function Writing() {
  const [params] = useSearchParams();
  const requestedKana = hasKana(params.get('kana')) ? kanaById[params.get('kana')] : null;
  const groupId = hasGroup(params.get('group')) ? params.get('group') : params.get('group') === 'all' ? 'all' : requestedKana?.group ?? 'vowels';
  const initialMode = params.get('mode') === 'quiz' ? 'quiz' : 'practice';
  return <WritingWorkspace key={`${groupId}:${requestedKana?.id ?? ''}:${initialMode}`} initialGroup={groupId} initialKana={requestedKana?.id} initialMode={initialMode} />;
}

function WritingWorkspace({ initialGroup, initialKana, initialMode }) {
  const [groupId, setGroupId] = useState(initialGroup);
  const [mode, setMode] = useState(initialMode);
  const pool = groupId === 'all' ? kana : groupById[groupId].kana;
  const [index, setIndex] = useState(() => Math.max(0, pool.findIndex(k => k.id === initialKana)));
  const [stage, setStage] = useState('intro');
  const [deck, setDeck] = useState([]);
  const [answers, setAnswers] = useState([]);
  const [strokes, setStrokes] = useState([]);
  const [drawing, setDrawing] = useState(false);
  const [showGuide, setShowGuide] = useState(true);
  const [feedback, setFeedback] = useState(null);
  const [canvasVersion, setCanvasVersion] = useState(0);
  const checked = useRef(false);
  const item = mode === 'quiz' && stage === 'active' ? kanaById[deck[index]] : pool[index % pool.length];
  const reference = hiraganaStrokes[item.id];
  const correctCount = answers.filter(answer => answer.correct).length;
  const groupLabel = groupId === 'all' ? 'Semua hiragana' : groupById[groupId].name;

  function resetDrawing() {
    checked.current = false;
    setStrokes([]);
    setDrawing(false);
    setFeedback(null);
    setCanvasVersion(version => version + 1);
  }
  function changeMode(nextMode) {
    setMode(nextMode);
    setIndex(0);
    setStage('intro');
    setAnswers([]);
    resetDrawing();
  }
  function changeGroup(nextGroup) {
    setGroupId(nextGroup);
    setIndex(0);
    setStage('intro');
    setAnswers([]);
    resetDrawing();
  }
  function startQuiz() {
    const questions = [];
    while (questions.length < 10) {
      const batch = shuffle(pool).map(k => k.id);
      if (batch.length > 1 && batch[0] === questions.at(-1)) [batch[0], batch[1]] = [batch[1], batch[0]];
      questions.push(...batch);
    }
    setDeck(questions.slice(0, 10));
    setIndex(0);
    setAnswers([]);
    setStage('active');
    resetDrawing();
  }
  function checkDrawing() {
    if (checked.current || drawing || !strokes.length) return;
    checked.current = true;
    const result = evaluateHandwriting(strokes, reference.strokes, { references: hiraganaStrokes, targetId: item.id });
    setFeedback(result);
    if (mode === 'quiz') setAnswers(previous => [...previous, { kanaId: item.id, correct: result.correct, score: result.score }]);
  }
  function nextQuestion() {
    if (!feedback) return;
    if (index === 9) { setStage('finished'); return; }
    setIndex(position => position + 1);
    resetDrawing();
  }
  function practiceAt(position) {
    setIndex((position + pool.length) % pool.length);
    resetDrawing();
  }

  return <div className="page-enter writing-page">
    <PageTitle eyebrow="BELAJAR LEWAT TULISAN" title="Latihan Menulis Hiragana" description="Tulis dengan tanganmu. Ulangi sampai bentuk dan bunyinya melekat.">
      <Link className="button ghost small-button" to="/hiragana"><BookOpen size={16} /> Peta Hiragana</Link>
    </PageTitle>
    <div className="writing-settings card">
      <div className="writing-mode-switch" role="group" aria-label="Mode latihan menulis">
        <button className={mode === 'practice' ? 'active' : ''} aria-pressed={mode === 'practice'} onClick={() => mode !== 'practice' && changeMode('practice')}><PenLine size={18} /><span>Meniru contoh</span></button>
        <button className={mode === 'quiz' ? 'active' : ''} aria-pressed={mode === 'quiz'} onClick={() => mode !== 'quiz' && changeMode('quiz')}><Target size={18} /><span>Uji hafalan</span></button>
      </div>
      <label className="writing-group-select" htmlFor="writing-group"><span>Kelompok huruf</span><select id="writing-group" value={groupId} onChange={event => changeGroup(event.target.value)}><option value="all">Semua hiragana · 46 huruf</option>{groups.map(group => <option key={group.id} value={group.id}>{group.name} · {group.kana.length} huruf</option>)}</select></label>
    </div>

    {mode === 'quiz' && stage === 'intro' ? <section className="card writing-intro">
      <span className="intro-icon"><Target size={34} /></span><p className="eyebrow">DARI BUNYI KE TULISAN</p><h2>Seberapa banyak yang kamu ingat?</h2><p>Sepuluh soal dari {groupLabel.toLowerCase()}. Kamu akan melihat romaji, lalu menulis hiragananya tanpa contoh.</p>
      <div className="writing-intro-steps"><span><PenLine size={19} /> Tulis di kanvas</span><span><Check size={19} /> Periksa bentuknya</span><span><Eye size={19} /> Lihat huruf yang benar</span></div>
      <button className="button primary" onClick={startQuiz}><Play size={17} /> Mulai 10 soal menulis</button><p className="writing-assessment-note">Hasil menulis dihitung untuk sesi ini. Pemeriksaan bentuk masih berupa perkiraan dan belum menambah XP atau penguasaan huruf.</p>
    </section> : mode === 'quiz' && stage === 'finished' ? <section className="card writing-results">
      <span className="result-trophy"><Trophy size={38} /></span><p className="eyebrow">SELESAI MENULIS 10 HURUF</p><h2>{correctCount === 10 ? 'Semua bentuk sudah sesuai!' : 'Satu latihan lagi, satu langkah maju.'}</h2><div className="writing-score"><strong>{correctCount}<small> / 10</small></strong><span>tulisan dinilai benar</span></div><p>Hasil ini berdasarkan kemiripan bentuk. Bandingkan kembali tulisanmu dengan contoh saat berlatih.</p>
      <div className="writing-answer-list">{answers.map((answer, position) => <Link key={position} className={answer.correct ? 'correct' : ''} to={`/menulis?group=${kanaById[answer.kanaId].group}&kana=${answer.kanaId}`} aria-label={`Soal ${position + 1}: ${kanaById[answer.kanaId].romaji}, ${answer.correct ? 'benar' : 'perlu diulang'}. Latih huruf ini.`}><span className="kana-font">{kanaById[answer.kanaId].character}</span><strong>{kanaById[answer.kanaId].romaji}</strong><small>{answer.correct ? 'Benar' : 'Ulangi'}</small></Link>)}</div>
      <div className="button-row"><button className="button primary" onClick={startQuiz}><RotateCcw size={17} /> Ulangi 10 soal</button><button className="button secondary" onClick={() => changeMode('practice')}><PenLine size={17} /> Meniru contoh</button></div><p className="helper-text">Klik huruf di atas untuk melatihnya lagi. Hasil sesi ini tidak mengubah XP atau akurasi kuis.</p>
    </section> : <>
      {mode === 'quiz' ? <div className="writing-quiz-progress"><div><span>Soal {index + 1} <span className="muted">dari 10</span></span><span><Check size={16} /> {correctCount} benar</span></div><ProgressBar value={index + (feedback ? 1 : 0)} max={10} label="Progres soal menulis" /></div> : <div className="writing-kana-picker" role="group" aria-label="Pilih huruf untuk ditulis">{pool.map((k, position) => <button key={k.id} className={position === index ? 'active' : ''} aria-pressed={position === index} aria-label={`Latih ${k.character}, ${k.romaji}`} onClick={() => position !== index && practiceAt(position)}><span className="kana-font">{k.character}</span><small>{k.romaji}</small></button>)}</div>}
      <div className="writing-workspace">
        <section className={`card writing-prompt ${mode === 'quiz' && !feedback ? 'hidden-reference' : ''}`}>
          <p className="eyebrow">{mode === 'practice' ? 'CONTOH TULISAN' : feedback ? 'HIRAGANA YANG BENAR' : 'TULIS HIRAGANA UNTUK BUNYI'}</p>
          {mode === 'practice' || feedback ? <><Reference item={item} /><div className="writing-reference-caption"><span className="kana-font">{item.character}</span><strong>{item.romaji}</strong></div><p>{reference.paths.length} goresan pada contoh</p><div className="writing-word-example"><span className="kana-font">{item.example}</span><small>{item.meaning}</small></div>{item.note && <p className="writing-kana-note">{item.note}</p>}</> : <><div className="writing-romaji-prompt">{item.romaji}</div><span className="writing-hidden-icon"><PenLine size={34} /></span><h2>Ingat bentuknya, lalu tulis.</h2><p>Huruf yang benar akan muncul setelah kamu menekan Periksa tulisan.</p></>}
          {mode === 'practice' && <div className="writing-practice-nav"><button className="button ghost small-button" onClick={() => practiceAt(index - 1)} aria-label="Huruf sebelumnya"><ChevronLeft size={18} /></button><span>{index + 1} / {pool.length}</span><button className="button ghost small-button" onClick={() => practiceAt(index + 1)} aria-label="Huruf berikutnya"><ChevronRight size={18} /></button></div>}
        </section>
        <section className="card writing-pad">
          <div className="writing-pad-header"><h2><PenLine size={18} /> Giliranmu menulis</h2>{mode === 'practice' && <label className="writing-guide-toggle"><input type="checkbox" checked={showGuide} onChange={event => setShowGuide(event.target.checked)} /> Pola bantu</label>}</div>
          <HandwritingCanvas key={`${item.id}:${canvasVersion}`} guidePaths={reference.paths} showGuide={mode === 'practice' && showGuide} disabled={!!feedback} onChange={setStrokes} onDrawingChange={setDrawing} label={`Area untuk menulis hiragana berbunyi ${item.romaji}`} />
          {feedback ? <div role="status" className={`writing-feedback ${feedback.correct ? 'correct' : 'retry'}`}><span className="feedback-icon">{feedback.correct ? <Check size={22} /> : <RotateCcw size={20} />}</span><div><strong>{feedback.correct ? 'Benar!' : mode === 'quiz' ? 'Belum sesuai. Pelajari contoh ini, ya.' : 'Belum sesuai. Coba lagi, ya.'}</strong><p>{feedback.correct ? 'Bentuk tulisanmu sesuai dengan contoh.' : feedback.reason === 'blank' || feedback.reason === 'tiny' ? 'Tuliskan huruf dengan jelas di tengah kanvas.' : 'Perhatikan lengkungan dan letak goresan pada contoh.'} <span className="kana-font">{item.character}</span> dibaca <b>{item.romaji}</b>.</p></div></div> : <p className="writing-pad-hint">{mode === 'practice' && showGuide ? 'Ikuti pola tipis, lalu angkat pena di akhir setiap goresan.' : 'Tulis cukup besar di tengah kotak, lalu periksa tulisanmu.'}</p>}
          <div className="writing-actions">{!feedback ? <button className="button primary" disabled={!strokes.length || drawing} onClick={checkDrawing}><Check size={18} /> Periksa tulisan</button> : mode === 'quiz' ? <button className="button primary" onClick={nextQuestion}>{index === 9 ? <><Trophy size={18} /> Lihat hasil</> : <>Soal berikutnya <ArrowRight size={18} /></>}</button> : <><button className="button secondary" onClick={resetDrawing}><RotateCcw size={17} /> Tulis ulang</button><button className="button primary" onClick={() => practiceAt(index + 1)}>Huruf berikutnya <ArrowRight size={17} /></button></>}</div>
        </section>
      </div>
      <p className="writing-assessment-note">Pemeriksaan otomatis membandingkan kemiripan bentuk dan jumlah goresan. Hasilnya bisa keliru untuk variasi tulisan tangan; gunakan contoh untuk mengecek kembali. Latihan ini belum menambah XP atau penguasaan huruf.</p>
    </>}
    <p className="writing-source">Contoh goresan: <a href="https://kanjivg.tagaini.net/" target="_blank" rel="noreferrer">KanjiVG</a> · <a href="./kanjivg-license.txt" target="_blank" rel="noreferrer">CC BY-SA 3.0 &amp; atribusi</a></p>
  </div>;
}
