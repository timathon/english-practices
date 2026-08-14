import React, { useState, useMemo } from 'react';

interface ActivityWeeklyChartProps {
  quizHistory: any[];
  activeSubjectTab: string;
  onSelectDate: (dateStr: string) => void;
  selectedDate: string;
}

export const ActivityWeeklyChart: React.FC<ActivityWeeklyChartProps> = ({
  quizHistory,
  activeSubjectTab,
  onSelectDate,
  selectedDate,
}) => {
  // weekOffset: 0 means current Monday-Sunday week, -1 means 1 week ago, etc.
  const [weekOffset, setWeekOffset] = useState<number>(0);

  // Helper to format Date to YYYY-MM-DD
  const formatYMD = (d: Date): string => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  // Helper to parse item completedAt date string into YYYY-MM-DD reliably
  const getItemYMD = (rawDate: any): string => {
    if (!rawDate) return '';
    const cleaned = String(rawDate).replace(/\//g, '-').trim();
    const firstPart = cleaned.split(' ')[0].split('T')[0];
    const parts = firstPart.split('-');
    if (parts.length === 3) {
      const y = parts[0];
      const m = parts[1].padStart(2, '0');
      const d = parts[2].padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
    return '';
  };

  // Helper to format date label for display in Chinese (e.g. "8月8日" or "8-08")
  const formatShortDate = (d: Date): string => {
    return `${d.getMonth() + 1}月${d.getDate()}日`;
  };

  // Compute Monday to Sunday (7 days) for the given weekOffset
  const days = useMemo(() => {
    const result = [];
    const today = new Date();
    
    // Find Monday of current week
    // JS getDay(): 0 is Sunday, 1 is Monday... 6 is Saturday
    const currentDayOfWeek = today.getDay();
    const daysSinceMonday = (currentDayOfWeek + 6) % 7; // Monday = 0, Tuesday = 1, ..., Sunday = 6
    
    const monday = new Date(today);
    monday.setDate(today.getDate() - daysSinceMonday + weekOffset * 7);

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      result.push(d);
    }
    return result;
  }, [weekOffset]);

  // Aggregate stats per day for the selected subject
  const dayStats = useMemo(() => {
    return days.map((dayObj) => {
      const ymd = formatYMD(dayObj);

      // Filter history items matching this date and subject
      const matchingItems = (quizHistory || []).filter((item) => {
        const title = item.poemTitle || item.title || '';
        const subject = item.subject || (title.includes('数学') ? 'math' : title.includes('英语') ? 'english' : 'chinese');
        if (subject !== activeSubjectTab) return false;

        const rawDate = item.completedAt || item.timestamp || item.createdAt || '';
        const itemYMD = getItemYMD(rawDate);
        return itemYMD === ymd;
      });

      const count = matchingItems.length;
      let avgScore = 0;
      if (count > 0) {
        const sumScore = matchingItems.reduce((sum, item) => sum + (item.score ?? 100), 0);
        avgScore = Math.round(sumScore / count);
      }

      return {
        dateObj: dayObj,
        ymd,
        label: formatShortDate(dayObj),
        count,
        avgScore,
      };
    });
  }, [days, quizHistory, activeSubjectTab]);

  // Max practice count scaling
  const maxCount = useMemo(() => {
    const counts = dayStats.map((d) => d.count);
    const maxVal = Math.max(...counts, 0);
    return Math.max(maxVal, 5); // Minimum scale of 5
  }, [dayStats]);

  // Date range title
  const dateRangeTitle = useMemo(() => {
    if (dayStats.length === 0) return '';
    const startStr = dayStats[0].label;
    const endStr = dayStats[dayStats.length - 1].label;
    return `${startStr} ~ ${endStr}`;
  }, [dayStats]);

  // SVG dimensions
  const svgWidth = 560;
  const svgHeight = 180;
  const paddingLeft = 45;
  const paddingRight = 45;
  const paddingTop = 20;
  const paddingBottom = 35;
  const chartW = svgWidth - paddingLeft - paddingRight;
  const chartH = svgHeight - paddingTop - paddingBottom;

  // Calculate coordinates for SVG line plot of Avg Score
  const points = dayStats.map((d, i) => {
    const x = paddingLeft + (i / 6) * chartW;
    const y = paddingTop + chartH - (d.avgScore / 100) * chartH;
    return { x, y, val: d.avgScore, count: d.count };
  });

  // Generate smooth cubic bezier SVG path string
  const linePath = useMemo(() => {
    if (points.length < 2) return '';
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const curr = points[i];
      const next = points[i + 1];
      const cp1x = curr.x + (next.x - curr.x) / 2;
      const cp1y = curr.y;
      const cp2x = curr.x + (next.x - curr.x) / 2;
      const cp2y = next.y;
      d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${next.x} ${next.y}`;
    }
    return d;
  }, [points]);

  // Generate gradient area path string
  const areaPath = useMemo(() => {
    if (!linePath) return '';
    const lastX = points[points.length - 1].x;
    const firstX = points[0].x;
    const bottomY = paddingTop + chartH;
    return `${linePath} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
  }, [linePath, points, paddingTop, chartH]);

  return (
    <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-lg border border-slate-800 space-y-3">
      {/* Header with Navigation Arrows */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-lg">📊</span>
          <span className="font-bold text-sm tracking-wide text-slate-100 font-serif">
            修业周报
          </span>
        </div>

        {/* Week Switcher Arrows */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setWeekOffset(weekOffset - 1)}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition flex items-center justify-center font-bold"
            title="上一周 (周一至周日)"
          >
            ‹
          </button>
          <span className="text-xs font-mono text-slate-400 min-w-[50px] text-center">
            {weekOffset === 0 ? '本周' : `${Math.abs(weekOffset)}周前`}
          </span>
          <button
            onClick={() => setWeekOffset(weekOffset + 1)}
            disabled={weekOffset >= 0}
            className={`p-1.5 rounded-lg border transition flex items-center justify-center font-bold ${
              weekOffset >= 0
                ? 'bg-slate-800/40 border-slate-800 text-slate-600 cursor-not-allowed'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border-slate-700'
            }`}
            title="下一周 (周一至周日)"
          >
            ›
          </button>
        </div>
      </div>

      {/* Main Diagram Area */}
      <div className="relative w-full overflow-x-auto">
        <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-auto max-h-52 overflow-visible">
          <defs>
            <linearGradient id="scoreAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#c084fc" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#c084fc" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Left Y-axis labels (Practices Count) */}
          <text x="10" y={paddingTop + 5} fill="#64748b" fontSize="10" fontFamily="monospace">{maxCount}</text>
          <text x="10" y={paddingTop + chartH / 2 + 3} fill="#64748b" fontSize="10" fontFamily="monospace">{Math.round(maxCount / 2)}</text>
          <text x="10" y={paddingTop + chartH + 3} fill="#64748b" fontSize="10" fontFamily="monospace">0</text>
          <text x="5" y={paddingTop + chartH / 2} fill="#64748b" fontSize="9" transform={`rotate(-90 12 ${paddingTop + chartH / 2})`} textAnchor="middle">
            练习次数 🔵
          </text>

          {/* Right Y-axis labels (Avg Score %) */}
          <text x={svgWidth - 30} y={paddingTop + 5} fill="#c084fc" fontSize="10" fontFamily="monospace">100%</text>
          <text x={svgWidth - 30} y={paddingTop + chartH / 2 + 3} fill="#c084fc" fontSize="10" fontFamily="monospace">50%</text>
          <text x={svgWidth - 30} y={paddingTop + chartH + 3} fill="#c084fc" fontSize="10" fontFamily="monospace">0%</text>
          <text x={svgWidth - 10} y={paddingTop + chartH / 2} fill="#c084fc" fontSize="9" transform={`rotate(90 ${svgWidth - 10} ${paddingTop + chartH / 2})`} textAnchor="middle">
            平均得分 🟣
          </text>

          {/* Horizontal Grid lines */}
          <line x1={paddingLeft} y1={paddingTop} x2={svgWidth - paddingRight} y2={paddingTop} stroke="#334155" strokeDasharray="3 3" strokeWidth="0.8" />
          <line x1={paddingLeft} y1={paddingTop + chartH / 2} x2={svgWidth - paddingRight} y2={paddingTop + chartH / 2} stroke="#334155" strokeDasharray="3 3" strokeWidth="0.8" />
          <line x1={paddingLeft} y1={paddingTop + chartH} x2={svgWidth - paddingRight} y2={paddingTop + chartH} stroke="#334155" strokeWidth="1" />

          {/* Gradient Area under Score Curve */}
          <path d={areaPath} fill="url(#scoreAreaGrad)" />

          {/* Smooth Score Curve */}
          <path d={linePath} fill="none" stroke="#c084fc" strokeWidth="2.5" strokeLinecap="round" />

          {/* Practice Count Bars & Interactive Date Column */}
          {dayStats.map((d, i) => {
            const barW = 12;
            const pt = points[i];
            const barH = maxCount > 0 ? (d.count / maxCount) * chartH : 0;
            const barX = pt.x - barW / 2;
            const barY = paddingTop + chartH - barH;
            const isSelected = selectedDate === d.ymd;

            return (
              <g
                key={d.ymd}
                onClick={() => onSelectDate(d.ymd)}
                className="cursor-pointer group"
              >
                {/* Column Highlight Background */}
                <rect
                  x={pt.x - (chartW / 6) / 2}
                  y={paddingTop}
                  width={chartW / 6}
                  height={chartH + paddingBottom}
                  fill={isSelected ? 'rgba(99, 102, 241, 0.18)' : 'transparent'}
                  className="group-hover:fill-indigo-500/10 transition-colors"
                />

                {/* Practice Count Bar (Blue/Sky) */}
                {d.count > 0 && (
                  <rect
                    x={barX}
                    y={barY}
                    width={barW}
                    height={barH}
                    rx="3"
                    fill={isSelected ? '#38bdf8' : '#60a5fa'}
                    className="group-hover:fill-sky-300 transition-colors"
                  >
                    <title>{`${d.label}: ${d.count} 次练习, 平均得分 ${d.avgScore}%`}</title>
                  </rect>
                )}

                {/* Score Line Node Circles */}
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isSelected ? "5.5" : "3.5"}
                  fill="#0f172a"
                  stroke="#c084fc"
                  strokeWidth={isSelected ? "3" : "2"}
                  className="group-hover:r-5 transition-all"
                />

                {/* Date Label on X-axis */}
                <text
                  x={pt.x}
                  y={paddingTop + chartH + 20}
                  fill={isSelected ? '#38bdf8' : '#94a3b8'}
                  fontSize="11"
                  fontWeight={isSelected ? 'bold' : 'normal'}
                  textAnchor="middle"
                  className="group-hover:fill-white transition-colors"
                >
                  {d.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Footer / Selected Date Summary Indicator */}
      <div className="text-xs border-t border-slate-800/80 pt-2 text-slate-400">
        {(() => {
          const selectedIdx = dayStats.findIndex(d => d.ymd === selectedDate);
          if (selectedIdx !== -1) {
            const selData = dayStats[selectedIdx];
            const dObj = selData.dateObj;
            const formattedCN = `${dObj.getFullYear()}年${dObj.getMonth() + 1}月${dObj.getDate()}日`;
            return (
              <div className="text-sky-300 font-bold text-xs flex items-center justify-start">
                <span className="flex items-center gap-1.5">
                  <span>📅</span>
                  <span>{formattedCN}，修业{selData.count}次，平均分{selData.avgScore}%</span>
                </span>
              </div>
            );
          }
          return (
            <div className="text-slate-500 text-center py-0.5">
              点击图表中的柱状或节点查看当日记录
            </div>
          );
        })()}
      </div>
    </div>
  );
};
