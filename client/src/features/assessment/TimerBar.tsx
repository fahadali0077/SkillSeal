interface Props { timeLimitMs:number; timeRemainingMs:number; }
export default function TimerBar({timeLimitMs,timeRemainingMs}:Props){
  const pct=timeLimitMs>0?(timeRemainingMs/timeLimitMs)*100:0;
  const color=pct>50?'#3b82f6':pct>20?'#f59e0b':'#ef4444';
  const totalSecs=Math.ceil(timeRemainingMs/1000);
  const mins=Math.floor(totalSecs/60),secs=totalSecs%60;
  const label=mins>0?`${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`:`${String(secs).padStart(2,'0')}s`;
  return(
    <div className="flex items-center gap-3 w-full select-none">
      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{width:`${pct}%`,background:color,transition:'width 0.1s linear, background-color 0.5s ease'}} />
      </div>
      <span className="text-sm font-mono font-semibold tabular-nums w-12 text-right" style={{color,transition:'color 0.5s ease'}}>{label}</span>
    </div>
  );
}
