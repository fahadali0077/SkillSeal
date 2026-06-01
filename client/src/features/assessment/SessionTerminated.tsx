import {Link} from 'react-router-dom';
import {motion} from 'framer-motion';
import {AlertOctagon,ArrowRight} from 'lucide-react';
export default function SessionTerminated({onReset}:{onReset:()=>void}){
  return(
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-950 px-6 text-center">
      <motion.div initial={{scale:0.7,opacity:0}} animate={{scale:1,opacity:1}} transition={{type:'spring',damping:18}} className="max-w-md w-full">
        <div className="w-20 h-20 rounded-full bg-red-900/40 border border-red-800 flex items-center justify-center mx-auto mb-6"><AlertOctagon size={40} className="text-red-500"/></div>
        <h1 className="text-2xl font-bold text-white mb-3">Session Terminated</h1>
        <p className="text-gray-400 leading-relaxed mb-8">Your assessment session has been ended due to multiple integrity violations. A cooldown period is now active.</p>
        <div className="flex flex-col gap-3">
          <Link to="/profile" onClick={onReset} className="flex items-center justify-center gap-2 bg-white text-gray-900 font-semibold px-6 py-3 rounded-xl hover:bg-gray-100">Return to profile <ArrowRight size={16}/></Link>
          <button onClick={onReset} className="text-gray-500 hover:text-gray-300 text-sm py-2">Back to assessment landing</button>
        </div>
      </motion.div>
    </div>
  );
}
