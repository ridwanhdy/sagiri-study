import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Check, ChevronLeft, ChevronRight, BookOpen, Zap, Play, PenLine } from 'lucide-react';
import { groupById } from '../data/kana.js';
import { useProgress } from '../context/ProgressContext.jsx';
import { PageTitle, ProgressBar, StatusBadge } from '../components/ui.jsx';
import { getStatus, hasGroup } from '../lib/progress.js';

export default function Learn() {
  const {groupId}=useParams();
  const [params]=useSearchParams();
  const group=hasGroup(groupId)?groupById[groupId]:null;
  const {state,actions}=useProgress();
  const [index,setIndex]=useState(()=>Math.max(0,group?.kana.findIndex(k=>k.id===params.get('kana'))??0));
  useEffect(()=>setIndex(Math.max(0,group?.kana.findIndex(k=>k.id===params.get('kana'))??0)),[groupId,params]);
  if(!group) return <div className="empty-state"><h1>Kelompok tidak ditemukan</h1><Link className="button primary" to="/hiragana">Kembali ke peta</Link></div>;
  const item=group.kana[index]??group.kana[0];
  const allKnown=group.kana.every(k=>state.kana[k.id].introduced);
  const known=state.kana[item.id].introduced;
  return <div className="page-enter lesson-page"><Link className="back-link" to="/hiragana"><ChevronLeft size={17}/> Peta Hiragana</Link><PageTitle eyebrow={`PELAJARAN ${String(group.index+1).padStart(2,'0')}`} title={group.name} description={group.description}/>
    <div className="lesson-wrap"><div className="lesson-top"><span><BookOpen size={16}/> Kartu belajar</span><span>{index+1} dari {group.kana.length}</span></div><ProgressBar value={index+1} max={group.kana.length} label="Posisi kartu"/>
      <section key={item.id} className="card learning-card page-enter"><div className="learning-card-header"><StatusBadge status={getStatus(state.kana[item.id])}/><span className="xp-hint"><Zap size={14}/> {known?'Sudah dikenali':'+2 XP saat pertama dikenali'}</span></div><div className="learning-character kana-font">{item.character}</div><div className="learning-romaji">{item.romaji}</div><div className="example-block"><small>CONTOH KATA</small><span className="kana-font">{item.example}</span><p>{item.meaning}</p></div>{item.note&&<p className="info-note">{item.note}</p>}<button disabled={known} onClick={()=>actions.introduce(item.id)} className={`button ${known?'secondary':'primary'} recognize-button`}><Check size={18}/>{known?'Sudah kamu kenali':'Sudah Saya Kenal'}</button><p className="learning-note">Kenali dulu, kuasai lewat latihan.</p></section>
      <div className="lesson-navigation"><button className="button ghost" disabled={index===0} onClick={()=>setIndex(i=>i-1)}><ChevronLeft size={17}/> Sebelumnya</button><div className="lesson-dots">{group.kana.map((k,i)=><button key={k.id} aria-label={`Buka kartu ${i+1}: ${k.character}`} aria-current={i===index?'step':undefined} className={i===index?'active':state.kana[k.id].introduced?'done':''} onClick={()=>setIndex(i)}/>)}</div><button className="button secondary" disabled={index===group.kana.length-1} onClick={()=>setIndex(i=>i+1)}>Berikutnya <ChevronRight size={17}/></button></div>
      <div className="writing-lesson-entry card"><span className="icon-tile purple"><PenLine size={22}/></span><div><h3>Lebih mudah ingat dengan menulis?</h3><p>Latih bentuk huruf ini di kanvas, lalu uji hafalanmu.</p></div><Link className="button secondary" to={`/menulis?group=${group.id}&kana=${item.id}`}><PenLine size={16}/> Tulis huruf ini</Link></div>
      {allKnown&&<div className="lesson-complete card"><span className="icon-tile cyan"><Check size={23}/></span><div><h3>Semua karakter sudah dikenali!</h3><p>Sekarang, uji ingatanmu dengan 10 soal.</p></div><Link className="button primary" onClick={()=>actions.finishLesson(group.id)} to={`/kuis/group?group=${group.id}`}><Play size={16}/> Mulai kuis kelompok</Link></div>}
    </div>
  </div>;
}
