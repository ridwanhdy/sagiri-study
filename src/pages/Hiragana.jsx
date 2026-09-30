import { useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Check, Circle, Play, PenLine } from 'lucide-react';
import { groups } from '../data/kana.js';
import { useProgress } from '../context/ProgressContext.jsx';
import { getStatus, getAccuracy, getSummary } from '../lib/progress.js';
import { PageTitle, ProgressBar, StatusBadge, Modal } from '../components/ui.jsx';

export default function Hiragana() {
  const {state}=useProgress();
  const [selected,setSelected]=useState(null);
  const summary=getSummary(state);
  return <div className="page-enter"><PageTitle eyebrow="KENALI • LATIH • KUASAI" title="Peta Hiragana" description="46 karakter kecil. Awal dari perjalanan yang besar."><div className="writing-entry-actions"><Link className="button primary" to="/menulis"><PenLine size={16}/> Latihan menulis</Link><Link className="button secondary" to="/kuis/general"><Play size={16}/> Latihan umum</Link></div></PageTitle>
    <div className="map-summary card"><div><span className="icon-tile cyan"><BookOpen size={21}/></span><div><strong>{summary.learnedTotal} dari 46 kana dipelajari</strong><p>{summary.mastered} dikuasai · {summary.mastery}% penguasaan</p></div></div><div className="map-legend"><StatusBadge status="new"/><StatusBadge status="learned"/><StatusBadge status="mastered"/></div></div>
    <div className="card kana-map"><div className="map-columns"><span>KELOMPOK</span>{['A','I','U','E','O'].map(v=><span key={v}>{v}</span>)}</div>{groups.map(group=> {
      const slots=group.id==='y'?[group.kana[0],null,group.kana[1],null,group.kana[2]]:group.id==='w'?[group.kana[0],null,null,null,group.kana[1]]:group.id==='final-n'?[group.kana[0],null,null,null,null]:group.kana;
      const mastered=group.kana.filter(k=>getStatus(state.kana[k.id])==='mastered').length;
      return <div className="map-row" key={group.id}><div className="map-group"><Link to={`/belajar/${group.id}`}><strong>{group.name}</strong><small>{mastered}/{group.kana.length} dikuasai</small></Link></div>{slots.map((k,i)=>k?<button aria-label={`${k.character}, ${k.romaji}, ${getStatus(state.kana[k.id])==='new'?'Baru':getStatus(state.kana[k.id])==='learned'?'Dipelajari':'Dikuasai'}`} key={k.id} className={`kana-cell ${getStatus(state.kana[k.id])}`} onClick={()=>setSelected(k)}><span className="kana-font">{k.character}</span><small>{k.romaji}</small><span className="cell-status">{getStatus(state.kana[k.id])==='mastered'?<Check size={11}/>:<Circle size={5}/>}</span></button>:<div key={`blank-${i}`} className="kana-blank" aria-hidden="true"/>)}</div>;
    })}</div><p className="helper-text">Klik karakter untuk melihat contohnya, atau nama kelompok untuk mulai belajar. Dikuasai = minimal 5 jawaban dengan akurasi 80%.</p>
    <Modal open={!!selected} onClose={()=>setSelected(null)} title="Kenali karakter">{selected&&<div className="kana-detail"><span className="detail-character kana-font">{selected.character}</span><h3>{selected.romaji}</h3><StatusBadge status={getStatus(state.kana[selected.id])}/><div className="example-block"><span className="kana-font">{selected.example}</span><p>{selected.meaning}</p></div>{selected.note&&<p className="info-note">{selected.note}</p>}<p className="helper-text">{state.kana[selected.id].attempts} jawaban · {state.kana[selected.id].attempts?`${getAccuracy(state.kana[selected.id])}% akurasi`:'Belum ada riwayat kuis'}</p><Link className="button primary" onClick={()=>setSelected(null)} to={`/belajar/${selected.group}?kana=${selected.id}`}>Belajar kelompok ini</Link></div>}</Modal>
  </div>;
}
