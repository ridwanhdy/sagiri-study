import { Link, useParams } from 'react-router-dom';
import { Trophy, Zap, RotateCcw, LayoutDashboard, Check, BookOpen } from 'lucide-react';
import { useProgress } from '../context/ProgressContext.jsx';
import { kanaById } from '../data/kana.js';
import { PageTitle } from '../components/ui.jsx';

export default function Results() {
  const {id}=useParams(); const {state}=useProgress();
  const result=state.results.find(r=>r.id===id);
  if(!result) return <div className="empty-state"><h1>Hasil tidak ditemukan</h1><p>Selesaikan kuis untuk melihat hasilnya.</p><Link className="button primary" to="/">Kembali ke dashboard</Link></div>;
  const mistakes=[...new Set(result.answers.filter(a=>!a.correct).map(a=>a.kanaId))];
  return <div className="page-enter result-page"><PageTitle eyebrow="SATU LANGKAH LAGI SUDAH SELESAI" title="Hasil latihan"/><section className="card result-card"><div className={`result-trophy ${result.score===10?'perfect':''}`}><Trophy size={39}/></div><span className="result-label">{result.score===10?'SEMPURNA!':result.score>=7?'KERJA BAGUS!':'TERUS BERLATIH'}</span><h2>{result.score===10?'Sepuluh dari sepuluh. Hebat!':result.score>=7?'Ingatanmu semakin kuat.':'Setiap latihan adalah kemajuan.'}</h2><p>Luangkan waktu untuk mengulang huruf yang masih sulit.</p><div className="result-stats"><div><span>Jawaban benar</span><strong>{result.score}<small> / 10</small></strong></div><div><span>Akurasi</span><strong>{result.score*10}<small>%</small></strong></div><div><span>XP diperoleh</span><strong className="text-purple">+{result.xp}<small> XP</small></strong></div></div><div className="xp-breakdown"><span><Zap size={15}/> Jawaban: +{result.score*2}</span><span>Selesai: +10</span>{result.score===10&&<span>Sempurna: +10</span>}</div>{mistakes.length?<div className="result-review"><h3>Huruf untuk diulang</h3><div className="mistake-list">{mistakes.map(k=> <Link key={k} to={`/belajar/${kanaById[k].group}?kana=${k}`}><span className="kana-font">{kanaById[k].character}</span><strong>{kanaById[k].romaji}</strong><BookOpen size={16}/></Link>)}</div></div>:<p className="perfect-message"><Check size={18}/> Semua jawaban benar. Pertahankan dengan review rutin.</p>}<div className="button-row"><Link className="button primary" to={`/kuis/${result.mode}${result.groupId?`?group=${result.groupId}`:''}`}><RotateCcw size={17}/> Ulangi latihan</Link><Link className="button secondary" to="/"><LayoutDashboard size={17}/> Kembali ke dashboard</Link></div></section></div>;
}
