import React from 'react'

interface FooterActionProps {
    locked: boolean
    disableCheck: boolean
    continueDisabled?: boolean
    onCheck: () => void
    onContinue: () => void
    buttonText: string
    prefix: string
}

export const FooterAction: React.FC<FooterActionProps> = ({
    locked,
    disableCheck,
    continueDisabled,
    onCheck,
    onContinue,
    buttonText,
    prefix
}) => {
    return (
        <div className={`${prefix}-footer-action`}>
            {!locked ? (
                <button
                    className={`${prefix}-check-btn`}
                    disabled={disableCheck}
                    onClick={onCheck}
                >
                    Check
                </button>
            ) : (
                <button
                    className={`${prefix}-check-btn continue`}
                    onClick={onContinue}
                    disabled={continueDisabled}
                >
                    {buttonText}
                </button>
            )}
        </div>
    )
}
