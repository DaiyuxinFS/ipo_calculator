import { useState } from 'react'

function Calculator() {
  const [capital, setCapital] = useState('')
  const [feeRate, setFeeRate] = useState('0.05')
  const [results, setResults] = useState(null)

  const calculateResults = () => {
    const capitalAmount = parseFloat(capital)
    const rate = parseFloat(feeRate) / 100

    if (isNaN(capitalAmount) || capitalAmount <= 0) {
      alert('請輸入有效的資金金額')
      return
    }

    const breakEvenPoint = ((1 + rate) - 1) * 100
    const avgIncrease = 0.10
    const winRate = 0.01
    const expectedReturn = capitalAmount * avgIncrease * winRate - (capitalAmount * rate)

    setResults({
      breakEvenPoint: breakEvenPoint.toFixed(2),
      expectedReturn: expectedReturn.toFixed(2),
      totalCost: (capitalAmount * rate).toFixed(2)
    })
  }

  const handleReset = () => {
    setCapital('')
    setFeeRate('0.05')
    setResults(null)
  }

  return (
    <div className="calculator-section">
      <h2 className="section-title">收益計算</h2>
      
      <div className="input-group">
        <label className="input-label">申購資金 (HKD)</label>
        <input
          type="number"
          value={capital}
          onChange={(e) => setCapital(e.target.value)}
          placeholder="輸入金額"
          className="input-field"
        />
      </div>

      <div className="input-group">
        <label className="input-label">手續費率 (%)</label>
        <input
          type="number"
          value={feeRate}
          onChange={(e) => setFeeRate(e.target.value)}
          step="0.01"
          placeholder="0.05"
          className="input-field"
        />
      </div>

      <div className="button-group">
        <button onClick={calculateResults} className="btn btn-primary">
          計算
        </button>
        <button onClick={handleReset} className="btn">
          重置
        </button>
      </div>

      {results && (
        <div className="results-container">
          <div className="result-grid">
            <div className="result-item">
              <div className="result-label">打和點</div>
              <div className="result-value">{results.breakEvenPoint}%</div>
              <div className="result-hint">需要上漲的百分比</div>
            </div>

            <div className="result-item">
              <div className="result-label">期望收益</div>
              <div className="result-value" style={{ 
                color: parseFloat(results.expectedReturn) >= 0 ? 'inherit' : '#c44' 
              }}>
                {results.expectedReturn}
              </div>
              <div className="result-hint">基於歷史數據估算</div>
            </div>

            <div className="result-item">
              <div className="result-label">手續費成本</div>
              <div className="result-value">{results.totalCost}</div>
              <div className="result-hint">申購產生的費用</div>
            </div>
          </div>

          <div style={{ 
            marginTop: '2rem', 
            padding: '1.5rem', 
            border: '1px solid rgba(0,0,0,0.1)',
            fontSize: '0.75rem',
            lineHeight: '1.8',
            opacity: '0.7'
          }}>
            <strong>說明：</strong>實際收益會受中籤率、上市首日漲幅等多種因素影響。
            以上計算假設10%平均漲幅和1%中籤率，僅供參考。
          </div>
        </div>
      )}
    </div>
  )
}

export default Calculator
