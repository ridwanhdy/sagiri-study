import { useRef, useState } from 'react';
import { Download, Upload, Trash2, HardDrive, ShieldCheck, Info, Check, Zap } from 'lucide-react';
import { useProgress } from '../context/ProgressContext.jsx';
import { jakartaDate, validateProgress } from '../lib/progress.js';
import { PageTitle, Modal } from '../components/ui.jsx';

export default function Settings() {
  const {state,actions}=useProgress();
  const [confirmation,setConfirmation]=useState(null),[pending,setPending]=useState(null),[message,setMessage]=useState(null),[busy,setBusy]=useState(false);
  const file=useRef(null);
  function exportData() {
    const blob=new Blob([JSON.stringify(state,null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob),link=document.createElement('a');
    link.href=url;link.download=`nihongo-quest-${jakartaDate()}.json`;
    document.body.appendChild(link);link.click();link.remove();
    setTimeout(()=>URL.revokeObjectURL(url),30000);
    setMessage({success:true,text:'Cadangan progres berhasil diekspor.'});
  }
  async function importData(event) {
    const chosen=event.target.files?.[0];
    if(!chosen)return;
    setBusy(true);
    try {
      if(chosen.size>5*1024*1024)throw new Error('File terlalu besar. Batas impor adalah 5 MB.');
      const imported=validateProgress(JSON.parse(await chosen.text()));
      setPending(imported);setConfirmation('import');setMessage(null);
    } catch(error) {setMessage({success:false,text:error instanceof SyntaxError?'File bukan JSON yang valid. Progresmu belum diubah.':`${error.message} Progresmu belum diubah.`});}
    finally {setBusy(false);event.target.value='';}
  }
  return <div className="page-enter settings-page"><PageTitle eyebrow="RUANG BELAJARMU" title="Pengaturan" description="Kelola progres dan simpan cadangan perjalananmu."/>
    {message&&<div className={`settings-message ${message.success?'success':'error'}`} role="status">{message.success?<Check size={19}/>:<Info size={19}/>} {message.text}</div>}
    <section className="card storage-info"><span className="icon-tile cyan"><HardDrive size={24}/></span><div><h2>Progres tersimpan di browser ini</h2><p>XP, riwayat, dan penguasaan hiragana disimpan otomatis. Gunakan browser dan alamat aplikasi yang sama untuk melanjutkan belajar. Mengekspor progres memberi kamu cadangan untuk pindah perangkat atau memulihkan data.</p><span className="storage-tag"><ShieldCheck size={15}/> Pribadi · Tanpa akun · Penyimpanan lokal</span></div></section>
    <section className="card settings-section"><h2>Cadangan progres</h2><div className="setting-row"><div className="setting-icon"><Download size={21}/></div><div><h3>Ekspor progres</h3><p>Unduh seluruh progresmu sebagai file JSON.</p></div><button className="button secondary" onClick={exportData}><Download size={16}/> Ekspor JSON</button></div><div className="setting-row"><div className="setting-icon"><Upload size={21}/></div><div><h3>Impor progres</h3><p>Pulihkan cadangan. Progres saat ini akan diganti setelah konfirmasi.</p></div><input ref={file} className="sr-only" type="file" accept=".json,application/json" aria-label="Pilih file cadangan progres" onChange={importData}/><button disabled={busy} className="button secondary" onClick={()=>file.current?.click()}><Upload size={16}/> {busy?'Memeriksa…':'Impor JSON'}</button></div></section>
    <section className="card settings-section xp-rules"><h2>Bagaimana progres dihitung?</h2><div className="rules-grid"><div><span>Kenali kana pertama kali</span><strong>+2 XP</strong></div><div><span>Jawaban benar</span><strong>+2 XP</strong></div><div><span>Selesaikan 10 soal</span><strong>+10 XP</strong></div><div><span>Bonus kuis sempurna</span><strong>+10 XP</strong></div></div><p>Mulai level 1, naik setiap 100 XP. Kana dikuasai setelah minimal 5 jawaban dengan akurasi minimal 80%. Streak mengikuti tanggal Asia/Jakarta.</p></section>
    <section className="card settings-section reset-section"><h2>Mulai dari awal</h2><div className="setting-row"><div className="setting-icon"><Trash2 size={21}/></div><div><h3>Reset seluruh progres</h3><p>Hapus XP, streak, penguasaan, dan riwayat dari browser ini. Ekspor cadangan terlebih dahulu jika ingin menyimpannya.</p></div><button className="button reset-button" onClick={()=>setConfirmation('reset')}>Reset progres</button></div></section>
    <Modal open={!!confirmation} onClose={()=>{setConfirmation(null);setPending(null);}} title={confirmation==='reset'?'Reset seluruh progres?':'Ganti progres dari cadangan?'}><p className="modal-copy">{confirmation==='reset'?'Seluruh progres di browser ini akan dihapus. Jika sudah punya cadangan JSON, kamu bisa mengimpornya kembali.':`Cadangan berisi ${pending?.xp??0} XP akan menggantikan progres saat ini. Ekspor dulu jika kamu ingin menyimpan progres lama.`}</p><div className="button-row"><button className="button ghost" onClick={()=>{setConfirmation(null);setPending(null);}}>Batal</button><button className={`button ${confirmation==='reset'?'danger':'primary'}`} onClick={()=>{if(confirmation==='reset'){actions.reset();setMessage({success:true,text:'Progres telah direset. Perjalanan baru siap dimulai.'});}else {actions.import(pending);setMessage({success:true,text:'Cadangan berhasil diimpor. Selamat melanjutkan belajar!'});}setConfirmation(null);setPending(null);}}>{confirmation==='reset'?'Ya, reset progres':'Impor dan ganti progres'}</button></div></Modal>
  </div>;
}
