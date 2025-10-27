import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Calculator from './components/Calculator'
import PostCalculator from './components/PostCalculator'
import StockTable from './components/StockTable'
import StockDetail from './components/StockDetail'
import './App.css'

function HomePage() {
  return (
    <>
      {/* 导航栏 */}
      <nav className="nav-bar">
        <div className="nav-left">打新計算器</div>
        <div className="nav-right">
          <a href="#calculator" className="nav-link">收益預測</a>
          <a href="#post-calculator" className="nav-link">收益驗證</a>
          <a href="#stocks" className="nav-link">新股數據</a>
          <a href="#info" className="nav-link">說明</a>
        </div>
      </nav>

      {/* 主容器 */}
      <div className="main-container">
        {/* 巨大标题 */}
        <h1 className="hero-title">
          IPO<br/>CALCULATOR
        </h1>

        {/* 计算器部分 - 事前预测 */}
        <section id="calculator">
          <Calculator />
        </section>

        {/* 收益验证计算器 - 事后验证 */}
        <section id="post-calculator" style={{ marginTop: '4rem' }}>
          <PostCalculator />
        </section>

        {/* 新股数据表格 */}
        <section id="stocks">
          <StockTable />
        </section>

        {/* 底部说明 */}
        <section id="info" style={{ 
          maxWidth: '800px', 
          margin: '8rem auto 4rem auto', 
          textAlign: 'center',
          fontSize: '0.85rem',
          lineHeight: '2',
          opacity: '0.6',
          letterSpacing: '0.05em'
        }}>
          <p>
            專為香港新股申購設計的收益計算工具。
          </p>
          <p style={{ marginTop: '1rem' }}>
            輸入您的資金與費率，即可快速計算打和點與期望收益。
          </p>
          <p style={{ marginTop: '2rem', fontSize: '0.7rem', opacity: '0.5' }}>
            數據每30秒自動更新 · 連接實時數據庫
          </p>
        </section>
      </div>
    </>
  )
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/stock/:stockCode" element={<StockDetail />} />
      </Routes>
    </Router>
  )
}

export default App
