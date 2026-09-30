import { NavLink, Outlet, useLocation, Link } from 'react-router-dom';
import { LayoutDashboard, Grid2X2, ChartNoAxesCombined, Settings2, Flame, Zap, Target, ChevronRight, X, BookOpen, PenLine } from 'lucide-react';
import { useEffect } from 'react';
import { useProgress } from '../context/ProgressContext.jsx';
import { getSummary } from '../lib/progress.js';
import { ProgressBar } from './ui.jsx';

const navigation=[['/','Dashboard',LayoutDashboard],['/hiragana','Peta Hiragana',Grid2X2],['/menulis','Latihan Menulis',PenLine],['/huruf-sulit','Huruf Sulit',Target],['/progres','Progres Saya',ChartNoAxesCombined],['/pengaturan','Pengaturan',Settings2]];
export default function Layout() {
  const {state,notice,dismissNotice}=useProgress();
  const summary=getSummary(state);
  const {pathname}=useLocation();
  const label=navigation.find(([path])=>path===pathname)?.[1]??(pathname.startsWith('/belajar')?'Sesi Belajar':pathname.startsWith('/kuis')?'Latihan Hiragana':'Hasil Kuis');
  useEffect(()=>{window.scrollTo(0,0); document.title=`${label} · Nihongo Quest`;document.querySelector('main')?.focus({preventScroll:true});},[pathname,label]);
  return <div className="app-layout"><a className="skip-link" href="#main" onClick={e=>{e.preventDefault();document.querySelector('main')?.focus();}}>Lewati ke konten</a>
    <aside className="sidebar"><Link to="/" className="brand"><span className="brand-mark kana-font">あ</span><span>Nihongo<span className="brand-second">Quest<span className="brand-dot">.</span></span></span></Link>
      <div className="sidebar-caption">RUANG BELAJAR</div><nav className="desktop-nav" aria-label="Navigasi utama">{navigation.map(([path,name,Icon])=><NavLink key={path} to={path} end={path==='/'} className={({isActive})=>isActive?'nav-item active':'nav-item'}><Icon size={20}/>{name}</NavLink>)}</nav>
      <div className="sidebar-note"><BookOpen size={20}/><strong>Sedikit setiap hari.</strong><p>Setiap huruf adalah satu langkah lebih dekat.</p><span className="kana-font">継続は力なり</span></div>
      <div className="profile"><span className="avatar">P</span><div><strong>Playful</strong><span>Pelajar bahasa Jepang</span></div><span className="level-chip">Lv. {summary.level}</span></div>
    </aside>
    <div className="workspace"><header className="topbar"><div className="breadcrumb"><span className="muted">Ruang belajar</span><ChevronRight size={14}/><span>{label}</span></div><div className="topbar-right"><span className="header-streak"><Flame size={17}/> {summary.streak}<span>hari</span></span><span className="top-avatar">P</span></div></header>
      <main id="main" tabIndex={-1}>{notice&&<div role="status" className="notice"><span>{notice}</span><button className="icon-button" aria-label="Tutup pemberitahuan" onClick={dismissNotice}><X size={18}/></button></div>}<Outlet/></main>
      <footer className="app-footer"><span>Nihongo Quest <span className="muted">· Hiragana Trainer</span></span><span className="muted">Satu huruf. Satu langkah.</span></footer>
    </div>
    <nav className="mobile-nav" aria-label="Navigasi mobile">{navigation.map(([path,name,Icon])=><NavLink key={path} to={path} end={path==='/'} className={({isActive})=>isActive?'active':''}><Icon size={20}/><span>{path==='/menulis'?'Menulis':path==='/pengaturan'?'Atur':path==='/huruf-sulit'?'Sulit':name.replace('Peta ','').replace(' Saya','')}</span></NavLink>)}</nav>
  </div>;
}
