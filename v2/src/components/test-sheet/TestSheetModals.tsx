import { useNavigate } from 'react-router-dom'
import { getOrdinal } from './testSheetUtils'

interface StartModalProps {
  remainingAttempts: number
  isAdmin: boolean
  onStart: () => void
  onResetAttempts: () => void
}

export function StartModal({ remainingAttempts, isAdmin, onStart, onResetAttempts }: StartModalProps) {
  const navigate = useNavigate()

  return (
    <div className="ts-modal-overlay">
      <div className="ts-modal-card">
        <h2 className="ts-modal-title">Ready to Begin?</h2>
        {remainingAttempts > 0 ? (
          <>
            <p className="ts-modal-text">
              This is your <strong>{getOrdinal(6 - remainingAttempts)}</strong> attempt today. You have a maximum of <strong>5</strong> attempts daily.
            </p>
            <p className="ts-modal-subtext">Are you ready to start the test?</p>
            <div className="ts-modal-buttons">
              <button className="ts-modal-btn yes" onClick={onStart}>Yes, start!</button>
              <button className="ts-modal-btn no" onClick={() => navigate('/dashboard')}>No, go back</button>
            </div>
          </>
        ) : (
          <>
            <p className="ts-modal-text">
              You have <strong>no attempts</strong> left today. Please come back tomorrow!
            </p>
            <div className="ts-modal-buttons">
              <button className="ts-modal-btn back" onClick={() => navigate('/dashboard')}>Back to Dashboard</button>
              {isAdmin && (
                <button
                  className="ts-modal-btn yes"
                  style={{ backgroundColor: '#10b981', color: '#fff' }}
                  onClick={onResetAttempts}
                >
                  Reset Attempts (Admin)
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

interface ConfirmSubmitModalProps {
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmSubmitModal({ onConfirm, onCancel }: ConfirmSubmitModalProps) {
  return (
    <div className="ts-modal-overlay">
      <div className="ts-modal-card">
        <h2 className="ts-modal-title">Confirm Submission</h2>
        <p className="ts-modal-text">
          Scores of 70 to 89 earn 1 coin; scores of 90 and above earn 2 coins.
        </p>
        <p className="ts-modal-subtext">Proceed to check?</p>
        <div className="ts-modal-buttons">
          <button className="ts-modal-btn yes" onClick={onConfirm}>Yes</button>
          <button className="ts-modal-btn no" onClick={onCancel}>No</button>
        </div>
      </div>
    </div>
  )
}

interface ConfirmStopAudioModalProps {
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmStopAudioModal({ onConfirm, onCancel }: ConfirmStopAudioModalProps) {
  return (
    <div className="ts-modal-overlay">
      <div className="ts-modal-card">
        <h2 className="ts-modal-title">Stop Listening Audio?</h2>
        <p className="ts-modal-text" style={{ color: '#ef4444', fontWeight: 600 }}>
          Warning: There will be 0 replays left once stopped.
        </p>
        <p className="ts-modal-subtext">
          You will not be able to play this audio again. Are you sure you want to stop?
        </p>
        <div className="ts-modal-buttons">
          <button className="ts-modal-btn yes" style={{ backgroundColor: '#ef4444', color: '#fff' }} onClick={onConfirm}>
            Yes, stop audio
          </button>
          <button className="ts-modal-btn no" onClick={onCancel}>
            Keep playing
          </button>
        </div>
      </div>
    </div>
  )
}
