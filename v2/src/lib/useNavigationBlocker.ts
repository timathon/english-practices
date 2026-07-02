import { useEffect } from 'react'
import { useBlocker } from 'react-router-dom'

export function useNavigationBlocker(active: boolean, message = '您当前正在进行挑战，确定要离开吗？未保存的进度将会丢失。') {
    const blocker = useBlocker(
        ({ nextLocation, currentLocation }) =>
            active && nextLocation.pathname !== currentLocation.pathname
    );

    useEffect(() => {
        if (blocker.state === 'blocked') {
            const proceed = window.confirm(message);
            if (proceed) {
                blocker.proceed?.();
            } else {
                blocker.reset?.();
            }
        }
    }, [blocker, message]);

    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (active) {
                e.preventDefault();
                e.returnValue = message;
                return message;
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [active, message]);

    return blocker;
}
