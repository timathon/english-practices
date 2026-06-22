import { useState, useEffect } from 'react';

interface DailyLockModalProps {
    onClose: () => void;
}

export function DailyLockModal({ onClose }: DailyLockModalProps) {
    const [lang, setLang] = useState<'en' | 'zh'>('en');
    const [opacity, setOpacity] = useState(1);

    useEffect(() => {
        const interval = setInterval(() => {
            // Start fade out
            setOpacity(0);
            setTimeout(() => {
                // Switch language and fade back in
                setLang((prev) => (prev === 'en' ? 'zh' : 'en'));
                setOpacity(1);
            }, 300);
        }, 5000);

        return () => clearInterval(interval);
    }, []);

    const title = lang === 'en' ? 'Outstanding Work!' : '太棒了！';
    const text = lang === 'en' 
        ? 'You achieved 100% today! Take a break and return tomorrow.'
        : '你今天已拿到了100%满分！休息一下，明天再来挑战吧。';
    const buttonText = lang === 'en' ? 'Got it!' : '我知道了';

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.45)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            animation: 'fadeIn 0.2s ease-out'
        }} onClick={onClose}>
            <div style={{
                background: '#ffffff',
                borderRadius: '24px',
                padding: '36px 30px 30px 30px',
                width: '90%',
                maxWidth: '400px',
                textAlign: 'center',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                transform: 'scale(1)',
                transition: 'transform 0.2s ease-out',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center'
            }} onClick={(e) => e.stopPropagation()}>
                <div style={{
                    fontSize: '4.5rem',
                    marginBottom: '20px',
                    lineHeight: 1,
                    animation: 'bounce 2s infinite'
                }}>🏆</div>
                
                <div style={{
                    minHeight: '120px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    width: '100%'
                }}>
                    <h3 style={{
                        fontSize: '1.5rem',
                        color: '#1e293b',
                        fontWeight: '800',
                        margin: '0 0 12px 0',
                        opacity: opacity,
                        transition: 'opacity 0.3s ease-in-out',
                        fontFamily: 'Outfit, Inter, sans-serif'
                    }}>
                        {title}
                    </h3>
                    <p style={{
                        fontSize: '1.05rem',
                        color: '#64748b',
                        lineHeight: '1.5',
                        margin: 0,
                        opacity: opacity,
                        transition: 'opacity 0.3s ease-in-out',
                        fontFamily: 'Inter, sans-serif'
                    }}>
                        {text}
                    </p>
                </div>

                <button 
                    onClick={onClose}
                    style={{
                        marginTop: '24px',
                        background: '#3b82f6',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '16px',
                        padding: '12px 32px',
                        fontSize: '1rem',
                        fontWeight: '700',
                        cursor: 'pointer',
                        boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.3)',
                        transition: 'all 0.2s ease',
                        width: '100%',
                        maxWidth: '200px',
                        outline: 'none',
                        fontFamily: 'Outfit, Inter, sans-serif'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.background = '#2563eb';
                        e.currentTarget.style.transform = 'translateY(-1px)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.background = '#3b82f6';
                        e.currentTarget.style.transform = 'none';
                    }}
                >
                    {buttonText}
                </button>
            </div>
            
            <style>{`
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                @keyframes bounce {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-8px); }
                }
            `}</style>
        </div>
    );
}
