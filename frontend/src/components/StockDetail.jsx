import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'

function StockDetail() {
  const { stockCode } = useParams()
  const navigate = useNavigate()
  const [stockInfo, setStockInfo] = useState(null)
  const [applyDetails, setApplyDetails] = useState([])
  const [applyTiers, setApplyTiers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchDetails = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await axios.get(`/api/stock-details/${stockCode}`)
      setStockInfo(response.data.stockInfo)
      setApplyDetails(response.data.applyDetails)
      setApplyTiers(response.data.applyTiers)
      setLoading(false)
    } catch (err) {
      console.error('獲取詳情錯誤:', err)
      setError(err.message)
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDetails()
  }, [stockCode])

  const formatNumber = (num) => {
    if (!num) return '-'
    return parseFloat(num).toLocaleString('zh-HK')
  }

  const formatPercent = (num) => {
    if (!num) return '-'
    
    // 转换为百分比
    const percent = parseFloat(num) * 100
    
    // 自适应格式化：保留两位有效数字
    if (percent >= 1) {
      // 大于等于1%时，显示两位小数
      return `${percent.toFixed(2)}%`
    } else if (percent >= 0.01) {
      // 0.01% - 1%之间，显示两位小数
      return `${percent.toFixed(2)}%`
    } else {
      // 小于0.01%时，显示更多小数位以保持精度
      return `${percent.toFixed(4)}%`
    }
  }

  if (loading) {
    return (
      <div className="main-container">
        <div className="loading">載入中...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="main-container">
        <div className="error-message">
          <p style={{ marginBottom: '1rem' }}>載入數據失敗</p>
          <p style={{ fontSize: '0.75rem', opacity: 0.6, marginBottom: '2rem' }}>{error}</p>
          <button onClick={() => navigate('/')} className="btn">
            返回首頁
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="main-container" style={{ paddingTop: '2rem' }}>
      {/* 返回按钮 */}
      <button 
        onClick={() => navigate('/')} 
        className="btn"
        style={{ marginBottom: '2rem' }}
      >
        ← 返回
      </button>

      {/* 股票基本信息 */}
      {stockInfo && (
        <div className="card stock-info-card" style={{ marginBottom: '1.5rem' }}>
          <h2 className="section-title" style={{ marginBottom: '1rem' }}>
            {stockInfo.股票名}
          </h2>
          <div className="stock-info-grid">
            <div>
              <p style={{ opacity: 0.6, fontSize: '0.8rem', marginBottom: '0.5rem' }}>股票代碼</p>
              <p style={{ fontWeight: '500', fontFamily: 'monospace' }}>{stockInfo.代码}</p>
            </div>
            <div>
              <p style={{ opacity: 0.6, fontSize: '0.8rem', marginBottom: '0.5rem' }}>定價上限</p>
              <p style={{ fontWeight: '500' }}>HKD {stockInfo.招股定价上限}</p>
            </div>
            <div>
              <p style={{ opacity: 0.6, fontSize: '0.8rem', marginBottom: '0.5rem' }}>每手股數</p>
              <p style={{ fontWeight: '500' }}>{formatNumber(stockInfo.每手股数)}</p>
            </div>
          </div>
        </div>
      )}

      {/* 申购明细表格 */}
      {applyDetails.length > 0 && (
        <div style={{ marginTop: '1rem', marginBottom: '2rem' }}>
          <div className="detail-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <h3 className="section-title" style={{ marginBottom: 0 }}>檔位 & 申購詳情</h3>
            <button 
              onClick={fetchDetails}
              disabled={loading}
              className="refresh-btn"
            >
              {loading ? '更新中...' : '刷新數據'}
            </button>
          </div>
          
          <div style={{ overflowX: 'auto' }}>
            <table className="detail-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>申請股數</th>
                  <th>應繳費用</th>
                  <th>組別</th>
                  <th>有效申購人數</th>
                  <th>中籤人數</th>
                  <th>配發比例</th>
                </tr>
              </thead>
              <tbody>
                {applyDetails.map((detail, index) => {
                  // 在 applyTiers 中查找匹配的数据
                  // 支持灵活匹配：同时匹配 match_key 和基于 shares_applied 的匹配
                  const tierData = applyTiers.find(tier => {
                    // 精确匹配 match_key
                    if (tier.match_key === detail.match_key) return true
                    
                    // 尝试基于股数匹配（处理小数点不一致的情况）
                    const detailShares = parseFloat(detail.shares_applied)
                    const tierShares = parseFloat(tier.shares_applied)
                    const detailCode = detail.id
                    const tierCode = tier.id
                    
                    return detailCode === tierCode && Math.abs(detailShares - tierShares) < 0.01
                  })
                  
                  return (
                    <tr key={index}>
                      <td>{detail.id}</td>
                      <td>{formatNumber(detail.shares_applied)}</td>
                      <td>{detail.max_payment_hkd || '-'}</td>
                      <td>{detail.apply_group || '-'}</td>
                      <td>
                        {tierData ? formatNumber(tierData.valid_applications) : '-'}
                      </td>
                      <td>
                        {tierData ? formatNumber(tierData.winners) : '-'}
                      </td>
                      <td>
                        {tierData ? formatPercent(tierData.approx_alloc_pct) : '-'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {applyDetails.length === 0 && !loading && (
        <div className="empty-state">
          暫無申購詳情數據
        </div>
      )}

      {/* 配售结果提示 */}
      {applyDetails.length > 0 && applyTiers.length === 0 && (
        <div style={{ 
          padding: '1rem', 
          background: 'rgba(255, 255, 255, 0.05)', 
          borderRadius: '8px',
          fontSize: '0.85rem',
          opacity: 0.7,
          textAlign: 'center'
        }}>
          <p>配售結果尚未公佈，中籤相關數據將在結果公佈後更新</p>
          <p style={{ fontSize: '0.75rem', marginTop: '0.5rem' }}>請使用上方「刷新數據」按鈕手動更新</p>
        </div>
      )}
    </div>
  )
}

export default StockDetail

