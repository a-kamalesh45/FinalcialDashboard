import React, { useState, useEffect } from 'react';
import type { ReactElement } from 'react';
import axios from 'axios';
import {
  Line,
  AreaChart,
  Area,
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import CustomDropdown from './Components/Dropdown';
import './App.css';

// --- DEPLOYMENT CHANGE #1: Define the API URL from an environment variable ---
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

interface ChartData {
  year: string;
  value: number;
}

const COMPANIES: Record<string, string> = {
  INFY: 'Infosys',
  TCS: 'Tata Consultancy Services',
  HCLTECH: 'HCL Technologies',
  WIPRO: 'Wipro',
  TECHM: 'Tech Mahindra',
};

const METRICS = ['SALES', 'EBITDA', 'PAT'];

const METRIC_INFO: Record<string, string> = {
  SALES: "Total revenue from operations.",
  EBITDA: "Earnings before interest, taxes, depreciation, and amortization.",
  PAT: "Profit after tax — net income after expenses and taxes.",
};

const compactNumber = (n: number) => {
  if (!isFinite(n)) return String(n);
  const abs = Math.abs(n);
  if (abs >= 1e9) return `${(n / 1e9).toFixed(2).replace(/\.00$/, '')}B`;
  if (abs >= 1e6) return `${(n / 1e6).toFixed(2).replace(/\.00$/, '')}M`;
  if (abs >= 1e3) return `${(n / 1e3).toFixed(1).replace(/\.0$/, '')}K`;
  return `${n}`;
};

const IconCompany = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none">
    <path d="M12 2H6C3.5 2 3 2.5 3 5V22H15V5C15 2.5 14.5 2 12 2Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
    <path d="M18 8H15V22H21V11C21 8.5 20.5 8 18 8Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
    <path d="M8 6H10M8 9H10M8 12H10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M11.5 22V18C11.5 17 11.5 16.6 11.2 16.3C10.9 16 10.4 16 9.5 16H8.5C7.6 16 7.1 16 6.8 16.3C6.5 16.6 6.5 17 6.5 18V22" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
  </svg>
);

const IconMetric = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none">
    <path d="M4 5H5c2 0 3 0 3.7.5.7.5 1.1 1.4 1.9 3.1l2.9 6.7c.8 1.8 1.2 2.7 2 3.2.7.5 1.7.5 3.6.5H20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M14 5H20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

const IconChart = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none">
    <path d="M21 21H10C6.7 21 5.1 21 4 20c-1-1-1-2.7-1-6V3" stroke="#141B34" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M7 4H8M7 7H11" stroke="#141B34" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M5 20c1-2 2.5-7 5.3-7 2 0 2.5 2.5 4.4 2.5C18 15.5 17.4 10 21 10" stroke="#141B34" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconMoreInfo = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none">
    <circle cx="12" cy="12" r="10" stroke="#141B34" strokeWidth="1.5"/>
    <path d="M12 16V11.5M12 8V8.01" stroke="#141B34" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

const CustomTooltip = ({ active, payload, label, data }: any) => {
  if (!active || !payload || !payload.length) return null;
  const currentValue = payload[0].value;
  const yearIndex = data.findIndex((d: ChartData) => d.year === label);
  const prevValue = yearIndex > 0 ? data[yearIndex - 1].value : null;

  const change =
    prevValue !== null && prevValue !== 0
      ? ((currentValue - prevValue) / prevValue) * 100
      : null;

  return (
    <div className="tooltip-card">
      <div className="tooltip-year">{label}</div>
      <div className="tooltip-value">{currentValue.toLocaleString()}</div>
      {change !== null ? (
        <div className={`tooltip-change ${change >= 0 ? 'positive' : 'negative'}`}>
          {change >= 0 ? '▲' : '▼'} {Math.abs(change).toFixed(2)}%
        </div>
      ) : (
        <div className="tooltip-change neutral">No change</div>
      )}
    </div>
  );
};

const App: React.FC = () => {
  const [selectedCompany, setSelectedCompany] = useState<string>('INFY');
  const [selectedMetric, setSelectedMetric] = useState<string>('SALES');
  const [chartType, setChartType] = useState<'area' | 'composed'>('area');
  const [chartData, setChartData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mountedState, setMountedState] = useState(0);

  useEffect(() => {
    setMountedState((s) => s + 1);
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      setChartData([]);
      try {
        // --- DEPLOYMENT CHANGE #2: Use the API_BASE_URL variable for the request ---
        const response = await axios.get<ChartData[]>(`${API_BASE_URL}/api/data`, {
          params: { company: selectedCompany, metric: selectedMetric },
        });
        const cleaned = response.data.filter((d) => d.value !== 0);
        setChartData(cleaned);
      } catch (err: any) {
        setError(err?.response?.data?.error || 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };
    if (selectedCompany && selectedMetric) fetchData();
  }, [selectedCompany, selectedMetric]);

  const renderChart: () => ReactElement = () => {
    if (chartData.length === 0) return <></>;

    if (chartType === 'area') {
      return (
        <AreaChart
          data={chartData}
          margin={{ top: 18, right: 12, left: -20, bottom: 12 }}
        >
          <defs>
            <linearGradient id="areaGradientBlue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.3} />
              <stop offset="80%" stopColor="#3B82F6" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="lineGradientBlue" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#2563EB" />
              <stop offset="100%" stopColor="#3B82F6" />
            </linearGradient>
            <filter id="glowFilterBlue" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          <CartesianGrid stroke="#E5E7EB" strokeDasharray="3 3" />
          <XAxis dataKey="year" stroke="#6B7280" tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 12, fill: '#475569' }} tickFormatter={(v) => compactNumber(Number(v))} />
          <Tooltip content={<CustomTooltip data={chartData} />} />
          <Area type="monotone" dataKey="value" stroke="url(#lineGradientBlue)" strokeWidth={3} fill="url(#areaGradientBlue)" activeDot={{ r: 6, stroke: '#fff', strokeWidth: 3 }} />
          <Line type="monotone" dataKey="value" stroke="#3B82F6" strokeWidth={8} opacity={0.12} dot={false} filter="url(#glowFilterBlue)" />
        </AreaChart>
      );
    }

    return (
      <ComposedChart
        data={chartData}
        margin={{ top: 18, right: 12, left: -20, bottom: 12 }}
      >
        <defs>
          <linearGradient id="barGradientBlue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.5} />
            <stop offset="100%" stopColor="#3B82F6" stopOpacity={0.2} />
          </linearGradient>
          <linearGradient id="lineGradientBlue" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#1E40AF" />
            <stop offset="100%" stopColor="#2563EB" />
          </linearGradient>
          <filter id="glowFilterBlue" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <CartesianGrid stroke="#E5E7EB" strokeDasharray="3 3" />
        <XAxis dataKey="year" stroke="#6B7280" tickLine={false} axisLine={false} />
        <YAxis stroke="#6B7280" tickFormatter={(v) => compactNumber(Number(v))} tickLine={false} axisLine={false} width={80} />
        <Tooltip content={<CustomTooltip data={chartData} />} />
        <Bar dataKey="value" barSize={26} fill="url(#barGradientBlue)" radius={[6, 6, 0, 0]} />
        <Line type="monotone" dataKey="value" stroke="url(#lineGradientBlue)" strokeWidth={3} dot={false} filter="url(#glowFilterBlue)" />
      </ComposedChart>
    );
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="title-block">
          <div className="logo-mark">KA</div>
          <div>
            <h1>Keen Analytics</h1>
            <p className="subtitle">sales • ebitda • pat — visualized</p>
          </div>
        </div>
      </header>

      <main className="dashboard-content">
        <div className="mobile-filters">
          <CustomDropdown
            options={Object.entries(COMPANIES).map(([ticker, name]) => ({
              value: ticker,
              label: name,
            }))}
            value={selectedCompany}
            onChange={setSelectedCompany}
            placeholder="Select company"
          />
          <CustomDropdown
            options={METRICS.map((m) => ({ value: m, label: m }))}
            value={selectedMetric}
            onChange={setSelectedMetric}
            placeholder="Select metric"
          />
          <CustomDropdown
            options={[
              { value: 'area', label: 'Area' },
              { value: 'composed', label: 'Composed' },
            ]}
            value={chartType}
            onChange={setChartType}
          />
        </div>

        <aside className="sidebar">
          <div className="sidebar-section">
            <div className="sidebar-label">
              <IconCompany /> <span>Company</span>
            </div>
            <div className="button-list">
              {Object.entries(COMPANIES).map(([ticker, name]) => (
                <button key={ticker} className={`company-btn ${selectedCompany === ticker ? 'active' : ''}`} onClick={() => setSelectedCompany(ticker)}>
                  <span className="company-avatar">{ticker.slice(0, 2)}</span>
                  <span className={`company-name ${selectedCompany === ticker ? 'active' : ''}`}>{name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="sidebar-section">
            <div className="sidebar-label">
              <IconMetric /> <span>Metric</span>
            </div>
            <div className="button-list">
              {METRICS.map((m) => (
                <button key={m} className={`metric-btn ${selectedMetric === m ? 'active' : ''}`} onClick={() => setSelectedMetric(m)}>
                  {m}
                  <span title={METRIC_INFO[m]}>
                    <IconMoreInfo />
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="sidebar-section">
            <div className="sidebar-label">
              <IconChart /> <span>Chart Type</span>
            </div>
            <div className="chart-toggle">
              <button onClick={() => setChartType('area')} className={`toggle ${chartType === 'area' ? 'on' : ''}`}>Area</button>
              <button onClick={() => setChartType('composed')} className={`toggle ${chartType === 'composed' ? 'on' : ''}`}>Composed</button>
            </div>
          </div>
        </aside>

        <section className={`chart-area card ${mountedState}`} key={mountedState}>
          <div className="chart-header">
            <div className="header-left">
              <div className="company-logo-placeholder">{selectedCompany?.slice(0, 2) || '—'}</div>
              <div className="header-title">
                <div className="company-name-header">{COMPANIES[selectedCompany] || 'No company selected'}</div>
                <div className="metric-sub">{selectedMetric || 'Choose a metric'}</div>
              </div>
            </div>
          </div>

          <div className="chart-body">
            {loading && (
              <div className="loading-state">
                <div className="spinner"></div>
                <div>Loading data…</div>
              </div>
            )}
            {error && <div className="status error">{error}</div>}
            {!loading && !error && chartData.length > 0 && (
              <ResponsiveContainer width="100%" height="95%" minHeight={380}>
                {renderChart()}
              </ResponsiveContainer>
            )}
            {!loading && !error && chartData.length === 0 && (
              <div className="placeholder">Please select a company and a metric to view the chart.</div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
};

export default App;