import React from 'react'

interface FooterActionProps {
    locked: boolean
    disableCheck: boolean
    continueDisabled?: boolean
    onCheck: () => void
    onContinue: () => void
    buttonText: string
    prefix: string
    noCheckButton?: boolean
}

export const FooterAction: React.FC<FooterActionProps> = ({
    locked,
    disableCheck,
    continueDisabled,
    onCheck,
    onContinue,
    buttonText,
    prefix,
    noCheckButton
}) => {
    return (
        <div className={`${prefix}-footer-action`}>
            {noCheckButton ? (
                <button
                    className={`${prefix}-check-btn continue`}
                    onClick={onContinue}
                    disabled={!locked || continueDisabled}
                >
                    {buttonText}
                </button>
            ) : !locked ? (
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
