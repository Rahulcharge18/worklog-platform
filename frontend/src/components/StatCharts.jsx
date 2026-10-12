import React from 'react';

// Helper to draw SVG Pie / Doughnut slice path
function getCoordinatesForPercent(percent) {
  const x = Math.cos(2 * Math.PI * percent);
  const y = Math.sin(2 * Math.PI * percent);
  return [x, y];
}

function DoughnutChart({ data, total, colors, title, centerSubtext }) {
  if (!total || total === 0 || !data || data.length === 0) {
    return (
      <div className="chart-card glass-panel animate-slide-up" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', height: '100%' }}>
        <h3 className="card-title" style={{ marginBottom: '1.5rem' }}>{title}</h3>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontStyle: 'italic', minHeight: '220px' }}>
          No worklog activity recorded for this period.
        </div>
      </div>
    );
  }

  let cumulativePercent = 0;
  const slices = data.map(([label, value], index) => {
    const percent = value / total;
    const startPercent = cumulativePercent;
    cumulativePercent += percent;
    const endPercent = cumulativePercent;

    const [startX, startY] = getCoordinatesForPercent(startPercent);
    const [endX, endY] = getCoordinatesForPercent(endPercent);

    const largeArcFlag = percent > 0.5 ? 1 : 0;
    // SVG coordinates around center (0,0) with radius 1
    const pathData = percent === 1
      ? `M 1 0 A 1 1 0 1 1 -1 0 A 1 1 0 1 1 1 0`
      : [
          `M ${startX} ${startY}`,
          `A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY}`,
          `L 0 0`,
        ].join(' ');

    const color = colors[index % colors.length];
    const percentage = Math.round(percent * 100);
    return { label, value, percentage, pathData, color };
  });

  return (
    <div className="chart-card glass-panel animate-slide-up" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', height: '100%' }}>
      <h3 className="card-title" style={{ marginBottom: '1.5rem' }}>{title}</h3>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(180px, 1fr) 1.2fr', gap: '1.5rem', alignItems: 'center', flex: 1 }}>
        {/* SVG Doughnut */}
        <div style={{ position: 'relative', width: '160px', height: '160px', margin: '0 auto' }}>
          <svg viewBox="-1 -1 2 2" style={{ transform: 'rotate(-90deg)', width: '100%', height: '100%', overflow: 'visible' }}>
            {slices.map((slice, i) => (
              <path
                key={i}
                d={slice.pathData}
                fill={slice.color}
                style={{ transition: 'all 0.3s ease', cursor: 'pointer' }}
                title={`${slice.label}: ${slice.value}h (${slice.percentage}%)`}
              />
            ))}
            {/* Inner cutout to make it a Doughnut */}
            <circle cx="0" cy="0" r="0.65" fill="#0c0f22" />
          </svg>
          {/* Center text */}
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            pointerEvents: 'none'
          }}>
            <div style={{ fontSize: '1.35rem', fontWeight: '700', color: 'var(--text-primary)', lineHeight: 1.1 }}>
              {total}h
            </div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {centerSubtext || 'TOTAL'}
            </div>
          </div>
        </div>

        {/* Custom Legend */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', maxHeight: '200px', overflowY: 'auto' }}>
          {slices.map((slice, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', overflow: 'hidden' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '3px', background: slice.color, flexShrink: 0 }}></span>
                <span style={{ color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {slice.label}
                </span>
              </div>
              <div style={{ fontWeight: '600', color: 'var(--text-secondary)', flexShrink: 0 }}>
                {slice.value}h ({slice.percentage}%)
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function StatCharts({ stats }) {
  if (!stats) return <div className="flex-center" style={{ padding: '2rem 0' }}>Loading analytics charts...</div>;

  const activities = stats.activities || {};
  const sortedActivities = Object.entries(activities).sort((a, b) => b[1] - a[1]);
  const totalHours = stats.totalHours || 0;

  // Colors palette for doughnut chart
  const activityColors = [
    '#6366f1', '#14b8a6', '#f59e0b', '#ec4899', '#8b5cf6',
    '#3b82f6', '#10b981', '#ef4444', '#06b6d4', '#f97316'
  ];

  // Jira vs Excel breakdown data
  const jiraHours = stats.jiraHours || 0;
  const excelHours = stats.adhocExcelHours || 0;
  const categoryData = [
    ['Jira Tracked', jiraHours],
    ['Excel Tracked', excelHours]
  ].filter(item => item[1] > 0);

  const categoryColors = ['#6366f1', '#14b8a6'];

  return (
    <div className="charts-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
      {/* Activity Classification Doughnut */}
      <DoughnutChart
        title="Activity Breakdown (Hours)"
        data={sortedActivities}
        total={totalHours}
        colors={activityColors}
        centerSubtext="ACTIVITY"
      />

      {/* Jira vs Excel Split Doughnut */}
      <DoughnutChart
        title="Jira vs. Excel Distribution"
        data={categoryData}
        total={totalHours}
        colors={categoryColors}
        centerSubtext="TRACKED"
      />
    </div>
  );
}
