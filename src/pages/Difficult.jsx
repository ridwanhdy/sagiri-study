import { Link } from 'react-router-dom';
import { Target, Play, CheckCheck, BookOpen } from 'lucide-react';
import { useProgress } from '../context/ProgressContext.jsx';
import { difficultKana, learnedKana, getSummary, getAccuracy } from '../lib/progress.js';
import { PageTitle, EmptyState, ProgressBar } from '../components/ui.jsx';

export default function Difficult() {
  const {state}=useProgress();
  const difficult=difficultKana(state), learned=learnedKana(state), summary=getSummary(state);
  return <div className="page-enter"><PageTitle eyebrow="ULANGI, LALU INGAT LAGI" title="Huruf Sulit" description="Temukan huruf yang perlu sedikit perhatian ekstra.">{summary.attempts>0&&<Link className="button primary" to="/kuis/adaptive"><Play size={17}/> Latihan Huruf Sulit</Link>}</PageTitle>
    {!summary.attempts?<section className="card"><EmptyState title="Belum ada riwayat latihan" description="Kenali huruf, lalu kerjakan kuis pertamamu. Huruf dengan akurasi di bawah 70% akan muncul di sini."/></section>:<><div className="card adaptive-note"><span className="icon-tile cyan">{difficult.length?<Target size={23}/>:<CheckCheck size={23}/>}</span><div><h2>{difficult.length?`${difficult.length} huruf untuk kamu ulang`:'Semua hurufmu cukup baik!'}</h2><p>{difficult.length?'Semakin rendah akurasi, semakin sering huruf muncul dalam latihan. Huruf tanpa riwayat tidak dianggap sulit.':`Tidak ada huruf dengan akurasi di bawah 70%. Latihan berikutnya adalah review dari ${learned.length} kana yang sudah dipelajari.`}</p></div></div>{difficult.length?<div className="difficult-grid">{difficult.map(k=>{const stats=state.kana[k.id];return <section className="card difficult-card" key={k.id}><div className="difficult-character kana-font">{k.character}</div><h2>{k.romaji}</h2><div className="difficult-numbers"><span><strong>{stats.attempts-stats.correct}</strong> kesalahan</span><span><strong>{getAccuracy(stats)}%</strong> akurasi</span></div><ProgressBar value={getAccuracy(stats)} label={`Akurasi ${k.romaji}`}/><p>{stats.correct} benar dari {stats.attempts} jawaban</p><Link className="text-link" to={`/belajar/${k.group}?kana=${k.id}`}><BookOpen size={15}/> Kenali kembali</Link></section>;})}</div>:<section className="card review-ready"><span className="kana-font">よくできました</span><h2>Jaga ingatanmu tetap segar.</h2><p>Review rutin membantu huruf yang sudah dikenal tetap melekat.</p><Link className="button primary" to="/kuis/adaptive"><Play size={17}/> Mulai review</Link></section>}</>}
  </div>;
}
