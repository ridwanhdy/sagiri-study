import { createContext, useContext, useRef, useState } from 'react';
import { STORAGE_KEY, loadProgress, createProgress, introduceKana, finishLesson, createQuiz, answerQuiz, advanceQuiz, validateProgress } from '../lib/progress.js';

const ProgressContext = createContext(null);
export function ProgressProvider({children}) {
  const [initial] = useState(()=>loadProgress(()=>window.localStorage));
  const [state,setState]=useState(initial.state);
  const [notice,setNotice]=useState(initial.notice);
  const ref=useRef(state);
  function update(transform) {
    const next=transform(ref.current);
    if(next===ref.current) return next;
    ref.current=next; setState(next);
    try { localStorage.setItem(STORAGE_KEY,JSON.stringify(next)); }
    catch { setNotice('Browser tidak dapat menyimpan progres. Ekspor cadangan sebelum menutup halaman.'); }
    return next;
  }
  const actions={
    introduce:id=>update(s=>introduceKana(s,id)),
    finishLesson:id=>update(s=>finishLesson(s,id)),
    startQuiz:(mode,groupId)=> {
      const quiz=createQuiz(ref.current,mode,groupId);
      if(quiz) update(s=>({...s,activeQuiz:quiz}));
      return quiz;
    },
    answer:(session,question,value)=>update(s=>answerQuiz(s,session,question,value)),
    advance:session=>update(s=>advanceQuiz(s,session)),
    abandon:()=>update(s=>({...s,activeQuiz:null})),
    import:data=>{const parsed=validateProgress(data);setNotice('');update(()=>parsed);},
    reset:()=>{setNotice('');update(()=>createProgress());},
  };
  return <ProgressContext.Provider value={{state,actions,notice,dismissNotice:()=>setNotice('')}}>{children}</ProgressContext.Provider>;
}
export const useProgress=()=>useContext(ProgressContext);
