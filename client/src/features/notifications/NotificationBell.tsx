import { useState, useRef, useEffect } from 'react';
import { Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUnreadCount } from './useNotifications';
import NotificationList from './NotificationList';
export default function NotificationBell(){
  const[open,setOpen]=useState(false);const ref=useRef<HTMLDivElement>(null);const{data}=useUnreadCount();const count=data?.count??0;
  useEffect(()=>{const h=(e:MouseEvent)=>{if(ref.current&&!ref.current.contains(e.target as Node))setOpen(false);};document.addEventListener('mousedown',h);return()=>document.removeEventListener('mousedown',h);},[]);
  return(<div ref={ref} className="relative">
    <button onClick={()=>setOpen(o=>!o)} className="relative p-2 rounded-xl hover:bg-gray-100 text-gray-500 hover:text-gray-700">
      <Bell size={20}/>
      {count>0&&<span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">{count>99?'99+':count}</span>}
    </button>
    <AnimatePresence>
      {open&&(<motion.div initial={{opacity:0,y:6,scale:0.97}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:6,scale:0.97}} transition={{type:'spring',damping:24,stiffness:320}} className="absolute right-0 top-full mt-2 bg-white border border-gray-200 rounded-2xl shadow-xl z-50 w-80 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100"><h3 className="font-semibold text-gray-900 text-sm">Notifications</h3></div>
        <div className="max-h-[420px] overflow-y-auto"><NotificationList/></div>
      </motion.div>)}
    </AnimatePresence>
  </div>);
}
