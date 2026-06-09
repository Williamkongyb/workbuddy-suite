/**
 * Synapse Content Engine v3.0 — Server
 * 新增：5大内容分类 + 人设系统 + 多源热点 + 新增平台
 */

const http = require('http');
const https = require('https');
const url = require('url');
const fs = require('fs');
const path = require('path');
const { PLATFORMS, CATEGORIES, HOT_SOURCES } = require('./platforms.js');

const PORT = 3099;
const SF_API_KEY = 'sk-uvzcbywuncvtchdmxmoyehzouehoicmwcjdznkprufozrdpj';
const SF_API_BASE = 'https://api.siliconflow.cn/v1';
const MODEL = 'deepseek-ai/DeepSeek-V3';

function apiCall(endpoint, data) {
  return new Promise(function(resolve, reject) {
    var body = JSON.stringify(data);
    var u = url.parse(SF_API_BASE + endpoint);
    var opts = {
      hostname: u.hostname, port: 443, path: u.path, method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + SF_API_KEY,
        'Content-Length': Buffer.byteLength(body)
      }
    };
    var req = https.request(opts, function(res) {
      var chunks = [];
      res.on('data', function(c) { chunks.push(c); });
      res.on('end', function() {
        var text = Buffer.concat(chunks).toString();
        try { resolve(JSON.parse(text)); } catch(e) { resolve({ raw: text }); }
      });
    });
    req.on('error', function(e) { reject(e); });
    req.write(body); req.end();
  });
}

// ========== 热点抓取（AI 模拟全网搜索） ==========
async function fetchHotTopics(categoryKey) {
  var cat = CATEGORIES[categoryKey];
  if (!cat) return [];
  
  var sources = (cat.hotSources || []).join('、');
  var prompt = '你是一个人工智能热点监测系统。请模拟访问以下平台：' + sources + '\n\n' +
    '请列出今天【' + cat.name + '】领域最热门的前10个话题。\n' +
    '每个话题包含：标题（准确如平台原文）、热度评分（1-100）、来源平台、一句话简介。\n' +
    '输出JSON数组格式：[{"title":"...","score":95,"source":"微博热搜","brief":"..."}]\n' +
    '只输出JSON数组，不要其他内容。';
  
  var resp = await apiCall('/chat/completions', {
    model: MODEL, temperature: 0.5, max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }]
  });
  
  var content = resp.choices ? resp.choices[0].message.content : '';
  content = content.replace(/```(?:json)?\s*/g, '').replace(/```\s*/g, '').trim();
  try { return JSON.parse(content); } catch(e) {}
  var match = content.match(/\[[\s\S]*\]/);
  if (match) {
    try { return JSON.parse(match[0]); } catch(e) {}
  }
  return [];
}

// ========== 分类+人设驱动的调研 ==========
async function researchTopic(topic, categoryKey) {
  var cat = categoryKey ? CATEGORIES[categoryKey] : null;
  
  var prompt;
  if (cat) {
    prompt = '你是一位【' + cat.persona + '】（' + cat.personaTrait + '）。\n' +
      '⚠️ 只能围绕【' + topic + '】展开，绝对不讨论其他主题！\n' +
      '这是属于【' + cat.name + '】领域的内容。\n' +
      '内容要素要求：' + cat.contentElements + '\n\n' +
      '要求：列出这个话题下最有价值的5个角度，每个角度含3-5个核心观点和关键数据。\n' +
      '输出JSON数组：[{"angle":"...","keyPoints":[...],"facts":[...]}]\n只输出JSON数组。';
  } else {
    prompt = '请严格围绕【' + topic + '】进行全网调研。列出5个最有价值的角度，每个含核心观点和数据。\n' +
      '输出JSON数组：[{"angle":"...","keyPoints":[...],"facts":[...]}]\n只输出JSON。';
  }
  
  var resp = await apiCall('/chat/completions', {
    model: MODEL, temperature: 0.7, max_tokens: 2500,
    messages: [{ role: 'user', content: prompt }]
  });
  
  var content = resp.choices ? resp.choices[0].message.content : '';
  // 清理 markdown
  content = content.replace(/```(?:json)?\s*/g, '').replace(/```\s*/g, '').trim();
  // 尝试多种方式解析
  try { return JSON.parse(content); } catch(e) {}
  var match = content.match(/\[[\s\S]*\]/);
  if (match) {
    try { return JSON.parse(match[0]); } catch(e) {}
  }
  return { raw: content };
}

// ========== 平台内容生成（支持人设） ==========
async function generatePlatformContent(topic, platformKey, researchData, categoryKey) {
  var plat = PLATFORMS[platformKey];
  if (!plat) throw new Error('Unknown platform: ' + platformKey);
  
  var cat = categoryKey ? CATEGORIES[categoryKey] : null;
  
  var researchContext = '';
  if (researchData && Array.isArray(researchData)) {
    researchContext = researchData.map(function(item, i) {
      return '角度' + (i+1) + ': ' + item.angle + '\n核心观点: ' + (item.keyPoints || []).join('；') + '\n数据: ' + (item.facts || []).join('；');
    }).join('\n\n');
  } else if (researchData && researchData.raw) {
    researchContext = researchData.raw;
  }

  var personaPrompt = '';
  if (cat) {
    personaPrompt = '你的人设是【' + cat.persona + '】（' + cat.personaTrait + '）。用这个人设的风格来写。\n';
  }

  var prompt = '你是【' + plat.name + '】的爆款内容创作者。请严格围绕【' + topic + '】创作。\n' +
    personaPrompt + '\n' +
    '=== ' + plat.name + ' 平台规则 ===\n' +
    '风格：' + plat.rules.style + '\n字数：' + plat.rules.length + '\n' +
    '标题规则：' + plat.rules.title + '\n结构：' + plat.rules.structure + '\n' +
    '格式：' + plat.rules.format + '\n语气：' + plat.rules.tone + '\n' +
    (plat.rules.hashtags || '') + '\n' + (plat.rules.extras || '') + '\n\n' +
    '=== 调研数据 ===\n' + researchContext + '\n\n' +
    '=== 输出要求 ===\n' +
    '1. 第一行=标题，空行后=正文\n2. 正文达到平台字数要求\n3. 不用markdown标记\n4. 直接输出，不要开场白';

  var resp = await apiCall('/chat/completions', {
    model: MODEL, temperature: 0.8, max_tokens: 4000,
    messages: [{ role: 'user', content: prompt }]
  });
  
  var content = resp.choices ? resp.choices[0].message.content : '';
  content = content.replace(/^(好的|以下是|为您生成|好的，为您).*?[\n\r]+/i, '');
  content = content.replace(/\*\*(.+?)\*\*/g, '$1');
  content = content.replace(/##\s*/g, '');
  
  var lines = content.split('\n');
  var title = '', bodyStart = 0;
  for (var i = 0; i < lines.length; i++) {
    if (lines[i].trim().length > 0) { title = lines[i].trim(); bodyStart = i + 1; break; }
  }
  while (bodyStart < lines.length && lines[bodyStart].trim() === '') bodyStart++;
  var body = lines.slice(bodyStart).join('\n').trim();
  title = title.replace(/^标题[：:]\s*/i, '');
  
  return { title: title, body: body, full: content };
}

// ========== HTTP 服务器 ==========
function serveFile(res, filePath, contentType) {
  try {
    var content = fs.readFileSync(filePath, 'utf8');
    res.writeHead(200, { 'Content-Type': contentType + '; charset=utf-8' });
    res.end(content);
  } catch(e) {
    res.writeHead(404);
    res.end('Not found');
  }
}

var server = http.createServer(async function(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.writeHead(200); res.end(); return; }
  
  var p = url.parse(req.url, true);
  var pathname = p.pathname;
  console.log('[' + new Date().toISOString() + '] ' + req.method + ' ' + pathname);

  // === API: 生成内容（支持分类）===
  if (req.method === 'POST' && pathname === '/api/generate') {
    var chunks = [];
    req.on('data', function(c) { chunks.push(c); });
    req.on('end', async function() {
      try {
        var body = JSON.parse(Buffer.concat(chunks).toString());
        var topic = body.topic, platforms = body.platforms || [], category = body.category;
        if (!topic) { res.writeHead(400); res.end(JSON.stringify({ error: '请提供主题' })); return; }
        if (platforms.length === 0) { res.writeHead(400); res.end(JSON.stringify({ error: '请选择平台' })); return; }

        console.log('  研究: ' + topic + (category ? ' (' + category + ')' : ''));
        var research = await researchTopic(topic, category);
        
        var results = {};
        for (var i = 0; i < platforms.length; i++) {
          var pk = platforms[i];
          console.log('  生成: ' + (PLATFORMS[pk] ? PLATFORMS[pk].name : pk));
          results[pk] = await generatePlatformContent(topic, pk, research, category);
        }
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, topic: topic, research: research, platforms: results }));
      } catch(e) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // === API: 热点抓取 ===
  if (req.method === 'POST' && pathname === '/api/hot') {
    var chunks = [];
    req.on('data', function(c) { chunks.push(c); });
    req.on('end', async function() {
      try {
        var body = JSON.parse(Buffer.concat(chunks).toString());
        var category = body.category || 'hot_news';
        var topics = await fetchHotTopics(category);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, category: category, topics: topics }));
      } catch(e) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  // === API: 获取分类和平台 ===
  if (req.method === 'GET' && pathname === '/api/config') {
    var platforms = {}, categories = {};
    Object.keys(PLATFORMS).forEach(function(k) {
      platforms[k] = { name: PLATFORMS[k].name, icon: PLATFORMS[k].icon, color: PLATFORMS[k].color, description: PLATFORMS[k].description, format: PLATFORMS[k].format };
    });
    Object.keys(CATEGORIES).forEach(function(k) {
      categories[k] = { name: CATEGORIES[k].name, icon: CATEGORIES[k].icon, persona: CATEGORIES[k].persona, personaTrait: CATEGORIES[k].personaTrait, hotSources: CATEGORIES[k].hotSources, primaryPlatforms: CATEGORIES[k].primaryPlatforms };
    });
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ platforms: platforms, categories: categories, hotSources: HOT_SOURCES }));
    return;
  }

  if (req.method === 'GET' && pathname === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', name: 'Synapse Content Engine', version: '3.0.0' }));
    return;
  }

  // 静态文件
  var staticPath = pathname === '/' ? '/index.html' : pathname;
  var ext = path.extname(staticPath);
  var mimes = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json' };
  serveFile(res, path.join(__dirname, staticPath), mimes[ext] || 'text/plain');
});

server.listen(PORT, function() {
  console.log('  ╔══════════════════════════════════════╗');
  console.log('  ║  Synapse Content Engine v3.0       ║');
  console.log('  ║  灵枢 · 多平台内容引擎            ║');
  console.log('  ║  http://localhost:' + PORT + '              ║');
  console.log('  ╚══════════════════════════════════════╝');
});
