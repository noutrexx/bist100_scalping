import React, { useState, useEffect, useCallback } from 'react'
import { Layout, Typography, Button, Tooltip, Space } from 'antd'
import { ReloadOutlined, RiseOutlined } from '@ant-design/icons'
import StatsBar from './components/StatsBar'
import SignalsTable from './components/SignalsTable'
import StockModal from './components/StockModal'
import LiveFeed from './components/LiveFeed'

const { Header, Content } = Layout
const { Text } = Typography

const API = ''

export default function App() {
  const [signals, setSignals] = useState([])
  const [loading, setLoading] = useState(false)
  const [lastUpdate, setLastUpdate] = useState(null)
  const [selectedSymbol, setSelectedSymbol] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalData, setModalData] = useState(null)
  const [modalLoading, setModalLoading] = useState(false)

  const loadSignals = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`${API}/api/signals`)
      const data = await res.json()
      setSignals(data.signals || [])
      setLastUpdate(new Date())
    } catch (e) {
      console.error('Sinyal yüklenemedi:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  const openStockDetail = async (symbol) => {
    setSelectedSymbol(symbol)
    setModalOpen(true)
    setModalLoading(true)
    setModalData(null)
    try {
      const res = await fetch(`${API}/api/stock/${symbol}`)
      const data = await res.json()
      setModalData(data)
    } catch (e) {
      console.error('Detay yüklenemedi:', e)
    } finally {
      setModalLoading(false)
    }
  }

  useEffect(() => {
    loadSignals()
    const timer = setInterval(loadSignals, 30_000)
    return () => clearInterval(timer)
  }, [loadSignals])

  return (
    <Layout style={{ minHeight: '100vh', background: '#0a0d14' }}>
      <Header style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: '#0f1420', borderBottom: '1px solid #1e2738',
        height: 48, padding: '0 20px', position: 'sticky', top: 0, zIndex: 100,
      }}>
        <Space size={10} align="center">
          <RiseOutlined style={{ color: '#3b82f6', fontSize: 16 }} />
          <Text style={{ color: '#e2e8f0', fontWeight: 700, fontSize: 14, letterSpacing: '0.01em' }}>
            BIST <span style={{ color: '#3b82f6' }}>Trade Bot</span>
          </Text>
          <span style={{
            fontSize: 9, fontWeight: 700, letterSpacing: '0.1em',
            color: '#22c55e', background: 'rgba(34,197,94,0.1)',
            border: '1px solid rgba(34,197,94,0.25)',
            padding: '1px 7px', borderRadius: 10,
          }}>
            <span className="live-dot" />CANLI
          </span>
        </Space>
        <Space size={12}>
          {lastUpdate && (
            <Text style={{ color: '#4a5568', fontSize: 11 }}>
              {lastUpdate.toLocaleTimeString('tr-TR')}
            </Text>
          )}
          <Tooltip title="Yenile">
            <Button
              icon={<ReloadOutlined spin={loading} />}
              size="small"
              onClick={loadSignals}
              loading={loading}
              style={{ background: '#161e2e', border: '1px solid #1e2738', color: '#8898aa' }}
            />
          </Tooltip>
        </Space>
      </Header>

      <Content style={{ padding: '14px 20px', flex: 1 }}>
        <StatsBar signals={signals} />

        <div style={{ display: 'flex', gap: 12, marginTop: 12, alignItems: 'flex-start' }}>
          {/* Main table */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <SignalsTable
              signals={signals}
              loading={loading}
              onRowClick={(symbol) => openStockDetail(symbol)}
            />
          </div>

          {/* Live feed sidebar */}
          <LiveFeed signals={signals} />
        </div>
      </Content>

      <StockModal
        open={modalOpen}
        loading={modalLoading}
        data={modalData}
        onClose={() => { setModalOpen(false); setModalData(null) }}
      />
    </Layout>
  )
}
