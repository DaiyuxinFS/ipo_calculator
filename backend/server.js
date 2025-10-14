const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3001;

// 中间件
app.use(cors());
app.use(express.json());

// PostgreSQL 连接池 - 连接到 daxin 数据库
const pool = new Pool({
  connectionString: 'postgresql://root:1m3s2R7xe6LlSYJ0fq8oVKTk5Ny4P9Fu@sjc1.clusters.zeabur.com:31080/daxin'
  // 不使用SSL连接
});

// 测试数据库连接
pool.connect((err, client, release) => {
  if (err) {
    console.error('数据库连接错误:', err.stack);
  } else {
    console.log('数据库连接成功');
    release();
  }
});

// 获取新股数据的API
app.get('/api/stocks', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT * FROM 招股书
      ORDER BY 申购截止日期 DESC
    `);
    res.json(result.rows);
  } catch (error) {
    console.error('查询错误:', error);
    res.status(500).json({ error: '获取数据失败', details: error.message });
  }
});

// 获取股票详情（档位&申购详情）
app.get('/api/stock-details/:stockCode', async (req, res) => {
  try {
    const { stockCode } = req.params;
    console.log('获取股票详情，代码:', stockCode);

    // 1. 获取股票基本信息
    const stockInfoResult = await pool.query(
      'SELECT * FROM 招股书 WHERE "代码" = $1',
      [stockCode]
    );

    if (stockInfoResult.rows.length === 0) {
      return res.status(404).json({ error: '未找到该股票' });
    }

    const stockInfo = stockInfoResult.rows[0];
    const stockCodeValue = stockInfo.代码;

    // 2. 获取申购明细（根据股票代码匹配）
    const applyDetailsResult = await pool.query(
      'SELECT * FROM 申购明细 WHERE id = $1 ORDER BY shares_applied',
      [parseInt(stockCodeValue)]
    );

    // 3. 如果有申购明细数据，获取对应的配售结果
    let applyTiers = [];
    if (applyDetailsResult.rows.length > 0) {
      // 获取所有 match_key
      const matchKeys = applyDetailsResult.rows
        .map(row => row.match_key)
        .filter(key => key); // 过滤掉空值

      if (matchKeys.length > 0) {
        // 查询 apply_tiers 表
        const applyTiersResult = await pool.query(
          'SELECT * FROM apply_tiers WHERE match_key = ANY($1::text[])',
          [matchKeys]
        );
        applyTiers = applyTiersResult.rows;
      }
    }

    res.json({
      stockInfo,
      applyDetails: applyDetailsResult.rows,
      applyTiers
    });
  } catch (error) {
    console.error('查询详情错误:', error);
    res.status(500).json({ error: '获取详情失败', details: error.message });
  }
});

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`后端服务器运行在 http://localhost:${PORT}`);
});

