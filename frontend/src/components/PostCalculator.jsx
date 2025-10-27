import { useState, useEffect } from 'react'
import axios from 'axios'

function PostCalculator() {
  // 股票选择
  const [stocks, setStocks] = useState([])
  const [selectedStock, setSelectedStock] = useState('')
  const [issuePrice, setIssuePrice] = useState('')
  
  // 申购信息
  const [sharesApplied, setSharesApplied] = useState('')
  const [allocatedShares, setAllocatedShares] = useState('')
  
  // 卖出信息
  const [sellPrice, setSellPrice] = useState('')
  
  // 费用信息
  const [applicationFee, setApplicationFee] = useState('100')
  const [useFinancing, setUseFinancing] = useState(false)
  const [financingAmount, setFinancingAmount] = useState('')
  const [financingRate, setFinancingRate] = useState('5')
  const [holdingDays, setHoldingDays] = useState('7')
  const [sellFee, setSellFee] = useState('0')
  
  // 结果
  const [results, setResults] = useState(null)

  // 获取股票列表
  useEffect(() => {
    const fetchStocks = async () => {
      try {
        const response = await axios.get('/api/stocks')
        setStocks(response.data)
      } catch (error) {
        console.error('获取股票列表失败:', error)
      }
    }
    fetchStocks()
  }, [])

  // 根据股票代码自动填入发行价
  const fillIssuePriceByCode = (stockCode) => {
    if (stockCode) {
      const stock = stocks.find(s => s.代码 === stockCode)
      if (stock) {
        // 优先使用 发行价，如果没有则使用 招股定价上限
        const price = stock.发行价 || stock.招股定价上限
        if (price) {
          // 提取价格数字（可能是 "10.00 HKD" 或 "10.00" 格式）
          const priceMatch = price.toString().match(/[\d.]+/)
          if (priceMatch) {
            setIssuePrice(priceMatch[0])
          }
        }
      }
    } else {
      setIssuePrice('')
    }
  }

  // 当选择股票时自动填入发行价
  const handleStockSelect = (e) => {
    const stockCode = e.target.value
    setSelectedStock(stockCode)
    fillIssuePriceByCode(stockCode)
  }

  // 当手动输入股票代码时，失去焦点后自动查询发行价
  const handleStockCodeBlur = (e) => {
    const stockCode = e.target.value.trim()
    fillIssuePriceByCode(stockCode)
  }

  const calculateReturn = () => {
    // 验证输入
    const shares = parseFloat(sharesApplied)
    const price = parseFloat(issuePrice)
    const allocated = parseFloat(allocatedShares)
    const sellPriceValue = parseFloat(sellPrice)
    const appFee = parseFloat(applicationFee) || 0
    const sellFeeValue = parseFloat(sellFee) || 0

    if (isNaN(shares) || shares <= 0) {
      alert('請輸入有效的申購股數')
      return
    }
    if (isNaN(price) || price <= 0) {
      alert('請輸入有效的發行價')
      return
    }
    if (isNaN(allocated) || allocated <= 0) {
      alert('請輸入有效的中籤股數')
      return
    }
    if (isNaN(sellPriceValue) || sellPriceValue <= 0) {
      alert('請輸入有效的賣出價格')
      return
    }

    // 1. 基本计算
    const paidAmount = allocated * price
    const sellRevenue = allocated * sellPriceValue

    // 2. 毛利润
    const grossProfit = sellRevenue - paidAmount

    // 3. 费用计算
    let financingCost = 0
    if (useFinancing) {
      const finAmount = parseFloat(financingAmount) || 0
      const finRate = parseFloat(financingRate) / 100
      const days = parseFloat(holdingDays) || 0
      financingCost = finAmount * (finRate / 365) * days
    }

    const totalFees = appFee + financingCost + sellFeeValue

    // 4. 净收益
    const netProfit = grossProfit - totalFees
    const returnRate = (netProfit / (shares * price)) * 100

    setResults({
      allocatedShares: allocated,
      paidAmount,
      sellRevenue,
      grossProfit,
      fees: {
        applicationFee: appFee,
        financingCost,
        sellFee: sellFeeValue,
        total: totalFees
      },
      netProfit,
      returnRate
    })
  }

  const handleReset = () => {
    setSelectedStock('')
    setIssuePrice('')
    setSharesApplied('')
    setAllocatedShares('')
    setSellPrice('')
    setApplicationFee('100')
    setUseFinancing(false)
    setFinancingAmount('')
    setFinancingRate('5')
    setHoldingDays('7')
    setSellFee('0')
    setResults(null)
  }

  const formatNumber = (num) => {
    if (num === null || num === undefined) return '-'
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  const formatShares = (num) => {
    if (num === null || num === undefined) return '-'
    return num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
  }

  return (
    <div className="calculator-section">
      <h2 className="section-title">收益驗證計算器</h2>
      <div style={{ textAlign: 'center', fontSize: '0.7rem', color: '#999', marginTop: '-0.5rem', marginBottom: '1.5rem', letterSpacing: '0.05em' }}>
        事後驗證實際收益
      </div>
      
      {/* 股票代码输入 */}
      <div className="input-group">
        <label className="input-label">IPO代碼（可選）</label>
        <input
          type="text"
          value={selectedStock}
          onChange={(e) => setSelectedStock(e.target.value)}
          onBlur={handleStockCodeBlur}
          placeholder="輸入或選擇股票代碼，如：2670"
          className="input-field"
          list="stock-list"
        />
        <datalist id="stock-list">
          {stocks.map(stock => (
            <option key={stock.代码} value={stock.代码}>
              {stock.名称}
            </option>
          ))}
        </datalist>
      </div>

      {/* 申购和卖出信息 - 网格布局 */}
      <div style={{ marginTop: '2rem', marginBottom: '1rem', fontSize: '0.85rem', fontWeight: '500', color: '#666', letterSpacing: '0.1em' }}>
        申購與賣出信息
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        <div className="input-group" style={{ marginBottom: '0' }}>
          <label className="input-label">申購股數</label>
          <input
            type="number"
            value={sharesApplied}
            onChange={(e) => setSharesApplied(e.target.value)}
            placeholder="申購了多少股"
            className="input-field"
          />
        </div>

        <div className="input-group" style={{ marginBottom: '0' }}>
          <label className="input-label">發行價 (HKD/股)</label>
          <input
            type="number"
            value={issuePrice}
            onChange={(e) => setIssuePrice(e.target.value)}
            placeholder="IPO發行價格"
            className="input-field"
            step="0.01"
          />
        </div>

        <div className="input-group" style={{ marginBottom: '0' }}>
          <label className="input-label">中籤股數</label>
          <input
            type="number"
            value={allocatedShares}
            onChange={(e) => setAllocatedShares(e.target.value)}
            placeholder="實際獲配的股數"
            className="input-field"
            step="1"
          />
        </div>

        <div className="input-group" style={{ marginBottom: '0' }}>
          <label className="input-label">賣出價格 (HKD/股)</label>
          <input
            type="number"
            value={sellPrice}
            onChange={(e) => setSellPrice(e.target.value)}
            placeholder="賣出時的價格"
            className="input-field"
            step="0.01"
          />
        </div>
      </div>

      {/* 费用信息 - 网格布局 */}
      <div style={{ marginTop: '2rem', marginBottom: '1rem', fontSize: '0.85rem', fontWeight: '500', color: '#666', letterSpacing: '0.1em' }}>
        費用信息
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        <div className="input-group" style={{ marginBottom: '0' }}>
          <label className="input-label">申購手續費 (HKD)</label>
          <input
            type="number"
            value={applicationFee}
            onChange={(e) => setApplicationFee(e.target.value)}
            placeholder="券商收取的手續費"
            className="input-field"
            step="0.01"
          />
        </div>

        <div className="input-group" style={{ marginBottom: '0' }}>
          <label className="input-label">賣出費用 (HKD)</label>
          <input
            type="number"
            value={sellFee}
            onChange={(e) => setSellFee(e.target.value)}
            placeholder="佣金、印花稅等總額"
            className="input-field"
            step="0.01"
          />
        </div>
      </div>

      {/* 融资选项 */}
      <div style={{ marginTop: '1.5rem' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem', color: '#666' }}>
          <input
            type="checkbox"
            checked={useFinancing}
            onChange={(e) => setUseFinancing(e.target.checked)}
            style={{ width: 'auto', cursor: 'pointer' }}
          />
          使用融資
        </label>
      </div>

      {useFinancing && (
        <div style={{ marginTop: '1rem', padding: '1.2rem', background: 'rgba(0,0,0,0.02)', borderRadius: '6px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
            <div className="input-group" style={{ marginBottom: '0' }}>
              <label className="input-label">融資金額 (HKD)</label>
              <input
                type="number"
                value={financingAmount}
                onChange={(e) => setFinancingAmount(e.target.value)}
                placeholder="融資的金額"
                className="input-field"
                step="0.01"
              />
            </div>

            <div className="input-group" style={{ marginBottom: '0' }}>
              <label className="input-label">融資年利率 (%)</label>
              <input
                type="number"
                value={financingRate}
                onChange={(e) => setFinancingRate(e.target.value)}
                placeholder="5"
                className="input-field"
                step="0.01"
              />
            </div>

            <div className="input-group" style={{ marginBottom: '0' }}>
              <label className="input-label">持有天數</label>
              <input
                type="number"
                value={holdingDays}
                onChange={(e) => setHoldingDays(e.target.value)}
                placeholder="7"
                className="input-field"
                step="1"
              />
            </div>
          </div>
        </div>
      )}

      <div className="button-group">
        <button onClick={calculateReturn} className="btn btn-primary">
          計算收益
        </button>
        <button onClick={handleReset} className="btn">
          重置
        </button>
      </div>

      {/* 结果展示 */}
      {results && (
        <div className="results-container" style={{ marginTop: '2rem' }}>
          <div style={{ 
            padding: '1.5rem', 
            background: 'rgba(255,255,255,0.8)', 
            border: '1px solid rgba(0,0,0,0.08)',
            borderRadius: '8px',
            fontSize: '0.85rem'
          }}>
            <div style={{ marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <div style={{ color: '#999', fontSize: '0.75rem', marginBottom: '0.3rem' }}>獲配股數</div>
                  <div style={{ fontWeight: '500' }}>{formatShares(results.allocatedShares)} 股</div>
                </div>
                <div>
                  <div style={{ color: '#999', fontSize: '0.75rem', marginBottom: '0.3rem' }}>中籤金額</div>
                  <div style={{ fontWeight: '500' }}>HKD {formatNumber(results.paidAmount)}</div>
                </div>
                <div>
                  <div style={{ color: '#999', fontSize: '0.75rem', marginBottom: '0.3rem' }}>賣出金額</div>
                  <div style={{ fontWeight: '500' }}>HKD {formatNumber(results.sellRevenue)}</div>
                </div>
                <div>
                  <div style={{ color: '#999', fontSize: '0.75rem', marginBottom: '0.3rem' }}>毛利潤</div>
                  <div style={{ fontWeight: '500', color: results.grossProfit >= 0 ? '#22c55e' : '#ef4444' }}>
                    {results.grossProfit >= 0 ? '+' : ''}HKD {formatNumber(results.grossProfit)}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
              <div style={{ color: '#666', fontSize: '0.8rem', fontWeight: '500', marginBottom: '0.8rem' }}>費用明細</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.78rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#999' }}>申購手續費</span>
                  <span>HKD {formatNumber(results.fees.applicationFee)}</span>
                </div>
                {useFinancing && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#999' }}>融資利息</span>
                    <span>HKD {formatNumber(results.fees.financingCost)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#999' }}>賣出費用</span>
                  <span>HKD {formatNumber(results.fees.sellFee)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(0,0,0,0.06)', fontWeight: '500' }}>
                  <span>總費用</span>
                  <span>HKD {formatNumber(results.fees.total)}</span>
                </div>
              </div>
            </div>

            <div style={{ 
              padding: '1.2rem', 
              background: results.netProfit >= 0 ? 'rgba(34, 197, 94, 0.08)' : 'rgba(239, 68, 68, 0.08)',
              borderRadius: '6px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#666', marginBottom: '0.3rem' }}>💰 淨收益</div>
                  <div style={{ 
                    fontSize: '1.5rem', 
                    fontWeight: '600',
                    color: results.netProfit >= 0 ? '#22c55e' : '#ef4444'
                  }}>
                    {results.netProfit >= 0 ? '+' : ''}HKD {formatNumber(results.netProfit)}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.75rem', color: '#666', marginBottom: '0.3rem' }}>📊 收益率</div>
                  <div style={{ 
                    fontSize: '1.5rem', 
                    fontWeight: '600',
                    color: results.returnRate >= 0 ? '#22c55e' : '#ef4444'
                  }}>
                    {results.returnRate >= 0 ? '+' : ''}{results.returnRate.toFixed(2)}%
                  </div>
                </div>
              </div>
              
              {results.netProfit >= 0 ? (
                <div style={{ marginTop: '0.8rem', fontSize: '0.75rem', color: '#22c55e', textAlign: 'center' }}>
                  ✓ 盈利
                </div>
              ) : (
                <div style={{ marginTop: '0.8rem', fontSize: '0.75rem', color: '#ef4444', textAlign: 'center' }}>
                  ✗ 虧損
                </div>
              )}
            </div>
          </div>

          <div style={{ 
            marginTop: '1.5rem', 
            padding: '1rem', 
            border: '1px solid rgba(0,0,0,0.08)',
            fontSize: '0.72rem',
            lineHeight: '1.8',
            opacity: '0.7',
            borderRadius: '4px'
          }}>
            <strong>說明：</strong>本計算器用於驗證實際打新收益。請確保輸入準確的中籤比例、賣出價格和各項費用。計算結果僅供參考。
          </div>
        </div>
      )}
    </div>
  )
}

export default PostCalculator

