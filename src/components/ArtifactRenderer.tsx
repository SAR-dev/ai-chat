import {
  LineChart,
  BarChart,
  PieChart,
  AreaChart,
  ScatterChart,
  Line,
  Bar,
  Pie,
  Area,
  Scatter,
  Sector,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { ArtifactData } from '@/types'
import { useTheme } from './use-theme'

const PALETTE = [
  '#3B82F6',
  '#EF4444',
  '#10B981',
  '#F59E0B',
  '#8B5CF6',
  '#EC4899',
  '#06B6D4',
  '#F97316',
  '#84CC16',
  '#A855F7',
  '#14B8A6',
  '#E11D48',
]

function hashCode(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) return '59, 130, 246'
  return `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
}

function KpiCard({ kpi }: { kpi: NonNullable<ArtifactData['kpis']>[number] }) {
  const trendColor =
    kpi.trend == 'up'
      ? 'text-green-600'
      : kpi.trend == 'down'
        ? 'text-red-600'
        : 'text-muted-foreground'
  const trendIcon = kpi.trend == 'up' ? '↑' : kpi.trend == 'down' ? '↓' : '→'

  return (
    <div className="border-border bg-card rounded-xl border p-4">
      <p className="text-muted-foreground text-xs">{kpi.label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight">
        {kpi.value}
        {kpi.unit && <span className="text-muted-foreground ml-1 text-sm">{kpi.unit}</span>}
      </p>
      {kpi.change && (
        <p className={`mt-1 text-xs ${trendColor}`}>
          {trendIcon} {kpi.change}
        </p>
      )}
    </div>
  )
}

function TableView({ artifact }: { artifact: ArtifactData }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            {artifact.data?.[0] &&
              Object.keys(artifact.data[0]).map((col) => (
                <th
                  key={col}
                  className="border-border bg-muted label-mono border px-3 py-2 text-left"
                >
                  {col}
                </th>
              ))}
          </tr>
        </thead>
        <tbody>
          {artifact.data?.map((row, i) => (
            <tr key={i}>
              {Object.values(row).map((val, j) => (
                <td key={j} className="border-border border px-3 py-2">
                  {String(val)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ChartView({ artifact }: { artifact: ArtifactData }) {
  const { theme } = useTheme()
  const chartType = artifact.chart_type ?? 'bar'
  const data = artifact.data ?? []
  const series = artifact.series ?? []

  const isDark =
    theme === 'dark' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  const gridColor = isDark ? '#374151' : '#e5e7eb'

  if (data.length == 0) return null

  function colorForKey(key: string): string {
    const found = series.find((s) => s.key === key)
    if (found?.color) return found.color
    return PALETTE[hashCode(key) % PALETTE.length]
  }

  const dataKeys =
    series.length > 0 ? series.map((s) => s.key) : Object.keys(data[0]).filter((k) => k !== 'name')

  const renderCharts = () => {
    switch (chartType) {
      case 'line':
      case 'forecast': {
        const isForecast = chartType == 'forecast'
        return (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            {dataKeys.map((key) => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={colorForKey(key)}
                strokeWidth={2}
                strokeDasharray={
                  isForecast && key == dataKeys[dataKeys.length - 1] ? '5 5' : undefined
                }
                dot={false}
              />
            ))}
          </LineChart>
        )
      }
      case 'bar':
        return (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            {dataKeys.map((key) => (
              <Bar key={key} dataKey={key} fill={colorForKey(key)} radius={[4, 4, 0, 0]} />
            ))}
          </BarChart>
        )
      case 'pie':
        return (
          <PieChart>
            <Tooltip />
            <Pie
              data={data}
              dataKey={dataKeys[0] ?? 'value'}
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={80}
              label
              shape={(props: { payload?: { name?: string } }) => (
                <Sector {...props} fill={colorForKey(String(props.payload?.name ?? ''))} />
              )}
            />
          </PieChart>
        )
      case 'area':
        return (
          <AreaChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            {dataKeys.map((key) => (
              <Area
                key={key}
                type="monotone"
                dataKey={key}
                stroke={colorForKey(key)}
                fill={colorForKey(key)}
                fillOpacity={0.1}
                strokeWidth={2}
              />
            ))}
          </AreaChart>
        )
      case 'scatter':
        return (
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            {dataKeys.map((key) => (
              <Scatter key={key} dataKey={key} fill={colorForKey(key)} data={data} />
            ))}
          </ScatterChart>
        )
      case 'heatmap':
        return (
          <div
            className="grid gap-px"
            style={{ gridTemplateColumns: `repeat(${data.length}, 1fr)` }}
          >
            {data.map((row, i) => {
              const val = Number(row[dataKeys[0] ?? 'value']) || 0
              const opacity = Math.min(val / 100, 1)
              return (
                <div
                  key={i}
                  className="flex items-center justify-center p-2 text-xs font-medium"
                  style={{
                    backgroundColor: `rgba(${hexToRgb(colorForKey(dataKeys[0] ?? 'value'))}, ${opacity})`,
                  }}
                  title={`${row.name}: ${val}`}
                >
                  {row.name}
                </div>
              )
            })}
          </div>
        )
      default:
        return <p className="text-muted-foreground text-sm">Unknown chart type: {chartType}</p>
    }
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      {renderCharts()}
    </ResponsiveContainer>
  )
}

export default function ArtifactRenderer({ artifact }: { artifact: ArtifactData }) {
  const artifactType = artifact.artifact_type

  if (artifactType == 'kpi_card' && artifact.kpis) {
    return (
      <div
        className="my-3 grid gap-3"
        style={{ gridTemplateColumns: `repeat(auto-fill, minmax(180px, 1fr))` }}
      >
        {artifact.kpis.map((kpi, i) => (
          <KpiCard key={i} kpi={kpi} />
        ))}
      </div>
    )
  }

  if (artifactType == 'table') {
    return (
      <div className="border-border bg-card my-3 rounded-xl border p-3">
        {artifact.title && <p className="mb-2 text-sm font-medium">{artifact.title}</p>}
        <TableView artifact={artifact} />
      </div>
    )
  }

  if (artifactType == 'chart') {
    return (
      <div className="border-border bg-card my-3 rounded-xl border p-3">
        {artifact.title && <p className="mb-2 text-sm font-medium">{artifact.title}</p>}
        {artifact.subtitle && (
          <p className="text-muted-foreground -mt-1 mb-2 text-xs">{artifact.subtitle}</p>
        )}
        <ChartView artifact={artifact} />
      </div>
    )
  }

  return (
    <div className="border-border bg-card my-3 rounded-xl border p-3">
      <p className="text-sm font-medium">{artifact.title ?? 'Artifact'}</p>
    </div>
  )
}
