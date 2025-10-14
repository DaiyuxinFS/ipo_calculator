import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

function StockTable() {
  const navigate = useNavigate()
  const [stocks, setStocks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdate, setLastUpdate] = useState(null)

  const fetchStocks = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await axios.get('/api/stocks')
      setStocks(response.data)
      setLastUpdate(new Date().toLocaleTimeString('zh-HK'))
      setLoading(false)
    } catch (err) {
      console.error('獲取數據錯誤:', err)
      setError(err.message)
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStocks()
    const interval = setInterval(() => {
      fetchStocks()
    }, 30000)
    return () => clearInterval(interval)
  }, [])

  const formatNumber = (num) => {
    if (!num) return '-'
    return parseFloat(num).toLocaleString('zh-HK')
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '-'
    const date = new Date(dateStr)
    return date.toLocaleDateString('zh-HK')
  }

  if (loading && stocks.length === 0) {
    return (
      <div className="table-section">
        <div className="loading">載入中...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="table-section">
        <div className="error-message">
          <p style={{ marginBottom: '1rem' }}>載入數據失敗</p>
          <p style={{ fontSize: '0.75rem', opacity: 0.6, marginBottom: '2rem' }}>{error}</p>
          <button onClick={fetchStocks} className="btn">
            重試
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="table-section">
      <div className="table-header">
        <div>
          <h2 className="section-title" style={{ marginBottom: '0.5rem' }}>近期新股</h2>
          {lastUpdate && (
            <p style={{ fontSize: '0.65rem', opacity: '0.5', letterSpacing: '0.05em' }}>
              更新於 {lastUpdate}
            </p>
          )}
        </div>
        <button
          onClick={fetchStocks}
          disabled={loading}
          className="refresh-btn"
        >
          {loading ? '更新中...' : '刷新'}
        </button>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table className="minimal-table">
          <thead>
            <tr>
              <th>#</th>
              <th>股票名稱</th>
              <th>代碼</th>
              <th>申購截止</th>
              <th>中籤暗盤</th>
              <th>定價上限</th>
              <th style={{ textAlign: 'right' }}>總發售量</th>
              <th style={{ textAlign: 'right' }}>公開發售</th>
              <th style={{ textAlign: 'right' }}>每手</th>
              <th>開盤時間</th>
              <th style={{ textAlign: 'center' }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {stocks.map((stock, index) => (
              <tr key={index}>
                <td>{index + 1}</td>
                <td style={{ fontWeight: '400' }}>{stock.股票名 || '-'}</td>
                <td style={{ fontFamily: 'monospace' }}>{stock.代码 || '-'}</td>
                <td>{formatDate(stock.申购截止日期)}</td>
                <td>{formatDate(stock.中签暗盘时间)}</td>
                <td>HKD {stock.招股定价上限 || '-'}</td>
                <td style={{ textAlign: 'right' }}>{formatNumber(stock.总发售量)}</td>
                <td style={{ textAlign: 'right' }}>{formatNumber(stock.预估公开发售股数)}</td>
                <td style={{ textAlign: 'right' }}>{formatNumber(stock.每手股数)}</td>
                <td>{formatDate(stock.开盘时间)}</td>
                <td style={{ textAlign: 'center' }}>
                  <button
                    onClick={() => navigate(`/stock/${stock.代码}`)}
                    className="detail-btn"
                  >
                    檔位&申購詳情
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {stocks.length === 0 && !loading && (
        <div className="empty-state">
          暫無新股數據
        </div>
      )}
    </div>
  )
}

export default StockTable
