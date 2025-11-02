import { useState, useEffect } from 'react'
import axios from 'axios'

function Calculator() {
  // 基础设置
  const [ownCapital, setOwnCapital] = useState('') // 本金（自有资金）
  const [useFinancing, setUseFinancing] = useState(false) // 是否使用融资
  const [financingMultiple, setFinancingMultiple] = useState('10') // 融资倍数
  const [financingRate, setFinancingRate] = useState('5') // 融资年利率
  const [holdingDays, setHoldingDays] = useState('7') // 持有天数
  
  // 方案管理
  const [plans, setPlans] = useState([
    { id: 1, name: '方案A', ipos: [] }
  ])
  const [activePlanId, setActivePlanId] = useState(1)
  
  // IPO列表
  const [stockList, setStockList] = useState([])
  
  // 结果
  const [comparisonResults, setComparisonResults] = useState(null)

  // 获取股票列表
  useEffect(() => {
    const fetchStocks = async () => {
      try {
        const response = await axios.get('/api/stocks')
        setStockList(response.data)
      } catch (error) {
        console.error('获取股票列表失败:', error)
      }
    }
    fetchStocks()
  }, [])

  // 计算总可用资金
  const getTotalCapital = () => {
    const own = parseFloat(ownCapital) || 0
    if (!useFinancing) return own
    const multiple = parseFloat(financingMultiple) || 1
    return own * multiple
  }

  // 添加新方案
  const addPlan = () => {
    const newId = Math.max(...plans.map(p => p.id)) + 1
    setPlans([...plans, { 
      id: newId, 
      name: `方案${String.fromCharCode(65 + plans.length)}`, 
      ipos: [] 
    }])
  }

  // 删除方案
  const removePlan = (planId) => {
    if (plans.length <= 1) {
      alert('至少保留一個方案')
      return
    }
    setPlans(plans.filter(p => p.id !== planId))
    if (activePlanId === planId) {
      setActivePlanId(plans[0].id)
    }
  }

  // 添加IPO到当前方案
  const addIPOToPlan = (planId) => {
    setPlans(plans.map(plan => {
      if (plan.id === planId) {
        const newIPO = {
          id: Date.now(),
          stockCode: '',
          stockName: '',
          sharesApplied: '',
          issuePrice: '',
          allocationRate: '100', // 中签率
          allocatedShares: '', // 实际中签股数
          expectedGain: '10' // 预期涨幅
        }
        return { ...plan, ipos: [...plan.ipos, newIPO] }
      }
      return plan
    }))
  }

  // 删除IPO
  const removeIPO = (planId, ipoId) => {
    setPlans(plans.map(plan => {
      if (plan.id === planId) {
        return { ...plan, ipos: plan.ipos.filter(ipo => ipo.id !== ipoId) }
      }
      return plan
    }))
  }

  // 更新IPO数据
  const updateIPO = (planId, ipoId, field, value) => {
    setPlans(plans.map(plan => {
      if (plan.id === planId) {
        return {
          ...plan,
          ipos: plan.ipos.map(ipo => {
            if (ipo.id === ipoId) {
              const updated = { ...ipo, [field]: value }
              
              // 如果选择了股票代码，自动填充名称和发行价
              if (field === 'stockCode') {
                const stock = stockList.find(s => s.代码 === value)
                if (stock) {
                  updated.stockName = stock.公司名称 || stock.名称 || ''
                  updated.issuePrice = stock.发行价 || stock.招股定价上限 || ''
                }
              }
              
              return updated
            }
            return ipo
          })
        }
      }
      return plan
    }))
  }

  // 计算单个方案的收益
  const calculatePlanReturn = (plan) => {
    const own = parseFloat(ownCapital) || 0
    const totalAvailable = getTotalCapital()
    
    let totalCapitalUsed = 0
    let totalExpectedProfit = 0
    
    const ipoResults = plan.ipos.map(ipo => {
      const shares = parseFloat(ipo.sharesApplied) || 0
      const price = parseFloat(ipo.issuePrice) || 0
      const allocRate = parseFloat(ipo.allocationRate) || 0
      const allocShares = parseFloat(ipo.allocatedShares) || 0
      const gain = parseFloat(ipo.expectedGain) || 0
      
      const capitalUsed = shares * price
      const expectedGrossProfit = allocShares * price * (gain / 100) * (allocRate / 100)
      
      // 计算该IPO的融资成本
      let ipoFinancingCost = 0
      if (useFinancing) {
        const multiple = parseFloat(financingMultiple) || 1
        const ownCapital = capitalUsed / multiple
        const financingAmount = capitalUsed - ownCapital
        const rate = parseFloat(financingRate) / 100
        const days = parseFloat(holdingDays) || 0
        ipoFinancingCost = financingAmount * (rate / 365) * days
      }
      
      // 期望净收益 = 期望毛利润 - 融资成本
      const expectedNetProfit = expectedGrossProfit - ipoFinancingCost
      
      totalCapitalUsed += capitalUsed
      totalExpectedProfit += expectedNetProfit
      
      return {
        stockName: ipo.stockName || ipo.stockCode,
        capitalUsed,
        expectedGrossProfit,
        ipoFinancingCost,
        expectedNetProfit
      }
    })
    
    // 计算总融资金额（用于显示）
    let totalFinancingAmount = 0
    let totalFinancingCost = 0
    
    if (useFinancing) {
      const multiple = parseFloat(financingMultiple) || 1
      const totalOwnCapital = totalCapitalUsed / multiple
      totalFinancingAmount = totalCapitalUsed - totalOwnCapital
      
      // 融资成本已经在各个IPO中计算并累加到totalExpectedProfit了
      totalFinancingCost = ipoResults.reduce((sum, ipo) => sum + ipo.ipoFinancingCost, 0)
    }
    
    // totalExpectedProfit 已经是净收益（扣除了融资成本）
    const netProfit = totalExpectedProfit
    const returnRate = own > 0 ? (netProfit / own) * 100 : 0
    
    return {
      planName: plan.name,
      totalCapitalUsed,
      totalExpectedProfit,
      financingAmount: totalFinancingAmount,
      financingCost: totalFinancingCost,
      netProfit,
      returnRate,
      ipoResults,
      isValid: totalCapitalUsed <= totalAvailable && totalCapitalUsed > 0
    }
  }

  // 计算并对比所有方案
  const calculateAllPlans = () => {
    if (!ownCapital || parseFloat(ownCapital) <= 0) {
      alert('請輸入有效的本金金額')
      return
    }
    
    // 检查是否有方案配置了IPO
    const plansWithIPOs = plans.filter(plan => plan.ipos.length > 0)
    if (plansWithIPOs.length === 0) {
      alert('請至少為一個方案添加IPO配置')
      return
    }
    
    const results = plans.map(plan => calculatePlanReturn(plan))
    const validResults = results.filter(r => r.isValid)
    
    if (validResults.length === 0) {
      // 给出更详细的错误提示
      const invalidReasons = results.map(r => {
        if (r.totalCapitalUsed === 0) {
          return `${r.planName}: 未配置IPO或數據不完整`
        }
        if (r.totalCapitalUsed > getTotalCapital()) {
          return `${r.planName}: 總投入 ${formatNumber(r.totalCapitalUsed)} 超過可用資金 ${formatNumber(getTotalCapital())}`
        }
        return `${r.planName}: 未知錯誤`
      }).join('\n')
      
      alert(`所有方案都無效：\n\n${invalidReasons}\n\n請檢查配置後重試`)
      return
    }

    const bestPlan = validResults.reduce((best, current) => 
      current.returnRate > best.returnRate ? current : best
    )
    
    setComparisonResults({
      results: validResults,
      bestPlan: bestPlan.planName,
      totalCapital: getTotalCapital(),
      ownCapital: parseFloat(ownCapital)
    })
  }

  const handleReset = () => {
    setOwnCapital('')
    setUseFinancing(false)
    setFinancingMultiple('10')
    setFinancingRate('5')
    setHoldingDays('7')
    setPlans([{ id: 1, name: '方案A', ipos: [] }])
    setActivePlanId(1)
    setComparisonResults(null)
  }

  const formatNumber = (num) => {
    return new Intl.NumberFormat('zh-HK').format(num)
  }

  const activePlan = plans.find(p => p.id === activePlanId)

  return (
    <div className="calculator-section">
      <h2 className="section-title">收益計算（事前預測）</h2>
      <div style={{ 
        fontSize: '0.72rem', 
        color: '#999', 
        textAlign: 'center',
        marginTop: '-1rem',
        marginBottom: '2rem',
        fontWeight: '300'
      }}>
        多方案組合對比工具
      </div>
      
      {/* 基础设置 */}
      <div style={{ 
        padding: '1.5rem', 
        background: 'rgba(100,100,100,0.02)', 
        borderRadius: '8px',
        marginBottom: '2rem'
      }}>
        <div style={{ 
          fontSize: '0.7rem', 
          fontWeight: '400', 
          color: '#666',
          marginBottom: '1rem',
          letterSpacing: '0.08em',
          textTransform: 'uppercase'
        }}>
          資金設定
        </div>
        
        <div className="post-calc-grid">
          <div className="input-group">
            <label className="input-label">本金 (HKD)</label>
            <input
              type="number"
              value={ownCapital}
              onChange={(e) => setOwnCapital(e.target.value)}
              placeholder="自有資金"
              className="input-field"
            />
          </div>

          <div className="input-group">
            <label className="input-label">
              <input
                type="checkbox"
                checked={useFinancing}
                onChange={(e) => setUseFinancing(e.target.checked)}
                style={{ marginRight: '0.5rem' }}
              />
              使用融資
            </label>
          </div>

          {useFinancing && (
            <>
              <div className="input-group">
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
      
      <div className="input-group">
                <label className="input-label">融資年利率 (%)</label>
        <input
          type="number"
                  value={financingRate}
                  onChange={(e) => setFinancingRate(e.target.value)}
                  step="0.1"
          className="input-field"
        />
      </div>

      <div className="input-group">
                <label className="input-label">持有天數</label>
                <input
                  type="number"
                  value={holdingDays}
                  onChange={(e) => setHoldingDays(e.target.value)}
                  className="input-field"
                />
              </div>
            </>
          )}
        </div>

        {ownCapital && (
          <div style={{ 
            marginTop: '1rem', 
            fontSize: '0.72rem', 
            color: '#666',
            padding: '0.8rem',
            background: 'rgba(100,150,100,0.05)',
            borderRadius: '4px'
          }}>
            總可用資金：<strong>HKD {formatNumber(getTotalCapital())}</strong>
            {useFinancing && (
              <span style={{ marginLeft: '1rem', color: '#999' }}>
                （本金 × {financingMultiple}倍）
              </span>
            )}
          </div>
        )}
      </div>

      {/* 方案选择 */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          {plans.map(plan => (
            <button
              key={plan.id}
              onClick={() => setActivePlanId(plan.id)}
              style={{
                padding: '0.5rem 1rem',
                border: activePlanId === plan.id ? '2px solid #4a4a4a' : '1px solid rgba(0,0,0,0.1)',
                background: activePlanId === plan.id ? 'rgba(100,100,100,0.05)' : 'transparent',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.72rem',
                fontWeight: activePlanId === plan.id ? '500' : '300',
                position: 'relative'
              }}
            >
              {plan.name}
              {plan.ipos.length > 0 && (
                <span style={{ 
                  marginLeft: '0.3rem', 
                  fontSize: '0.65rem', 
                  color: '#999' 
                }}>
                  ({plan.ipos.length})
                </span>
              )}
              {plans.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    removePlan(plan.id)
                  }}
                  style={{
                    marginLeft: '0.5rem',
                    color: '#c44',
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    fontSize: '0.9rem'
                  }}
                >
                  ×
                </button>
              )}
            </button>
          ))}
          <button
            onClick={addPlan}
            style={{
              padding: '0.5rem 1rem',
              border: '1px dashed rgba(0,0,0,0.2)',
              background: 'transparent',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '0.72rem',
              color: '#666'
            }}
          >
            + 新增方案
          </button>
        </div>
      </div>

      {/* IPO配置 */}
      {activePlan && (
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ 
            fontSize: '0.7rem', 
            fontWeight: '400', 
            color: '#666',
            marginBottom: '1rem',
            letterSpacing: '0.08em',
            textTransform: 'uppercase'
          }}>
            {activePlan.name} - IPO配置
          </div>

          {activePlan.ipos.map((ipo, index) => (
            <div 
              key={ipo.id}
              style={{
                padding: '1.2rem',
                border: '1px solid rgba(0,0,0,0.08)',
                borderRadius: '6px',
                marginBottom: '1rem',
                background: 'rgba(100,100,100,0.01)'
              }}
            >
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '1rem'
              }}>
                <span style={{ fontSize: '0.7rem', color: '#666' }}>
                  IPO #{index + 1}
                </span>
                <button
                  onClick={() => removeIPO(activePlan.id, ipo.id)}
                  style={{
                    color: '#c44',
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    fontSize: '0.75rem'
                  }}
                >
                  删除
                </button>
              </div>

              <div className="post-calc-grid">
                <div className="input-group">
                  <label className="input-label">IPO代碼</label>
                  <input
                    type="text"
                    list={`stock-list-${ipo.id}`}
                    value={ipo.stockCode}
                    onChange={(e) => updateIPO(activePlan.id, ipo.id, 'stockCode', e.target.value)}
                    placeholder="選擇或輸入"
                    className="input-field"
                  />
                  <datalist id={`stock-list-${ipo.id}`}>
                    {stockList.map(stock => (
                      <option key={stock.代码} value={stock.代码}>
                        {stock.公司名称 || stock.名称}
                      </option>
                    ))}
                  </datalist>
                </div>

                <div className="input-group">
                  <label className="input-label">公司名稱</label>
                  <input
                    type="text"
                    value={ipo.stockName}
                    onChange={(e) => updateIPO(activePlan.id, ipo.id, 'stockName', e.target.value)}
                    placeholder="自動填充"
                    className="input-field"
                  />
                </div>

                <div className="input-group">
                  <label className="input-label">申購股數</label>
                  <input
                    type="number"
                    value={ipo.sharesApplied}
                    onChange={(e) => updateIPO(activePlan.id, ipo.id, 'sharesApplied', e.target.value)}
                    placeholder="40000"
                    className="input-field"
                  />
                </div>

                <div className="input-group">
                  <label className="input-label">發行價 (HKD)</label>
        <input
          type="number"
                    value={ipo.issuePrice}
                    onChange={(e) => updateIPO(activePlan.id, ipo.id, 'issuePrice', e.target.value)}
          step="0.01"
                    placeholder="25.00"
                    className="input-field"
                  />
                </div>

                <div className="input-group">
                  <label className="input-label">預估中籤率 (%)</label>
                  <input
                    type="number"
                    value={ipo.allocationRate}
                    onChange={(e) => updateIPO(activePlan.id, ipo.id, 'allocationRate', e.target.value)}
                    step="1"
                    placeholder="100"
                    className="input-field"
                  />
                </div>

                <div className="input-group">
                  <label className="input-label">預估中籤股數</label>
                  <input
                    type="number"
                    value={ipo.allocatedShares}
                    onChange={(e) => updateIPO(activePlan.id, ipo.id, 'allocatedShares', e.target.value)}
                    placeholder="500"
          className="input-field"
        />
      </div>

                <div className="input-group">
                  <label className="input-label">預期漲幅 (%)</label>
                  <input
                    type="number"
                    value={ipo.expectedGain}
                    onChange={(e) => updateIPO(activePlan.id, ipo.id, 'expectedGain', e.target.value)}
                    step="0.1"
                    placeholder="10"
                    className="input-field"
                  />
                </div>
              </div>
            </div>
          ))}

          <button
            onClick={() => addIPOToPlan(activePlan.id)}
            style={{
              width: '100%',
              padding: '0.8rem',
              border: '1px dashed rgba(0,0,0,0.2)',
              background: 'transparent',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.72rem',
              color: '#666'
            }}
          >
            + 添加IPO到此方案
          </button>
        </div>
      )}

      {/* 操作按钮 */}
      <div className="button-group">
        <button onClick={calculateAllPlans} className="btn btn-primary">
          計算 & 對比
        </button>
        <button onClick={handleReset} className="btn">
          重置
        </button>
      </div>

      {/* 对比结果 */}
      {comparisonResults && (
        <div style={{ marginTop: '3rem' }}>
          <div style={{
            fontSize: '0.7rem',
            fontWeight: '400',
            color: '#666',
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            marginBottom: '2rem',
            textAlign: 'center'
          }}>
            方案對比結果
            </div>

          <div style={{ marginBottom: '3rem' }}>
            <table className="comparison-table">
              <thead>
                <tr>
                  <th>方案</th>
                  <th>總投入<br/>(HKD)</th>
                  <th>融資金額<br/>(HKD)</th>
                  <th>融資成本<br/>(HKD)</th>
                  <th>期望收益<br/>(HKD)</th>
                  <th>淨收益<br/>(HKD)</th>
                  <th>收益率<br/>(%)</th>
                </tr>
              </thead>
              <tbody>
                {comparisonResults.results.map((result) => (
                  <tr 
                    key={result.planName}
                    className={result.planName === comparisonResults.bestPlan ? 'actual-strategy' : ''}
                  >
                    <td>
                      {result.planName}
                      {result.planName === comparisonResults.bestPlan && (
                        <span style={{ marginLeft: '0.5rem', color: '#22c55e' }}>⭐</span>
                      )}
                    </td>
                    <td>{formatNumber(result.totalCapitalUsed.toFixed(2))}</td>
                    <td>{formatNumber(result.financingAmount.toFixed(2))}</td>
                    <td style={{ color: '#c44' }}>
                      {result.financingCost > 0 ? '-' : ''}{formatNumber(result.financingCost.toFixed(2))}
                    </td>
                    <td>{formatNumber(result.totalExpectedProfit.toFixed(2))}</td>
                    <td style={{ 
                      color: result.netProfit >= 0 ? '#22c55e' : '#c44',
                      fontWeight: '500'
                    }}>
                      {result.netProfit >= 0 ? '+' : ''}{formatNumber(result.netProfit.toFixed(2))}
                    </td>
                    <td style={{ 
                      color: result.returnRate >= 0 ? '#22c55e' : '#c44',
                      fontWeight: '500'
                    }}>
                      {result.returnRate >= 0 ? '+' : ''}{result.returnRate.toFixed(2)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
              </div>

          {/* 分析结论 */}
          <div style={{
            padding: '2rem 0',
            borderTop: '1px solid rgba(100, 100, 100, 0.1)'
          }}>
            <div style={{ 
              fontSize: '0.7rem', 
              fontWeight: '400', 
              color: '#666',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              marginBottom: '1.5rem'
            }}>
              分析結論
            </div>
            <div style={{ fontSize: '0.75rem', lineHeight: '2.2', color: '#4a4a4a', fontWeight: '300' }}>
              {(() => {
                const best = comparisonResults.results.find(r => r.planName === comparisonResults.bestPlan)
                const others = comparisonResults.results.filter(r => r.planName !== comparisonResults.bestPlan)
                
                return (
                  <>
                    <div style={{ marginBottom: '1rem' }}>
                      • <strong style={{ color: '#22c55e' }}>{best.planName}</strong> 為最優方案，
                      預期淨收益 <strong>HKD {formatNumber(best.netProfit.toFixed(2))}</strong>，
                      收益率 <strong>{best.returnRate.toFixed(2)}%</strong>
            </div>

                    {others.length > 0 && others.map(other => {
                      const diff = best.netProfit - other.netProfit
                      const diffPct = ((diff / other.netProfit) * 100).toFixed(2)
                      return (
                        <div key={other.planName} style={{ marginBottom: '0.8rem' }}>
                          • 相比 {other.planName}，{best.planName} 多賺 
                          <strong> HKD {formatNumber(diff.toFixed(2))}</strong>
                          {diffPct !== 'Infinity' && diffPct !== 'NaN' && (
                            <span> ({diffPct > 0 ? '+' : ''}{diffPct}%)</span>
                          )}
                        </div>
                      )
                    })}

                    <div style={{ marginTop: '1.5rem', opacity: '0.7' }}>
                      • 本金：HKD {formatNumber(comparisonResults.ownCapital)}
                      {useFinancing && (
                        <span>，融資倍數：{financingMultiple}倍</span>
                      )}
                    </div>
                  </>
                )
              })()}
            </div>
          </div>

          <div style={{ 
            marginTop: '2rem', 
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
              計算說明
            </div>
            • 期望毛利潤 = 如中籤可獲股數 × 發行價 × 預期漲幅 × 預估中籤率<br/>
            • 融資成本 = 融資金額 × (年利率 / 365) × 持有天數<br/>
            • 期望淨收益 = 期望毛利潤 - 融資成本<br/>
            • 收益率 = 期望淨收益 / 本金 × 100%<br/>
            • 注意：融資成本無論中籤與否都需支付，已計入期望淨收益中<br/>
            • 以上計算僅供參考，實際收益會受市場波動、中籤率等多種因素影響
          </div>
        </div>
      )}
    </div>
  )
}

export default Calculator
