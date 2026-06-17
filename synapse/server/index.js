require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3099;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

// API 路由
const apiRoutes = require('./routes');
app.use('/api', apiRoutes);

// 前端 SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Synapse Phase 1 — M1+M2 running at http://localhost:${PORT}`);
  console.log(`  M1 API: /api/collect/*  /api/analyze*`);
  console.log(`  M2 API: /api/generate*  /api/format*`);
});
