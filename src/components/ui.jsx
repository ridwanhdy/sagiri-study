import { useEffect, useRef } from 'react';
import { X, BookOpen, Check, Circle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { statusLabels } from '../data/kana.js';

export function ProgressBar({value,max=100,label,className=''}) {
  return <div className={`progress-track ${className}`} role="progressbar" aria-label={label} aria-valuenow={value} aria-valuemin={0} aria-valuemax={max}><span style={{width:`${Math.min(100,value/max*100)}%`}} /></div>;
}
export function StatusBadge({status}) { return <span className={`status-badge ${status}`}>{status==='mastered'?<Check size={12}/>:<Circle size={7}/>} {statusLabels[status]}</span>; }
export function PageTitle({eyebrow,title,description,children}) {
  return <div className="page-title"><div>{eyebrow&&<p className="eyebrow">{eyebrow}</p>}<h1>{title}</h1>{description&&<p className="page-description">{description}</p>}</div>{children}</div>;
}
export function EmptyState({title,description,compact=false}) {
  return <div className={`empty-state ${compact?'compact':''}`}><div className="empty-icon"><BookOpen size={25}/></div><h3>{title}</h3><p>{description}</p><Link className="button secondary" to="/belajar/vowels">Mulai kelompok vokal</Link></div>;
}
export function Modal({open,onClose,title,children}) {
  const ref=useRef(null);
  useEffect(()=>{ if(open) ref.current?.showModal(); else ref.current?.close(); },[open]);
  return <dialog ref={ref} className="modal" onCancel={onClose} onClick={e=>{if(e.target===e.currentTarget)onClose();}} aria-labelledby="dialog-title"><div className="modal-header"><h2 id="dialog-title">{title}</h2><button className="icon-button" aria-label="Tutup dialog" onClick={onClose}><X size={20}/></button></div>{children}</dialog>;
}
export function SectionHeading({title,children}) { return <div className="section-heading"><h2>{title}</h2>{children}</div>; }
