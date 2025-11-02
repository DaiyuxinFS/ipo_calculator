import { useState, useEffect } from 'react'
import axios from 'axios'

function PostCalculator() {
  // 股票选择
  const [stocks, setStocks] = useState([])
  const [selectedStock, setSelectedStock] = useState('')
  const [issuePrice, setIssuePrice] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  
  // 档位数据
  const [tierData, setTierData] = useState(null)
  const [matchedTier, setMatchedTier] = useState(null)
  
  // 申购信息
  const [sharesApplied, setSharesApplied] = useState('')
  const [allocatedShares, setAllocatedShares] = useState('')
  const [autoCalcAllocation, setAutoCalcAllocation] = useState(null)
  
  // 卖出信息
  const [sellPrice, setSellPrice] = useState('')
  
  // 费用信息
  const [applicationFee, setApplicationFee] = useState('100')
  const [useFinancing, setUseFinancing] = useState(false)
  const [financingMultiple, setFinancingMultiple] = useState('10')
  const [financingRate, setFinancingRate] = useState('5')
  const [holdingDays, setHoldingDays] = useState('7')
  const [sellFee, setSellFee] = useState('0')
  
  // 结果
  const [results, setResults] = useState(null)
  const [comparisonMode, setComparisonMode] = useState(false)
  const [comparisonResults, setComparisonResults] = useState([])
  const [showScrollIndicator, setShowScrollIndicator] = useState(true)

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

  // 根据股票代码自动填入发行价并获取档位信息
  const fillIssuePriceByCode = async (stockCode) => {
    if (stockCode) {
      const stock = stocks.find(s => s.代码 === stockCode)
      if (stock) {
        // 优先使用 发行价，如果没有则使用 招股定价上限
        const price = stock.发行价 || stock.招股定价上限
        if (price) {
          const priceMatch = price.toString().match(/[\d.]+/)
          if (priceMatch) {
            setIssuePrice(priceMatch[0])
          }
        }
        
        // 获取档位详情
        try {
          const response = await axios.get(`/api/tier-details/${stockCode}`)
          setTierData(response.data)
        } catch (error) {
          console.error('获取档位信息失败:', error)
          setTierData(null)
        }
      }
    } else {
      setIssuePrice('')
      setTierData(null)
      setMatchedTier(null)
      setAutoCalcAllocation(null)
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
    setTimeout(() => setShowDropdown(false), 200)
  }

  // 处理输入框变化
  const handleStockInputChange = (e) => {
    const value = e.target.value
    setSelectedStock(value)
    setShowDropdown(true)
  }

  // 选择股票选项
  const handleSelectStock = (stockCode) => {
    setSelectedStock(stockCode)
    fillIssuePriceByCode(stockCode)
    setShowDropdown(false)
  }

  // 过滤股票列表
  const filteredStocks = stocks.filter(stock => 
    stock.代码?.toLowerCase().includes(selectedStock.toLowerCase()) ||
    stock.名称?.toLowerCase().includes(selectedStock.toLowerCase())
  )

  // 当输入申购股数时，自动识别档位并计算中签股数
  useEffect(() => {
    if (sharesApplied && tierData && tierData.tiers) {
      const shares = parseFloat(sharesApplied)
      
      // 找到匹配的档位（精确匹配或范围匹配）
      const matched = tierData.tiers.find(tier => 
        Math.abs(parseFloat(tier.shares_applied) - shares) < 0.01
      )
      
      if (matched) {
        setMatchedTier(matched)
        
        // 使用公式计算中签股数：实际中签股数 = (配发比例 × 有效申购人数 × 申请股数) / 中签人数
        if (matched.approx_alloc_pct && matched.valid_applications && matched.winners) {
          const allocPct = parseFloat(matched.approx_alloc_pct)
          const validApps = parseFloat(matched.valid_applications)
          const winners = parseFloat(matched.winners)
          
          // 使用完整公式
          const calculatedAllocation = Math.round((allocPct * validApps * shares) / winners)
          
          // 或者简化公式: 申请股数 × 配发比例
          // const calculatedAllocation = Math.round(shares * allocPct)
          
          setAutoCalcAllocation({
            shares: calculatedAllocation,
            tier: matched,
            formula: `(${(allocPct * 100).toFixed(4)}% × ${formatNumber(validApps)} × ${shares}) / ${formatNumber(winners)}`
          })
          
          // 自动填入中签股数
          setAllocatedShares(calculatedAllocation.toString())
        } else {
          setAutoCalcAllocation(null)
        }
      } else {
        setMatchedTier(null)
        setAutoCalcAllocation(null)
      }
    } else {
      setMatchedTier(null)
      setAutoCalcAllocation(null)
    }
  }, [sharesApplied, tierData])

  // 计算打和点
  const calculateBreakEven = (shares, allocated, appFee, finCost) => {
    if (!shares || !allocated || !issuePrice) return null
    
    const price = parseFloat(issuePrice)
    const allocatedNum = parseFloat(allocated)
    const appFeeNum = parseFloat(appFee) || 0
    const finCostNum = parseFloat(finCost) || 0
    
    // 卖出费用比例（参考老虎证券）
    const sellFeeRate = 0.00565 + 0.001 + 0.00027 + 0.00015 + 0.00042 // ~0.13219%
    
    // 打和点公式:
    // 打和价 × 股数 × (1 - 费率) = 发行价 × 股数 + 申购费 + 融资成本
    // 打和价 = (发行价 × 股数 + 申购费 + 融资成本) / (股数 × (1 - 费率))
    
    const breakEven = (price * allocatedNum + appFeeNum + finCostNum) / (allocatedNum * (1 - sellFeeRate))
    
    return breakEven
  }

  // 计算单个策略
  const calculateStrategy = (tierInfo, sellPriceValue, priceValue) => {
    const shares = parseFloat(tierInfo.shares_applied)
    const allocPct = parseFloat(tierInfo.approx_alloc_pct)
    const validApps = parseFloat(tierInfo.valid_applications)
    const winners = parseFloat(tierInfo.winners)
    
    if (!allocPct || !validApps || !winners) return null
    
    // 使用公式计算中签股数
    const allocated = Math.round((allocPct * validApps * shares) / winners)
    
    // 计算收益
    const paidAmount = allocated * priceValue
    const sellRevenue = allocated * sellPriceValue
    const grossProfit = sellRevenue - paidAmount
    
    // 计算费用
    const appFee = parseFloat(applicationFee) || 100
    
    // 融资成本计算（策略对比模式下，每个档位的融资金额不同）
    let financingCost = 0
    let strategyFinancingAmount = 0
    let strategyOwnCapital = 0
    
    if (useFinancing) {
      const finRate = parseFloat(financingRate) / 100
      const days = parseFloat(holdingDays) || 0
      
      // 计算该档位需要的总申购金额
      const totalRequired = shares * priceValue
      
      // 假设10倍融资：本金 = 总需求 / 10，融资金额 = 总需求 * 0.9
      strategyOwnCapital = totalRequired / 10
      strategyFinancingAmount = totalRequired * 0.9
      
      // 计算融资成本
      financingCost = strategyFinancingAmount * (finRate / 365) * days
    }
    
    // 卖出费用（简化计算）
    const sellFeeValue = sellRevenue * 0.0013219 // 0.13219%
    const totalFees = appFee + financingCost + sellFeeValue
    
    const netProfit = grossProfit - totalFees
    
    // 收益率计算基于本金（而非申购总额）
    const capitalBase = strategyOwnCapital > 0 ? strategyOwnCapital : (shares * priceValue)
    const returnRate = (netProfit / capitalBase) * 100
    
    // 计算打和点
    const breakEven = calculateBreakEven(shares, allocated, appFee, financingCost)
    
    // 数学期望（基于本金）
    const expectedValue = allocated * (sellPriceValue - priceValue) - totalFees
    
    return {
      group: tierInfo.apply_group || '未知',
      sharesApplied: shares,
      allocatedShares: allocated,
      allocPct: (allocPct * 100).toFixed(4),
      validApplications: validApps,
      winners: winners,
      breakEven,
      paidAmount,
      sellRevenue,
      grossProfit,
      netProfit,
      returnRate,
      expectedValue,
      totalFees,
      financingAmount: strategyFinancingAmount,
      financingCost: financingCost,
      ownCapital: strategyOwnCapital,
      isActual: Math.abs(shares - parseFloat(sharesApplied)) < 0.01
    }
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
    let actualFinancingAmount = 0
    if (useFinancing) {
      const multiple = parseFloat(financingMultiple) || 1
      const totalRequired = shares * price
      const ownCapital = totalRequired / multiple
      actualFinancingAmount = totalRequired - ownCapital
      
      const finRate = parseFloat(financingRate) / 100
      const days = parseFloat(holdingDays) || 0
      financingCost = actualFinancingAmount * (finRate / 365) * days
    }

    const totalFees = appFee + financingCost + sellFeeValue

    // 4. 净收益
    const netProfit = grossProfit - totalFees
    const returnRate = (netProfit / (shares * price)) * 100
    
    // 5. 计算打和点
    const breakEvenPrice = calculateBreakEven(shares, allocated, appFee, financingCost)

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
      returnRate,
      breakEvenPrice
    })
    
    // 如果启用策略对比模式，计算所有策略
    if (comparisonMode && tierData && tierData.tiers && tierData.tiers.length > 0) {
      const comparisons = tierData.tiers
        .map(tier => calculateStrategy(tier, sellPriceValue, price))
        .filter(Boolean)
        .sort((a, b) => b.expectedValue - a.expectedValue)
      
      setComparisonResults(comparisons)
    }
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
    setTierData(null)
    setMatchedTier(null)
    setAutoCalcAllocation(null)
    setComparisonMode(false)
    setComparisonResults([])
  }

  const formatNumber = (num) => {
    if (num === null || num === undefined || isNaN(num)) return '-'
    return num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
  }

  const formatDecimal = (num, decimals = 2) => {
    if (num === null || num === undefined || isNaN(num)) return '-'
    return num.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
  }

  const formatShares = (num) => {
    if (num === null || num === undefined) return '-'
    return num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
  }

  return (
    <>
    <div className="calculator-section">
      <h2 className="section-title">收益驗證計算器</h2>
      <div style={{ textAlign: 'center', fontSize: '0.7rem', color: '#999', marginTop: '-0.5rem', marginBottom: '1.5rem', letterSpacing: '0.05em' }}>
        事後驗證實際收益 · 策略對比分析
      </div>
      
      {/* 股票代码输入 */}
      <div className="input-group" style={{ position: 'relative' }}>
        <label className="input-label">IPO代碼</label>
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            value={selectedStock}
            onChange={handleStockInputChange}
            onFocus={() => setShowDropdown(true)}
            onBlur={handleStockCodeBlur}
            placeholder="輸入或選擇股票代碼，如：2670"
            className="input-field custom-select-input"
          />
          <button
            type="button"
            className="dropdown-arrow"
            onClick={() => setShowDropdown(!showDropdown)}
            onMouseDown={(e) => e.preventDefault()}
          >
            ▼
          </button>
          {showDropdown && filteredStocks.length > 0 && (
            <div className="dropdown-menu">
              {filteredStocks.slice(0, 10).map(stock => (
                <div
                  key={stock.代码}
                  className="dropdown-item"
                  onMouseDown={(e) => {
                    e.preventDefault()
                    handleSelectStock(stock.代码)
                  }}
                >
                  <span className="stock-code">{stock.代码}</span>
                  <span className="stock-name">{stock.名称}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 档位自动识别 */}
      {matchedTier && autoCalcAllocation && (
        <div style={{
          marginTop: '1.5rem',
          padding: '1.2rem',
          background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.08) 0%, rgba(59, 130, 246, 0.08) 100%)',
          borderRadius: '8px',
          border: '1px solid rgba(34, 197, 94, 0.2)'
        }}>
          <div style={{ fontSize: '0.85rem', fontWeight: '600', color: '#059669', marginBottom: '0.8rem' }}>
            ✅ 自動識別檔位
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.8rem', fontSize: '0.75rem' }}>
            <div>
              <div style={{ color: '#666', marginBottom: '0.3rem' }}>組別</div>
              <div style={{ fontWeight: '600', color: '#111' }}>{matchedTier.apply_group || '未知'}</div>
            </div>
            <div>
              <div style={{ color: '#666', marginBottom: '0.3rem' }}>配發比例</div>
              <div style={{ fontWeight: '600', color: '#111' }}>{(parseFloat(matchedTier.approx_alloc_pct) * 100).toFixed(4)}%</div>
            </div>
            <div>
              <div style={{ color: '#666', marginBottom: '0.3rem' }}>有效申購人數</div>
              <div style={{ fontWeight: '600', color: '#111' }}>{formatNumber(matchedTier.valid_applications)}</div>
            </div>
            <div>
              <div style={{ color: '#666', marginBottom: '0.3rem' }}>中籤人數</div>
              <div style={{ fontWeight: '600', color: '#111' }}>{formatNumber(matchedTier.winners)}</div>
            </div>
          </div>
          <div style={{ 
            marginTop: '1rem', 
            paddingTop: '1rem', 
            borderTop: '1px solid rgba(0,0,0,0.06)',
            fontSize: '0.75rem'
          }}>
            <div style={{ color: '#666', marginBottom: '0.3rem' }}>🎯 預計中籤股數（自動計算）</div>
            <div style={{ fontWeight: '600', fontSize: '1.1rem', color: '#059669' }}>
              {formatNumber(autoCalcAllocation.shares)} 股
            </div>
            <div style={{ marginTop: '0.4rem', fontSize: '0.7rem', color: '#888', fontFamily: 'monospace' }}>
              = {autoCalcAllocation.formula}
            </div>
          </div>
        </div>
      )}

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
          <label className="input-label">中籤股數 {autoCalcAllocation && '(可調整)'}</label>
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
              <label className="input-label">融資倍數</label>
              <select
                value={financingMultiple}
                onChange={(e) => setFinancingMultiple(e.target.value)}
                className="input-field"
              >
                <option value="5">5倍</option>
                <option value="10">10倍</option>
                <option value="15">15倍</option>
                <option value="20">20倍</option>
              </select>
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

      {/* 策略对比模式 */}
      {tierData && tierData.tiers && tierData.tiers.length > 1 && (
        <div style={{ marginTop: '1.5rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem', color: '#666' }}>
            <input
              type="checkbox"
              checked={comparisonMode}
              onChange={(e) => setComparisonMode(e.target.checked)}
              style={{ width: 'auto', cursor: 'pointer' }}
            />
            啟用策略對比分析（對比所有檔位）
          </label>
        </div>
      )}

      <div className="button-group">
        <button onClick={calculateReturn} className="btn btn-primary">
          {comparisonMode ? '計算收益 & 對比策略' : '計算收益'}
        </button>
        <button onClick={handleReset} className="btn">
          重置
        </button>
      </div>

      {/* 单策略结果展示 */}
      {results && !comparisonMode && (
        <div className="results-container post-calc-results" style={{ marginTop: '2rem' }}>
          <div className="post-result-card">
            <div className="post-result-section">
              <div className="post-result-grid">
                <div className="post-result-item">
                  <div className="post-result-label">獲配股數</div>
                  <div className="post-result-value">{formatShares(results.allocatedShares)} 股</div>
                </div>
                <div className="post-result-item">
                  <div className="post-result-label">中籤金額</div>
                  <div className="post-result-value">HKD {formatDecimal(results.paidAmount)}</div>
                </div>
                <div className="post-result-item">
                  <div className="post-result-label">賣出金額</div>
                  <div className="post-result-value">HKD {formatDecimal(results.sellRevenue)}</div>
                </div>
                <div className="post-result-item">
                  <div className="post-result-label">毛利潤</div>
                  <div className="post-result-value" style={{ color: results.grossProfit >= 0 ? '#22c55e' : '#ef4444' }}>
                    {results.grossProfit >= 0 ? '+' : ''}HKD {formatDecimal(results.grossProfit)}
                  </div>
                </div>
              </div>
            </div>

            {results.breakEvenPrice && (
              <div className="post-result-section" style={{ background: 'rgba(59, 130, 246, 0.05)' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: '600', color: '#3b82f6', marginBottom: '0.8rem' }}>
                  📊 打和點分析
                </div>
                <div style={{ fontSize: '0.75rem', color: '#666', marginBottom: '0.5rem' }}>
                  當賣出價格達到此價位時，扣除所有費用後收益為零
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#3b82f6' }}>
                  HKD {formatDecimal(results.breakEvenPrice, 3)}
                </div>
              </div>
            )}

            <div className="post-result-section">
              <div className="post-fees-title">費用明細</div>
              <div className="post-fees-list">
                <div className="post-fee-row">
                  <span>申購手續費</span>
                  <span>HKD {formatDecimal(results.fees.applicationFee)}</span>
                </div>
                {useFinancing && (
                  <div className="post-fee-row">
                    <span>融資利息</span>
                    <span>HKD {formatDecimal(results.fees.financingCost)}</span>
                  </div>
                )}
                <div className="post-fee-row">
                  <span>賣出費用</span>
                  <span>HKD {formatDecimal(results.fees.sellFee)}</span>
                </div>
                <div className="post-fee-row post-fee-total">
                  <span>總費用</span>
                  <span>HKD {formatDecimal(results.fees.total)}</span>
                </div>
              </div>
            </div>

            <div className={`post-final-result ${results.netProfit >= 0 ? 'profit' : 'loss'}`}>
              <div className="post-final-grid">
                <div className="post-final-item">
                  <div className="post-final-label">💰 淨收益</div>
                  <div className="post-final-value" style={{ color: results.netProfit >= 0 ? '#22c55e' : '#ef4444' }}>
                    {results.netProfit >= 0 ? '+' : ''}HKD {formatDecimal(results.netProfit)}
                  </div>
                </div>
                <div className="post-final-item" style={{ textAlign: 'right' }}>
                  <div className="post-final-label">📊 收益率</div>
                  <div className="post-final-value" style={{ color: results.returnRate >= 0 ? '#22c55e' : '#ef4444' }}>
                    {results.returnRate >= 0 ? '+' : ''}{results.returnRate.toFixed(2)}%
                  </div>
                </div>
              </div>
              
              <div className="post-status-badge">
                {results.netProfit >= 0 ? '✓ 盈利' : '✗ 虧損'}
              </div>
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

    {/* 策略对比结果展示 - FUERA del div con max-width */}
    {comparisonMode && comparisonResults.length > 0 && (
      <div style={{ marginTop: '6rem' }}>
        <div style={{
          marginBottom: '3rem',
          textAlign: 'center'
        }}>
          <h3 style={{ 
            fontSize: '0.7rem', 
            fontWeight: '400', 
            color: '#666',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            marginBottom: '0.8rem'
          }}>
            策略對比分析
          </h3>
          <div style={{ 
            fontSize: '0.72rem', 
            color: '#999', 
            lineHeight: '1.8',
            letterSpacing: '0.03em',
            fontWeight: '300'
          }}>
            所有檔位在賣出價格 HKD {formatDecimal(parseFloat(sellPrice))} 下的收益對比
            <span style={{ color: '#22c55e', marginLeft: '0.5rem' }}>✓ 實際策略</span>
          </div>
        </div>

        <div style={{ marginBottom: '4rem' }}>
          <table className="comparison-table">
                <thead>
                  <tr>
                    <th>策略</th>
                    <th>組別</th>
                    <th>申購股數</th>
                    <th>本金 (HKD)</th>
                    <th>融資額 (HKD)</th>
                    <th>融資成本 (HKD)</th>
                    <th>配發比例</th>
                    <th>中籤股數</th>
                    <th>打和點 (HKD)</th>
                    <th>淨收益 (HKD)</th>
                    <th>收益率 (%)</th>
                    <th>數學期望</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonResults.map((result, index) => (
                    <tr 
                      key={index} 
                      className={result.isActual ? 'actual-strategy' : ''}
                      style={{ fontWeight: result.isActual ? '600' : 'normal' }}
                    >
                      <td>
                        {result.isActual ? (
                          <span style={{ color: '#059669' }}>✓ 實際策略</span>
                        ) : (
                          <span style={{ color: '#666' }}>假設策略 {index}</span>
                        )}
                      </td>
                      <td>{result.group}</td>
                      <td>{formatNumber(result.sharesApplied)}</td>
                      <td style={{ color: '#666' }}>
                        {result.ownCapital > 0 ? formatDecimal(result.ownCapital) : '-'}
                      </td>
                      <td style={{ color: '#666' }}>
                        {result.financingAmount > 0 ? formatDecimal(result.financingAmount) : '-'}
                      </td>
                      <td style={{ color: '#ef4444' }}>
                        {result.financingCost > 0 ? formatDecimal(result.financingCost) : '-'}
                      </td>
                      <td>{result.allocPct}%</td>
                      <td>{formatNumber(result.allocatedShares)}</td>
                      <td>{formatDecimal(result.breakEven, 3)}</td>
                      <td style={{ color: result.netProfit >= 0 ? '#22c55e' : '#ef4444', fontWeight: '600' }}>
                        {result.netProfit >= 0 ? '+' : ''}{formatDecimal(result.netProfit)}
                      </td>
                      <td style={{ color: result.returnRate >= 0 ? '#22c55e' : '#ef4444' }}>
                        {result.returnRate >= 0 ? '+' : ''}{formatDecimal(result.returnRate)}%
                      </td>
                      <td style={{ color: result.expectedValue >= 0 ? '#22c55e' : '#ef4444' }}>
                        {result.expectedValue >= 0 ? '+' : ''}{formatDecimal(result.expectedValue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
          </div>

          {/* 分析结论 */}
          <div style={{
            marginTop: '4rem',
            padding: '2rem 0',
            borderTop: '1px solid rgba(100, 100, 100, 0.1)'
          }}>
            <div style={{ 
              fontSize: '0.7rem', 
              fontWeight: '400', 
              color: '#666',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              marginBottom: '2rem'
            }}>
              分析結論
            </div>
            {(() => {
              const actualStrategy = comparisonResults.find(r => r.isActual)
              const bestProfit = comparisonResults.reduce((max, r) => r.netProfit > max.netProfit ? r : max, comparisonResults[0])
              const bestRate = comparisonResults.reduce((max, r) => r.returnRate > max.returnRate ? r : max, comparisonResults[0])
              const bestExpected = comparisonResults.reduce((max, r) => r.expectedValue > max.expectedValue ? r : max, comparisonResults[0])

              return (
                <div style={{ fontSize: '0.75rem', lineHeight: '2.2', color: '#4a4a4a', fontWeight: '300' }}>
                  {actualStrategy && (
                    <>
                      <div style={{ opacity: '0.8' }}>您的實際策略（{actualStrategy.group}，{formatNumber(actualStrategy.sharesApplied)}股）</div>
                      <div style={{ paddingLeft: '1.2rem', color: '#777', fontSize: '0.72rem' }}>
                        {actualStrategy.ownCapital > 0 && (
                          <>本金 <strong>HKD {formatDecimal(actualStrategy.ownCapital)}</strong>，</>
                        )}
                        收益率 <strong style={{ color: '#059669' }}>{formatDecimal(actualStrategy.returnRate)}%</strong>，
                        淨收益 <strong style={{ color: '#059669' }}>HKD {formatDecimal(actualStrategy.netProfit)}</strong>
                        {actualStrategy.financingCost > 0 && (
                          <>（融資成本 HKD {formatDecimal(actualStrategy.financingCost)}）</>
                        )}
                      </div>
                    </>
                  )}
                  
                  <div style={{ marginTop: '1.2rem', opacity: '0.8' }}>最高收益率策略：<strong>{bestRate.group}</strong>（{formatNumber(bestRate.sharesApplied)}股）· {formatDecimal(bestRate.returnRate)}%
                    {bestRate.ownCapital > 0 && (
                      <span style={{ fontSize: '0.68rem', color: '#999', marginLeft: '0.5rem' }}>需本金 HKD {formatDecimal(bestRate.ownCapital)}</span>
                    )}
                  </div>
                  
                  <div style={{ opacity: '0.8' }}>最高絕對收益策略：<strong>{bestProfit.group}</strong>（{formatNumber(bestProfit.sharesApplied)}股）· HKD {formatDecimal(bestProfit.netProfit)}
                    {bestProfit.ownCapital > 0 && (
                      <span style={{ fontSize: '0.68rem', color: '#999', marginLeft: '0.5rem' }}>需本金 HKD {formatDecimal(bestProfit.ownCapital)}</span>
                    )}
                  </div>
                  
                  <div style={{ opacity: '0.8' }}>最高數學期望策略：<strong>{bestExpected.group}</strong>（{formatNumber(bestExpected.sharesApplied)}股）· HKD {formatDecimal(bestExpected.expectedValue)}
                    {bestExpected.ownCapital > 0 && (
                      <span style={{ fontSize: '0.68rem', color: '#999', marginLeft: '0.5rem' }}>需本金 HKD {formatDecimal(bestExpected.ownCapital)}</span>
                    )}
                  </div>
                  
                  {actualStrategy && bestProfit.group !== actualStrategy.group && (
                    <div style={{ 
                      marginTop: '2rem', 
                      padding: '1.5rem 0', 
                      borderTop: '1px solid rgba(100, 100, 100, 0.08)',
                      fontSize: '0.72rem',
                      opacity: '0.7'
                    }}>
                      <div style={{ 
                        fontSize: '0.68rem',
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        color: '#777',
                        marginBottom: '1rem'
                      }}>
                        策略建議（10倍融資假設）
                      </div>
                      <div style={{ marginBottom: '0.8rem', opacity: '0.9' }}>
                        如選擇 {bestProfit.group}（{formatNumber(bestProfit.sharesApplied)}股），相比您的實際策略：
                      </div>
                      <div style={{ paddingLeft: '1rem', marginTop: '0.3rem' }}>
                        • 需要本金：<strong style={{ color: '#3b82f6' }}>HKD {formatDecimal(bestProfit.ownCapital)}</strong>
                        {actualStrategy.ownCapital > 0 && (
                          <> (比實際多 HKD {formatDecimal(bestProfit.ownCapital - actualStrategy.ownCapital)})</>
                        )}
                      </div>
                      <div style={{ paddingLeft: '1rem' }}>
                        • 融資金額：<strong style={{ color: '#3b82f6' }}>HKD {formatDecimal(bestProfit.financingAmount)}</strong>
                      </div>
                      <div style={{ paddingLeft: '1rem' }}>
                        • 融資成本：<strong style={{ color: '#ef4444' }}>HKD {formatDecimal(bestProfit.financingCost)}</strong>
                      </div>
                      <div style={{ paddingLeft: '1rem' }}>
                        • 額外淨收益：<strong style={{ color: '#22c55e' }}>+HKD {formatDecimal(bestProfit.netProfit - actualStrategy.netProfit)}</strong>
                        （{formatDecimal(((bestProfit.netProfit - actualStrategy.netProfit) / Math.abs(actualStrategy.netProfit)) * 100)}%）
                      </div>
                      <div style={{ paddingLeft: '1rem' }}>
                        • 收益率對比：{formatDecimal(actualStrategy.returnRate)}% → <strong style={{ color: '#22c55e' }}>{formatDecimal(bestProfit.returnRate)}%</strong>
                      </div>
                    </div>
                  )}
                </div>
              )
            })()}
          </div>

          <div style={{ 
            marginTop: '3rem', 
            padding: '1.5rem 0', 
            borderTop: '1px solid rgba(100, 100, 100, 0.08)',
            fontSize: '0.68rem',
            lineHeight: '2',
            opacity: '0.5',
            fontWeight: '300'
          }}>
            <div style={{
              fontSize: '0.65rem',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              marginBottom: '1rem',
              color: '#777'
            }}>
              計算說明（10倍融資假設）
            </div>
            <div>• 中籤股數 = (配發比例 × 有效申購人數 × 申請股數) / 中籤人數</div>
            <div>• 本金 = 申請股數 × 發行價 / 10（假設10倍槓桿）</div>
            <div>• 融資金額 = 申請股數 × 發行價 × 0.9（90%融資）</div>
            <div>• 融資成本 = 融資金額 × 年利率 × (持有天數 / 365)</div>
            <div>• 收益率 = 淨收益 / 本金 × 100%（基於本金，非申購總額）</div>
            <div>• 數學期望 = 中籤股數 × (賣出價 - 發行價) - 總費用</div>
            <div>• 打和點 = (發行價×股數 + 所有費用) / (股數 × (1 - 賣出費率))</div>
          </div>
        </div>
    )}
    </>
  )
}

export default PostCalculator
