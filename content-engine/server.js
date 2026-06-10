/**
 * Synapse Content Engine v13 — Refactored
 * 模块化架构:  services (AI/缓存) → routes (API) → config (配置)
 * 参考: Express标准模式 + MediaCrawler Adapter模式
 */
const express = require('express');
const { setupRoutes } = require('./server/routes');

process.on('uncaughtException', function(err) { console.error('UNCAUGHT:', err.message); });
process.on('unhandledRejection', function(err) { console.error('REJECTION:', err.message); });

const app = express();
app.use(express.json({ limit: '1mb' }));
app.use(function(req, res, next) { res.header('Access-Control-Allow-Origin', '*'); res.header('Access-Control-Allow-Methods', 'GET,POST,OPTIONS'); res.header('Access-Control-Allow-Headers', 'Content-Type'); if (req.method === 'OPTIONS') return res.sendStatus(200); next(); });

setupRoutes(app);

const PORT = 3099;
app.listen(PORT, function() {
  console.log('  Synapse Content Engine v13 Refactored');
  console.log('  灵枢 · 多平台内容引擎');
  console.log('  http://localhost:' + PORT);
  console.log('  Modules: server/services.js | server/routes.js | server/config.js');
});
