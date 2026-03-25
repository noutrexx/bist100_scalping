import React from 'react'
import ReactDOM from 'react-dom/client'
import { ConfigProvider, theme } from 'antd'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <ConfigProvider
    theme={{
      algorithm: [theme.darkAlgorithm, theme.compactAlgorithm],
      token: {
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        fontSize: 12,
        colorBgBase: '#0a0d14',
        colorBgContainer: '#0f1420',
        colorBgElevated: '#111827',
        colorBorder: '#1e2738',
        colorText: '#c9d1d9',
        colorTextSecondary: '#6b7a99',
        colorPrimary: '#3b82f6',
        colorSuccess: '#22c55e',
        colorError: '#ef4444',
        colorWarning: '#f59e0b',
        borderRadius: 6,
        borderRadiusLG: 8,
        controlHeight: 28,
        padding: 12,
        paddingLG: 16,
      },
      components: {
        Table: {
          headerBg: '#111827',
          rowHoverBg: '#161e2e',
          borderColor: '#1a2030',
          headerSplitColor: 'transparent',
        },
        Modal: {
          contentBg: '#0f1420',
          headerBg: '#0f1420',
        },
        Card: {
          colorBgContainer: '#111827',
          paddingLG: 14,
        },
        Tabs: {
          itemColor: '#6b7a99',
          itemSelectedColor: '#3b82f6',
          inkBarColor: '#3b82f6',
        },
      },
    }}
    componentSize="small"
  >
    <App />
  </ConfigProvider>
)
