/**
 * Content Engine — 路由层
 * API路由注册 + 静态文件服务
 */
const fs = require('fs');
const path = require('path');
const { PLATFORMS, CATEGORIES } = require('./config');
const { fetchHotTopics, researchTopic, generatePlatformContent, scoreContent, analyzeCopy, apiCall, parseJSON } = require('./services');

function setupRoutes(app) {

  // 静态文件
  app.get('*', function(req, res, next) {
    var p = req.path === '/' ? '/index.html' : req.path;
    var ext = path.extname(p);
    var mimes = { '.html':'text/html', '.js':'application/javascript', '.css':'text/css', '.json':'application/json' };
    if (!mimes[ext]) return next();
    try {
      res.type(mimes[ext]).send(fs.readFileSync(path.join(__dirname, '..', p), 'utf8'));
    } catch(e) { next(); }
  });

  // API: 配置
  app.get('/api/config', function(req, res) {
    var platforms = {}, categories = {};
    Object.keys(PLATFORMS).forEach(function(k) { platforms[k] = { name: PLATFORMS[k].name, icon: PLATFORMS[k].icon, color: PLATFORMS[k].color, description: PLATFORMS[k].description }; });
    Object.keys(CATEGORIES).forEach(function(k) { categories[k] = { name: CATEGORIES[k].name, icon: CATEGORIES[k].icon, persona: CATEGORIES[k].persona, personaTrait: CATEGORIES[k].personaTrait, hotSources: CATEGORIES[k].hotSources }; });
    res.json({ platforms: platforms, categories: categories });
  });

  // API: 健康
  app.get('/api/health', function(req, res) { res.json({ status: 'ok', version: 'v17.0' }); });

  // API: 生成内容
  app.post('/api/generate', async function(req, res) {
    try {
      var { topic, platforms, category } = req.body;
      if (!topic || !platforms || !platforms.length) return res.status(400).json({ error: '请提供主题和平台' });
      console.log('  生成: ' + topic + (category ? ' (' + category + ')' : ''));
      var research = await researchTopic(topic, category);
      var results = {};
      await Promise.all(platforms.map(async function(pk) {
        results[pk] = await generatePlatformContent(topic, pk, research, category);
      }));
      var scores = {};
      if (platforms.length <= 2) { for (var pk of platforms) scores[pk] = await scoreContent(results[pk].title + '\n\n' + results[pk].body, pk); }
      res.json({ success: true, topic: topic, research: research, platforms: results, scores: scores });
    } catch(e) { res.status(500).json({ error: e.message }); }
  });

  // API: 热点
  app.post('/api/hot', async function(req, res) {
    try {
      var topics = await fetchHotTopics(req.body.category || 'hot_news');
      res.json({ success: true, category: req.body.category, topics: topics });
    } catch(e) { res.status(500).json({ error: e.message }); }
  });

  // API: 自定义搜索
  app.post('/api/hot-custom', async function(req, res) {
    try {
      var { keyword, platforms } = req.body;
      if (!keyword) return res.status(400).json({ error: '请提供关键词' });
      var platNames = (platforms||[]).map(function(k){ return PLATFORMS[k] ? PLATFORMS[k].name : k; }).join('、');
      var resp = await apiCall('/chat/completions', { model: 'deepseek-ai/DeepSeek-V3', temperature: 0.7, max_tokens: 1500, messages: [{ role: 'user', content: '为'+platNames+'平台，搜索"'+keyword+'"的热门话题10条。JSON数组含title/score/source/brief。' }] });
      var topics = parseJSON(resp.choices ? resp.choices[0].message.content : '') || [];
      res.json({ success: true, keyword: keyword, topics: topics });
    } catch(e) { res.status(500).json({ error: e.message }); }
  });

  // API: 抓取爆款
  app.post('/api/fetch-viral', async function(req, res) {
    try {
      var plat = PLATFORMS[req.body.platform || 'xiaohongshu'];
      if (!plat) return res.status(400).json({ error: '未知平台' });
      var cat = req.body.category ? CATEGORIES[req.body.category] : null;
      var catPrompt = cat ? '领域：' + cat.name + '。' : '';
      var resp = await apiCall('/chat/completions', { model: 'deepseek-ai/DeepSeek-V3', temperature: 0.8, max_tokens: 3000, messages: [{ role: 'user', content: '模拟'+plat.name+'平台今天Top10爆款内容。'+catPrompt+'每项含title/body。JSON数组。' }] });
      var posts = parseJSON(resp.choices ? resp.choices[0].message.content : '') || [];
      res.json({ success: true, platform: req.body.platform, posts: posts });
    } catch(e) { res.status(500).json({ error: e.message }); }
  });

  // API: 拆解
  app.post('/api/analyze', async function(req, res) {
    try {
      if (!req.body.text) return res.status(400).json({ error: '请提供文案' });
      var result = await analyzeCopy(req.body.text, req.body.platform);
      res.json({ success: true, analysis: result });
    } catch(e) { res.status(500).json({ error: e.message }); }
  });

  // API: 评分
  app.post('/api/score', async function(req, res) {
    try {
      if (!req.body.content) return res.status(400).json({ error: '请提供内容' });
      var result = await scoreContent(req.body.content, req.body.platform);
      res.json({ success: true, score: result });
    } catch(e) { res.status(500).json({ error: e.message }); }
  });

  // API: 搜索+生成完整链路
  app.post('/api/search-generate', async function(req, res) {
    try {
      var { keyword, platforms, searchType } = req.body;
      if (!keyword) return res.status(400).json({ error: '请提供关键词' });
      var genResults = {}, analyzed = [];
      
      for (var pi = 0; pi < Math.min((platforms||[]).length, 1); pi++) {
        var pk = platforms[pi], plat = PLATFORMS[pk]; if (!plat) continue;
        var fr = await apiCall('/chat/completions', { model: 'deepseek-ai/DeepSeek-V3', temperature: 0.8, max_tokens: 1500, messages: [{ role: 'user', content: '为'+plat.name+'平台，关键词"'+keyword+'"，生成2条爆款文案。JSON数组含title/body。' }] });
        var posts = parseJSON(fr.choices ? fr.choices[0].message.content : '') || [];
        for (var pj = 0; pj < Math.min(posts.length, 2); pj++) {
          var analysis = await analyzeCopy(posts[pj].title + '\n\n' + posts[pj].body, pk);
          analyzed.push({ platform: pk, post: posts[pj], analysis: analysis });
        }
      }
      
      var templates = analyzed.filter(function(a){ return a.analysis && a.analysis.reusableTemplate; }).slice(0, 2).map(function(a,i){ return '模板'+(i+1)+':'+a.analysis.reusableTemplate; }).join('\n');
      for (var gi = 0; gi < Math.min((platforms||[]).length, 1); gi++) {
        var gk = platforms[gi], plat = PLATFORMS[gk]; if (!plat) continue;
        var gr = await apiCall('/chat/completions', { model: 'deepseek-ai/DeepSeek-V3', temperature: 0.8, max_tokens: 1500, messages: [{ role: 'user', content: '基于以下模板，为【'+plat.name+'】创作关于"'+keyword+'"的原创文案。\n模板：\n'+templates+'\n输出：第一行标题，空行后正文。' }] });
        var gc = (gr.choices ? gr.choices[0].message.content : '').replace(/^(好的|以下是).*?[\n\r]+/i, '');
        var lines = gc.split('\n'), title = '', bs = 0;
        for (var l = 0; l < lines.length; l++) { if (lines[l].trim()) { title = lines[l].trim(); bs = l + 1; break; } }
        while (bs < lines.length && !lines[bs].trim()) bs++;
        genResults[gk] = { title: title, body: lines.slice(bs).join('\n').trim() };
      }
      res.json({ success: true, keyword: keyword, analyzed: analyzed, generated: genResults });
    } catch(e) { res.status(500).json({ error: e.message }); }
  });
  // API: AI润色
  app.post('/api/polish', async function(req, res) {
    try {
      var { text, action, tone } = req.body;
      if (!text || !action) return res.status(400).json({ error: '请提供文本和操作' });
      var actionMap = {
        rewrite: '改写以下文本，保持原意但换一种表达方式',
        expand: '扩写以下文本，增加细节和例子',
        compress: '精简以下文本，保留核心观点',
        formal: '将以下文本改为正式专业的语气',
        casual: '将以下文本改为轻松口语化的语气',
        viral: '将以下文本优化为更有爆款潜力的风格',
        translate: '将以下中文翻译为英文',
        format: '将以下文本自动排版：合理分段、加小标题、重点加粗。保持原文不变。'
      };
      var instruction = actionMap[action] || '优化以下文本';
      if (tone) instruction += '，语气：' + tone;
      var resp = await apiCall('/chat/completions', { model: 'deepseek-ai/DeepSeek-V3', temperature: 0.5, max_tokens: 2000, messages: [{ role: 'user', content: instruction + '\n\n文本：\n' + text + '\n\n返回优化后的文本，不要加说明。' }] });
      var result = resp.choices ? resp.choices[0].message.content : text;
      res.json({ success: true, action: action, polished: result });
    } catch(e) { res.status(500).json({ error: e.message }); }
  });
}

module.exports = { setupRoutes };
