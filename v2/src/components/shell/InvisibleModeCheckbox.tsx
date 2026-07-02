import React from 'react'

interface InvisibleModeCheckboxProps {
    checked: boolean
    onChange: (val: boolean) => void
}

export const InvisibleModeCheckbox: React.FC<InvisibleModeCheckboxProps> = ({
    checked,
    onChange
}) => {
    return (
        <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            gap: '10px', 
            marginBottom: '20px',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '12px',
            padding: '8px 16px',
            width: 'fit-content',
            margin: '0 auto 20px auto'
        }}>
            <label style={{ 
                fontSize: '0.95rem', 
                color: '#475569', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px', 
                cursor: 'pointer',
                fontWeight: 500
            }}>
                <input 
                    type="checkbox" 
                    checked={checked} 
                    onChange={(e) => onChange(e.target.checked)}
                    style={{ 
                        width: '16px', 
                        height: '16px', 
                        accentColor: 'var(--primary)',
                        cursor: 'pointer'
                    }}
                />
                <span>👻 Invisible Mode (No timer, no rewards/records)</span>
            </label>
        </div>
    )
}
