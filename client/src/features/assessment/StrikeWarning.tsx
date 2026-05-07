import {useEffect,useState} from 'react';
import {motion,AnimatePresence} from 'framer-motion';
import {AlertTriangle,AlertOctagon} from 'lucide-react';
interface Props{strikeCount:number;}
export default function StrikeWarning({strikeCount}:Props){
  const[visible,setVisible]=useState(false);
  useEffect(()=>{if(strikeCount===1||strikeCount===2){setVisible(true);const t=setTimeout(()=>setVisible(false),5000);return()=>clearTimeout(t);}},[strikeCount]);
  return(
    <AnimatePresence>
      {visible&&(
        <motion.div key={strikeCount} initial={{y:-80,opacity:0}} animate={{y:0,opacity:1}} exit={{y:-80,opacity:0}} transition={{type:'spring',damping:20,stiffness:300}}
          className={`fixed top-0 left-0 right-0 z-[9999] flex items-center gap-3 px-6 py-3 ${strikeCount===2?'bg-red-600':'bg-amber-500'} text-white`}
          role="alert" aria-live="assertive">
          {strikeCount===2?<AlertOctagon size={20}/>:<AlertTriangle size={20}/>}
          <p className="font-semibold text-sm">{strikeCount===1?`Tab switching detected. This has been recorded. (${strikeCount}/3 violations)`:`Final warning. Next violation will end your session. (2/3 violations)`}</p>
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/20"><motion.div className="h-full bg-white/60" initial={{width:'100%'}} animate={{width:'0%'}} transition={{duration:5,ease:'linear'}}/></div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
