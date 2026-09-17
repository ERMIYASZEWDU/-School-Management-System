import React from 'react'
import { useTranslation } from 'react-i18next'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer
} from 'recharts'

// Shared grade series: one recharts Line per subject, x = date, y = score %.
const SUBJECT_COLORS = ['#2563eb', '#16a34a', '#9333ea', '#ea580c', '#dc2626', '#0891b2', '#65a30d', '#db2777']

const pct = (g) => {
  const score = g.score ?? g.marksObtained ?? 0
  const max = g.maxScore ?? g.totalMarks ?? 100
  return max > 0 ? Number(((score / max) * 100).toFixed(1)) : 0
}

const shortDate = (d) => {
  const date = new Date(d)
  return `${date.getMonth() + 1}/${date.getDate()}`
}

export const buildGradeTrendData = (grades) => {
  const bySubject = new Map()
  for (const g of grades) {
    const subject = g.subject || '—'
    if (!bySubject.has(subject)) bySubject.set(subject, [])
    bySubject.get(subject).push(g)
  }

  // Merged timeline: every grade date is an x point; subjects missing that
  // date get null so recharts breaks the line instead of drawing a slope.
  const dates = [...new Set(grades.map(g => new Date(g.date ?? g.createdAt ?? 0).getTime()))]
    .sort((a, b) => a - b)
  return dates.map(ts => {
    const row = { ts }
    for (const [subject, list] of bySubject) {
      const hit = list.find(g => new Date(g.date ?? g.createdAt ?? 0).getTime() === ts)
      row[subject] = hit ? pct(hit) : null
    }
    return row
  })
}

export const GradeTrendChart = ({ grades }) => {
  const { t } = useTranslation()

  if (!grades || grades.length === 0) return null

  const data = buildGradeTrendData(grades)
  const subjects = [...new Set(grades.map(g => g.subject || '—'))]

  return (
    <div
      className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-800 p-6 mb-6"
      data-testid="grade-trend-chart"
    >
      <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 mb-4">
        {t('studentLabels.gradeTrendTitle', 'Grade Trend')}
      </h2>
      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 16, bottom: 5, left: -16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#9ca3af33" />
            <XAxis
              dataKey="ts"
              type="number"
              scale="time"
              domain={['dataMin', 'dataMax']}
              tickFormatter={shortDate}
              tick={{ fontSize: 12, fill: '#6b7280' }}
              stroke="#9ca3af66"
            />
            <YAxis
              domain={[0, 100]}
              tickFormatter={(v) => `${v}%`}
              tick={{ fontSize: 12, fill: '#6b7280' }}
              stroke="#9ca3af66"
            />
            <Tooltip
              labelFormatter={shortDate}
              formatter={(value, name) => [`${value}%`, name]}
              contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb' }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {subjects.map((subject, i) => (
              <Line
                key={subject}
                type="monotone"
                dataKey={subject}
                stroke={SUBJECT_COLORS[i % SUBJECT_COLORS.length]}
                strokeWidth={2}
                dot={{ r: 3 }}
                connectNulls={false}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
        {t('studentLabels.gradeTrendScore', 'Score %')}
      </p>
    </div>
  )
}
