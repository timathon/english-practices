import React, { useState } from 'react'

interface CompleteScreenActionsProps {
    remainingTrials: number
    onBack: () => void
    onTryAgain: (overrideInvisible?: boolean) => void
    prefix: string
    isLockedToday: boolean
    invisibleMode: boolean
}

export const CompleteScreenActions: React.FC<CompleteScreenActionsProps> = ({
    remainingTrials,
    onBack,
    onTryAgain,
    prefix,
    isLockedToday,
    invisibleMode
}) => {
    const [showModeModal, setShowModeModal] = useState(false)
    const isDisableTryAgain = remainingTrials <= 0 || isLockedToday;

    const handleTryAgainClick = () => {
        if (invisibleMode) {
            setShowModeModal(true)
        } else {
            onTryAgain()
        }
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', maxWidth: '300px', margin: '0 auto' }}>
            <button
                className={`${prefix}-check-btn`}
                style={{
                    backgroundColor: isLockedToday ? '#10b981' : isDisableTryAgain ? '#cbd5e1' : undefined,
                    borderBottomColor: isLockedToday ? '#059669' : isDisableTryAgain ? '#94a3b8' : undefined,
                    cursor: isDisableTryAgain ? 'not-allowed' : 'pointer',
                    height: 'auto',
                    paddingTop: '10px',
                    paddingBottom: '10px',
                    lineHeight: '1.3',
                    color: isLockedToday ? '#fff' : undefined
                }}
                disabled={isDisableTryAgain}
                onClick={handleTryAgainClick}
            >
                {isLockedToday ? (
                    <div>LOCKED 🔒</div>
                ) : (
                    <>
                        <div>Try Again</div>
                        <div style={{ fontSize: '0.8em', opacity: 0.85, marginTop: '2px', fontWeight: 500 }}>
                            ({remainingTrials} attempts left)
                        </div>
                    </>
                )}
            </button>
            <button
                className={`${prefix}-check-btn`}
                onClick={onBack}
                style={{
                    background: '#f1f5f9',
                    color: '#475569',
                    borderBottomColor: '#cbd5e1'
                }}
            >
                Back to Challenges
            </button>

            {showModeModal && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: 'rgba(0,0,0,0.5)',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        zIndex: 9999
                    }}
                    onClick={() => setShowModeModal(false)}
                >
                    <div
                        style={{
                            background: '#fff',
                            borderRadius: '24px',
                            padding: '30px 24px',
                            width: '90%',
                            maxWidth: '360px',
                            textAlign: 'center',
                            boxShadow: '0 10px 25px rgba(0,0,0,0.15)'
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        <h3 style={{ margin: '0 0 10px 0', fontSize: '1.3rem', fontWeight: 'bold', color: '#1e293b' }}>
                            Select Mode
                        </h3>
                        <p style={{ margin: '0 0 25px 0', fontSize: '0.9rem', color: '#64748b', lineHeight: '1.4' }}>
                            Choose how you want to retry this challenge:
                        </p>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <button
                                className={`${prefix}-check-btn`}
                                style={{
                                    backgroundColor: '#64748b',
                                    borderBottomColor: '#475569',
                                    color: '#fff',
                                    padding: '12px 20px',
                                    fontSize: '1rem',
                                    borderRadius: '16px'
                                }}
                                onClick={() => {
                                    setShowModeModal(false)
                                    onTryAgain(true)
                                }}
                            >
                                👻 Invisible Mode
                                <span style={{ display: 'block', fontSize: '0.75rem', opacity: 0.9, marginTop: '2px', fontWeight: 'normal' }}>
                                    (No timer, rewards, or records)
                                </span>
                            </button>

                            <button
                                className={`${prefix}-check-btn`}
                                style={{
                                    padding: '12px 20px',
                                    fontSize: '1rem',
                                    borderRadius: '16px'
                                }}
                                onClick={() => {
                                    setShowModeModal(false)
                                    onTryAgain(false)
                                }}
                            >
                                ⚡ Challenge Mode
                                <span style={{ display: 'block', fontSize: '0.75rem', opacity: 0.9, marginTop: '2px', fontWeight: 'normal' }}>
                                    (saves stats)
                                </span>
                            </button>

                            <button
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: '#94a3b8',
                                    fontSize: '0.9rem',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    marginTop: '8px'
                                }}
                                onClick={() => setShowModeModal(false)}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
