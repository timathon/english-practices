import { useState, useEffect, useRef } from 'react'
import { API_URL } from '../../lib/auth'

export function LockdownOverlay({ nextAvailableAt, showChinese }: { nextAvailableAt: string, showChinese: boolean }) {
  const [timeLeft, setTimeLeft] = useState('');
  const [tapCount, setTapCount] = useState(0);
  const tapTimerRef = useRef<number | null>(null);

  const handleHourglassTap = () => {
    if (tapTimerRef.current) {
      window.clearTimeout(tapTimerRef.current);
    }
    const newCount = tapCount + 1;
    if (newCount >= 5) {
      setTapCount(0);
      const pass = window.prompt(showChinese ? '请输入重置代码：' : 'Enter reset passcode:');
      if (pass) {
        fetch(`${API_URL}/api/testdrive/reset`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ passcode: pass }),
          credentials: 'include'
        }).then(res => {
          if (res.ok) {
            window.alert(showChinese ? '计时器已重置，请刷新页面。' : 'Timer reset successful. Please refresh the page.');
            window.location.reload();
          } else {
            window.alert(showChinese ? '重置失败：代码错误。' : 'Reset failed: Invalid passcode.');
          }
        });
      }
    } else {
      setTapCount(newCount);
      tapTimerRef.current = window.setTimeout(() => {
        setTapCount(0);
        tapTimerRef.current = null;
      }, 2000);
    }
  };

  useEffect(() => {
    const target = new Date(nextAvailableAt).getTime();
    const timer = setInterval(() => {
      const now = Date.now();
      const diff = target - now;
      if (diff <= 0) {
        window.location.reload();
        return;
      }
      const h = Math.floor(diff / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeLeft(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
      }, 1000);
    return () => clearInterval(timer);
  }, [nextAvailableAt]);

  return (
    <div className="db-overlay-wrapper">
      <div className="db-lockdown-card">
        <div 
          onClick={handleHourglassTap}
          className="db-lockdown-icon"
        >
          ⌛
        </div>
        <h2 className="db-lockdown-title">
          {showChinese ? '体验时间已到' : 'Testdrive Expired'}
        </h2>
        <p className="db-lockdown-text">
          {showChinese ? '你的 20 分钟体验已结束。请在以下时间后再次尝试：' : 'Your 20-minute testdrive has ended. Please try again in:'}
        </p>
        <div className="db-lockdown-timer">
          {timeLeft}
        </div>
        <button
          onClick={() => (window.location.href = `${import.meta.env.BASE_URL.slice(0, -1) || ''}/signin`)}
          className="db-lockdown-btn"
        >
          {showChinese ? '返回登录' : 'Back to Sign In'}
        </button>
      </div>
    </div>
  );
}
