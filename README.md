# 打新计算器 IPO Calculator

一个现代化的新股申购收益计算器，集成实时新股数据展示功能。

![打新计算器](https://img.shields.io/badge/IPO-Calculator-purple)
![React](https://img.shields.io/badge/React-18.2-blue)
![Node.js](https://img.shields.io/badge/Node.js-Express-green)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Database-blue)

## ✨ 功能特点

- 💰 **打新收益计算器**
  - 输入申购资金和手续费率
  - 自动计算打和点（收回成本所需涨幅）
  - 计算期望收益（基于历史数据）
  - 显示手续费成本

- 📊 **新股数据实时展示**
  - 连接 PostgreSQL 数据库
  - 自动刷新（每30秒）
  - 显示完整的新股招股书数据
  - 美观的表格展示

- 🎨 **现代化UI设计**
  - 渐变色背景
  - 响应式设计（支持手机、平板、电脑）
  - 流畅的动画效果
  - Tailwind CSS 样式

## 📦 技术栈

### 前端
- React 18.2
- Vite（构建工具）
- Tailwind CSS（样式）
- Axios（HTTP请求）

### 后端
- Node.js
- Express
- PostgreSQL（pg库）
- CORS

## 🚀 快速开始

### 前置要求

- Node.js 16+
- npm 或 yarn
- PostgreSQL 数据库（已配置）

### 安装步骤

1. **克隆项目**
   ```bash
   cd 打新计算器
   ```

2. **安装后端依赖**
   ```bash
   cd backend
   npm install
   ```

3. **安装前端依赖**
   ```bash
   cd ../frontend
   npm install
   ```

### 运行项目

1. **启动后端服务器**
   ```bash
   cd backend
   npm start
   ```
   后端将运行在 `http://localhost:3001`

2. **启动前端开发服务器**（新终端窗口）
   ```bash
   cd frontend
   npm run dev
   ```
   前端将运行在 `http://localhost:3000`

3. **访问应用**
   打开浏览器访问 `http://localhost:3000`

## 📂 项目结构

```
打新计算器/
├── backend/                 # 后端服务
│   ├── server.js           # Express 服务器
│   └── package.json        # 后端依赖
│
├── frontend/               # 前端应用
│   ├── src/
│   │   ├── components/    # React 组件
│   │   │   ├── Calculator.jsx    # 计算器组件
│   │   │   └── StockTable.jsx    # 数据表格组件
│   │   ├── App.jsx        # 主应用组件
│   │   ├── main.jsx       # 入口文件
│   │   └── index.css      # 全局样式
│   ├── index.html         # HTML 模板
│   ├── vite.config.js     # Vite 配置
│   ├── tailwind.config.js # Tailwind 配置
│   └── package.json       # 前端依赖
│
└── README.md              # 项目文档
```

## 🔧 配置说明

### 数据库配置

后端服务器已配置连接到 Zeabur PostgreSQL 数据库：
- 数据库名：`zeabur`
- 表名：`招股书数据`
- 连接已在 `backend/server.js` 中设置

如需修改数据库连接，请编辑 `backend/server.js` 中的连接字符串。

### 自动刷新设置

数据表格默认每30秒自动刷新一次。如需修改刷新间隔，请编辑 `frontend/src/components/StockTable.jsx` 中的 `interval` 值（单位：毫秒）。

## 📱 功能说明

### 打新计算器

1. 输入申购资金金额（港币）
2. 输入手续费率（百分比，默认0.05%）
3. 点击"计算收益"按钮
4. 查看结果：
   - **打和点**：需要上涨的百分比才能收回成本
   - **期望收益**：基于10%平均涨幅和1%中签率的预期收益
   - **手续费成本**：申购产生的总费用

### 新股数据表格

- 显示所有招股书数据
- 包含股票名称、代码、申购日期、定价等信息
- 支持手动刷新
- 数据自动更新

## 🎨 UI 特性

- **渐变背景**：紫色到靛蓝的优雅渐变
- **卡片设计**：圆角、阴影效果
- **响应式布局**：自动适配不同屏幕尺寸
- **交互反馈**：按钮悬停效果、加载动画
- **数据可视化**：清晰的结果展示

## 🔒 安全提示

⚠️ **重要：** 数据库连接字符串包含敏感信息，在生产环境中应使用环境变量：

```javascript
// 推荐做法
const connectionString = process.env.DATABASE_URL || '默认连接字符串'
```

## 📈 未来改进

- [ ] 添加用户认证
- [ ] 支持多种计算模式
- [ ] 历史收益分析
- [ ] 导出数据功能
- [ ] 移动端 APP
- [ ] 实时通知功能

## 🤝 贡献

欢迎提交 Issues 和 Pull Requests！

## 📄 许可证

MIT License

---

**开发者提示：** 首次运行前请确保数据库中存在 `招股书数据` 表，并且包含所需的列字段。

