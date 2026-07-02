import React from 'react'
import { Link } from 'react-router-dom'

interface ShellHeaderProps {
    title: string
    level: string
    textbook?: string
    unit?: string
    prefix: string
}

export const ShellHeader: React.FC<ShellHeaderProps> = ({
    title,
    level,
    textbook,
    unit,
    prefix
}) => {
    const formattedLevel = level ? level.replace(/\s*\/\s*/g, ' - ') : ''

    return (
        <header className={`${prefix}-header`}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', height: 40 }}>
                <Link
                    to="/dashboard"
                    state={{ textbook, unit }}
                    style={{ position: 'absolute', left: 0, fontSize: '1.5rem', textDecoration: 'none' }}
                >
                    🏠
                </Link>
                <h1>{title}</h1>
            </div>
            <h2 style={{ marginTop: 15 }}>{formattedLevel}</h2>
        </header>
    )
}
