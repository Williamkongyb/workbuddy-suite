/**
 * Synapse API 路由
 * M1: /api/collect/* — 内容收集
 * M2: /api/generate* — 内容生成+格式化
 * Analysis: /api/analyze* — 内容分析
 */

const express = require('express');
const router = express.Router();

const collector = require('./services/collector');
const analyzer = require('./services/analyzer');
const formatter = require('./services/formatter');
const generator = require('./services/generator');
const brandBrain = require('./services/brand-brain');
const rewriter = require('./services/rewriter');
const humanizer = require('./services/humanizer');
const complianceService = require('./services/compliance-service');
const hotTopicsFetcher = require('./services/hot-topics-fetcher');
const scheduler = require('./services/scheduler');

// ==================== 健康检查 ====================

router.get('/health', async (req, res) => {
  const genHealth = await generator.healthCheck().catch(() => ({ status: 'unknown' }));
  res.json({
    status: 'ok',
    version: '0.4.0',
    name: 'Synapse Phase 1 — M1+M2 Production (Brand Brain v1.0)',
    modules: {
      collector: 'ok',
      analyzer: 'ok',
      formatter: 'ok',
      generator: genHealth.status
    },
    data_stats: collector.getStats()
  });
});

// ==================== M1: 内容收集 ====================

/**
 * GET /api/collect/top
 * 获取Top N爆款
 * Query: ?limit=20&platform=xiaohongshu
 */
router.get('/collect/top', (req, res) => {
  const limit = parseInt(req.query.limit) || 20;
  const platform = req.query.platform || null;
  const posts = collector.getTopPosts(limit, platform);
  res.json({ count: posts.length, posts });
});

/**
 * GET /api/collect/search
 * 搜索内容
 * Query: ?keyword=AI工具&limit=20
 */
router.get('/collect/search', (req, res) => {
  const { keyword, limit = 20 } = req.query;
  if (!keyword) return res.status(400).json({ error: '请提供 keyword 参数' });
  const posts = collector.searchByKeyword(keyword, parseInt(limit));
  res.json({ keyword, count: posts.length, posts });
});

/**
 * GET /api/collect/by-platform/:platform
 * 按平台获取
 */
router.get('/collect/by-platform/:platform', (req, res) => {
  const { platform } = req.params;
  const limit = parseInt(req.query.limit) || 20;
  const posts = collector.filterByPlatform(platform, limit);
  res.json({ platform, count: posts.length, posts });
});

/**
 * GET /api/collect/by-category/:category
 * 按品类获取
 */
router.get('/collect/by-category/:category', (req, res) => {
  const { category } = req.params;
  const limit = parseInt(req.query.limit) || 20;
  const posts = collector.filterByCategory(category, limit);
  res.json({ category, count: posts.length, posts });
});

/**
 * POST /api/collect/add
 * 添加新收集的帖子
 * Body: { title, platform, category, content_preview, likes, ... }
 */
router.post('/collect/add', (req, res) => {
  const post = req.body;
  if (!post.title) return res.status(400).json({ error: '至少需要 title 字段' });
  const result = collector.addCollectedPost(post);
  if (result._duplicate) {
    return res.json({ status: 'duplicate', post: result });
  }
  res.json({ status: 'added', post: result });
});

/**
 * GET /api/collect/stats
 * 收集统计概览
 */
router.get('/collect/stats', (req, res) => {
  res.json(collector.getStats());
});

// ==================== M1: 内容分析 ====================

/**
 * GET /api/analyze
 * 分析所有/指定品类/指定平台的内容
 * Query: ?category=AI工具&platform=xiaohongshu
 */
router.get('/analyze', async (req, res) => {
  try {
    const { category, platform } = req.query;
    const result = await analyzer.analyze(category || null, platform || null);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * POST /api/analyze/benchmark
 * 对标分析：给定内容 vs 爆款
 * Body: { title, keywords, hashtags }
 */
router.post('/analyze/benchmark', (req, res) => {
  const { title } = req.body;
  if (!title) return res.status(400).json({ error: '需要 title' });

  const topPosts = collector.getTopPosts(10);
  const result = analyzer.benchmarkAgainstTop(req.body, topPosts);
  res.json(result);
});

// ==================== M2: 内容生成 ====================

/**
 * POST /api/generate
 * AI生成内容
 * Body: { topic, platform, count?, keywords? }
 */
router.post('/generate', async (req, res) => {
  const { topic, platform = 'xiaohongshu', count = 1, keywords = [] } = req.body;
  if (!topic) return res.status(400).json({ error: '需要 topic 参数' });

  try {
    const result = await generator.generate(topic, platform, { count, keywords });
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message, detail: e.stack });
  }
});

/**
 * POST /api/generate/benchmark
 * 生成 + 对标评分
 * Body: { topic, platform, count?, keywords? }
 */
router.post('/generate/benchmark', async (req, res) => {
  const { topic, platform = 'xiaohongshu', count = 1, keywords = [] } = req.body;
  if (!topic) return res.status(400).json({ error: '需要 topic 参数' });

  try {
    const result = await generator.generateAndBenchmark(topic, platform, { count, keywords });
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message, detail: e.stack });
  }
});

// ==================== M2: 格式化 ====================

/**
 * POST /api/format
 * 格式化内容为指定平台格式
 * Body: { title, body, hashtags, platform }
 */
router.post('/format', (req, res) => {
  const { title, body, hashtags = [], platform = 'xiaohongshu' } = req.body;
  if (!title || !body) return res.status(400).json({ error: '需要 title 和 body' });

  const result = formatter.format({ title, body, hashtags }, platform);
  res.json(result);
});

/**
 * GET /api/format/platforms
 * 获取全部12个支持的平台列表及完整配置
 */
router.get('/format/platforms', (req, res) => {
  const list = formatter.getPlatformList();
  res.json({
    total: list.length,
    platforms: list
  });
});

/**
 * POST /api/format/multi
 * 多平台一键格式化
 * Body: { title, body, hashtags, platforms: ['xiaohongshu','zhihu','wechat'] }
 */
router.post('/format/multi', (req, res) => {
  const { title, body, hashtags = [], platforms } = req.body;
  if (!title || !body) return res.status(400).json({ error: '需要 title 和 body' });
  const results = formatter.formatMultiPlatform({ title, body, hashtags }, platforms);
  res.json({ count: Object.keys(results).length, results });
});

/**
 * GET /api/format/tips/:platform
 * 获取特定平台的发布建议
 */
router.get('/format/tips/:platform', (req, res) => {
  const { platform } = req.params;
  if (!formatter.PLATFORM_CONFIGS[platform]) {
    return res.status(404).json({ error: `未知平台: ${platform}` });
  }
  res.json(formatter.getPublishTips(platform));
});

// ==================== P0 Features: 违禁词检测 + 热点榜单 ====================

const fs = require('fs');
const path = require('path');

/**
 * POST /api/compliance/check
 * 违禁词检测（借鉴句易网）
 * Body: { content, platform? }
 */
router.post('/compliance/check', async (req, res) => {
  const { content, platform, enable_ai } = req.body;
  if (!content) return res.status(400).json({ error: '需要 content 参数' });

  try {
    const result = await complianceService.fullCheck(content, {
      platform,
      enable_ai: enable_ai !== false
    });
    res.json(result);
  } catch (e) {
    const localResult = complianceService.localCheck(content, platform);
    res.json({ ...localResult, ai_check_error: e.message });
  }
});

/**
 * GET /api/hot-topics
 * 热点榜单（借鉴飞瓜数据）
 * Query: ?category=美妆护肤&limit=20
 */
router.get('/hot-topics', (req, res) => {
  const { category, limit = 20 } = req.query;

  try {
    // 读取热点数据
    const hotPath = path.join(__dirname, 'data', 'hot-topics.json');
    const hotData = JSON.parse(fs.readFileSync(hotPath, 'utf-8'));

    let topics = hotData.topics;

    // 按品类筛选
    if (category) {
      topics = topics.filter(t => t.category === category);
    }

    // 限制数量
    topics = topics.slice(0, parseInt(limit));

    res.json({
      count: topics.length,
      updated: hotData.last_updated,
      topics
    });
  } catch (e) {
    res.status(500).json({ error: '热点榜单获取失败', detail: e.message });
  }
});

// ==================== P1 Feature: 竞品监控 ====================

/**
 * GET /api/competitors
 * 获取竞品列表
 */
router.get('/competitors', (req, res) => {
  try {
    const competitorsPath = path.join(__dirname, 'data', 'competitors.json');
    const competitorsData = JSON.parse(fs.readFileSync(competitorsPath, 'utf-8'));
    res.json(competitorsData);
  } catch (e) {
    res.status(500).json({ error: '获取竞品列表失败', detail: e.message });
  }
});

/**
 * POST /api/competitors
 * 添加竞品
 * Body: { name, platform, account_url, category }
 */
router.post('/competitors', (req, res) => {
  const { name, platform, account_url, category } = req.body;
  if (!name || !platform) return res.status(400).json({ error: '需要 name 和 platform 参数' });

  try {
    const competitorsPath = path.join(__dirname, 'data', 'competitors.json');
    const competitorsData = JSON.parse(fs.readFileSync(competitorsPath, 'utf-8'));

    const newCompetitor = {
      id: `comp-${Date.now()}`,
      name,
      platform,
      account_url: account_url || '',
      category: category || '通用',
      monitoring: true,
      last_check: new Date().toISOString(),
      recent_posts: []
    };

    competitorsData.competitors.push(newCompetitor);
    competitorsData.last_updated = new Date().toISOString();
    fs.writeFileSync(competitorsPath, JSON.stringify(competitorsData, null, 2), 'utf-8');

    res.json({ status: 'added', competitor: newCompetitor });
  } catch (e) {
    res.status(500).json({ error: '添加竞品失败', detail: e.message });
  }
});

/**
 * DELETE /api/competitors/:id
 * 删除竞品
 */
router.delete('/competitors/:id', (req, res) => {
  const { id } = req.params;

  try {
    const competitorsPath = path.join(__dirname, 'data', 'competitors.json');
    const competitorsData = JSON.parse(fs.readFileSync(competitorsPath, 'utf-8'));

    const index = competitorsData.competitors.findIndex(c => c.id === id);
    if (index === -1) return res.status(404).json({ error: '竞品不存在' });

    competitorsData.competitors.splice(index, 1);
    competitorsData.last_updated = new Date().toISOString();
    fs.writeFileSync(competitorsPath, JSON.stringify(competitorsData, null, 2), 'utf-8');

    res.json({ status: 'deleted', id });
  } catch (e) {
    res.status(500).json({ error: '删除竞品失败', detail: e.message });
  }
});

// ==================== 模板上下文 ====================

/**
 * GET /api/templates
 * 获取当前爆款模板上下文
 */
router.get('/templates', (req, res) => {
  const templateContext = generator.getTemplateContext();
  res.json(templateContext);
});

// ==================== AI团队状态 ====================

/**
 * GET /api/team
 * 获取AI团队状态和角色定义
 */
router.get('/team', (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    const os = require('os');
    const configPath = path.join(os.homedir(), '.workbuddy', 'agents', 'team-config.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    res.json({
      status: 'ok',
      team: config.team_name,
      version: config.version,
      agents: config.agents.map(a => ({
        id: a.id,
        role: a.role,
        priority: a.priority,
        trigger_conditions: a.trigger.conditions,
        auto_trigger: a.trigger.auto
      })),
      workflows: config.workflows,
      watchdog: config.watchdog
    });
  } catch (e) {
    res.status(500).json({ error: '无法读取团队配置', detail: e.message });
  }
});

/**
 * GET /api/team/agent/:id
 * 获取特定角色的详细定义
 */
router.get('/team/agent/:id', (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    const os = require('os');
    const agentPath = path.join(os.homedir(), '.workbuddy', 'agents', `${req.params.id}.md`);
    const content = fs.readFileSync(agentPath, 'utf-8');
    res.json({ id: req.params.id, definition: content });
  } catch (e) {
    res.status(404).json({ error: `角色 ${req.params.id} 定义文件不存在` });
  }
});

// ==================== Brand Brain: 品牌记忆层 ====================

/**
 * GET /api/brand
 * 获取品牌配置
 */
router.get('/brand', (req, res) => {
  const profile = brandBrain.getBrand();
  res.json(profile);
});

/**
 * POST /api/brand
 * 创建/更新品牌信息
 * Body: { name, slogan, industry, tone: { personality, voice_style, taboo_words, keywords, audience } }
 */
router.post('/brand', (req, res) => {
  try {
    const profile = brandBrain.saveBrand(req.body);
    res.json({ status: 'saved', profile });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * PUT /api/brand
 * 更新品牌信息（同POST）
 */
router.put('/brand', (req, res) => {
  try {
    const profile = brandBrain.saveBrand(req.body);
    res.json({ status: 'updated', profile });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * POST /api/brand/analyze-tone
 * AI分析品牌语调
 * Body: { samples: ["范文1", "范文2", ...] }
 */
router.post('/brand/analyze-tone', async (req, res) => {
  const { samples } = req.body;
  if (!samples || samples.length === 0) {
    return res.status(400).json({ error: '请提供至少1篇品牌范文 (samples)' });
  }
  try {
    const result = await brandBrain.analyzeTone(samples, generator.callDeepSeek);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ==================== 改写/润色/降重引擎 ====================

/**
 * POST /api/rewrite
 * 改写/润色/降重
 * Body: { content, mode: 'rewrite'|'polish'|'dedup', platform?, intensity?, style? }
 */
router.post('/rewrite', async (req, res) => {
  const { content, mode = 'rewrite', platform, intensity, style } = req.body;
  if (!content) return res.status(400).json({ error: '需要 content 参数（字符串或对象的body字段）' });

  try {
    let result;
    switch (mode) {
      case 'rewrite':
        result = await rewriter.rewrite(content, { platform, style });
        break;
      case 'polish':
        result = await rewriter.polish(content, { platform, intensity });
        break;
      case 'dedup':
        result = await rewriter.dedup(content, { platform });
        break;
      default:
        return res.status(400).json({ error: `未知模式: ${mode}，支持 rewrite/polish/dedup` });
    }
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message, detail: e.stack });
  }
});

// ==================== 去AI味引擎 ====================

/**
 * POST /api/humanize
 * 去AI味改写
 * Body: { content, intensity?, platform? }
 */
router.post('/humanize', async (req, res) => {
  const { content, intensity, platform } = req.body;
  if (!content) return res.status(400).json({ error: '需要 content 参数' });

  try {
    const result = await humanizer.humanize(content, { intensity, platform });
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message, detail: e.stack });
  }
});

/**
 * POST /api/detect-ai
 * 检测AI味评分（不改写）
 * Body: { content }
 */
router.post('/detect-ai', (req, res) => {
  const { content } = req.body;
  if (!content) return res.status(400).json({ error: '需要 content 参数' });

  const result = humanizer.detectAI(content);
  res.json(result);
});

// ==================== 热点榜单实时化 ====================

/**
 * GET /api/hot-topics/refresh
 * 强制刷新热点（聚合多源实时热搜）
 */
router.get('/hot-topics/refresh', async (req, res) => {
  try {
    const result = await hotTopicsFetcher.fetchAllHotTopics({ refresh: true });
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: '热点刷新失败（将使用缓存数据）', detail: e.message });
  }
});

// ==================== 内容排期系统 ====================

/**
 * POST /api/schedule/draft
 * 保存草稿
 * Body: { id?, title, body, platform, hashtags, keywords, category }
 */
router.post('/schedule/draft', (req, res) => {
  const draft = scheduler.saveDraft(req.body);
  res.json({ status: 'saved', draft });
});

/**
 * GET /api/schedule/drafts
 * 获取草稿列表
 * Query: ?status=draft&platform=xiaohongshu&category=美妆
 */
router.get('/schedule/drafts', (req, res) => {
  const { status, platform, category } = req.query;
  const drafts = scheduler.getDrafts({ status, platform, category });
  res.json({ count: drafts.length, drafts });
});

/**
 * DELETE /api/schedule/draft/:id
 * 删除草稿
 */
router.delete('/schedule/draft/:id', (req, res) => {
  const removed = scheduler.deleteDraft(req.params.id);
  if (!removed) return res.status(404).json({ error: '草稿不存在' });
  res.json({ status: 'deleted', draft: removed });
});

/**
 * POST /api/schedule
 * 添加排期
 * Body: { draft_id?, title, body, platform, scheduled_at, hashtags, keywords }
 */
router.post('/schedule', (req, res) => {
  const { scheduled_at, title, platform } = req.body;
  if (!scheduled_at || !title) return res.status(400).json({ error: '需要 scheduled_at 和 title 参数' });
  const item = scheduler.addSchedule(req.body);
  res.json({ status: 'scheduled', schedule: item });
});

/**
 * GET /api/schedule/queue
 * 获取排期队列
 * Query: ?status=pending&platform=xiaohongshu&time_range=today|this_week|upcoming
 */
router.get('/schedule/queue', (req, res) => {
  const { status, platform, time_range } = req.query;
  const items = scheduler.getScheduleQueue({ status, platform, time_range });
  const stats = scheduler.getStats();
  res.json({ count: items.length, items, stats });
});

/**
 * DELETE /api/schedule/:id
 * 取消排期
 */
router.delete('/schedule/:id', (req, res) => {
  const cancelled = scheduler.cancelSchedule(req.params.id);
  if (!cancelled) return res.status(404).json({ error: '排期不存在' });
  res.json({ status: 'cancelled', schedule: cancelled });
});

/**
 * POST /api/schedule/:id/publish
 * 标记为已发布
 */
router.post('/schedule/:id/publish', (req, res) => {
  const published = scheduler.markPublished(req.params.id);
  if (!published) return res.status(404).json({ error: '排期不存在' });
  res.json({ status: 'published', schedule: published });
});

/**
 * GET /api/schedule/stats
 * 排期统计
 */
router.get('/schedule/stats', (req, res) => {
  res.json(scheduler.getStats());
});

// ==================== 封面图生成（升级版） ====================

/**
 * POST /api/cover/generate
 * 生成封面图（品牌色+多模板）
 * Body: { title, style?, brand_colors?, subtitle? }
 */
router.post('/cover/generate', (req, res) => {
  const { title, style = 'tech', brand_colors, subtitle } = req.body;
  if (!title) return res.status(400).json({ error: '需要 title 参数' });

  // 获取品牌配置
  const brand = brandBrain.getBrand();

  // 模板样式定义
  const templates = {
    tech: { bg: brand_colors?.primary || '#1a1a2e', accent: brand_colors?.accent || '#00d4ff', gradient: '135deg, #1a1a2e 0%, #16213e 100%' },
    grass: { bg: brand_colors?.primary || '#0d2818', accent: brand_colors?.accent || '#4ade80', gradient: '135deg, #0d2818 0%, #065f46 100%' },
    knowledge: { bg: brand_colors?.primary || '#1e1b4b', accent: brand_colors?.accent || '#e0e7ff', gradient: '135deg, #1e1b4b 0%, #312e81 100%' },
    emotional: { bg: brand_colors?.primary || '#4c0519', accent: brand_colors?.accent || '#f9a8d4', gradient: '135deg, #4c0519 0%, #831843 100%' },
    minimal: { bg: brand_colors?.primary || '#0f172a', accent: brand_colors?.accent || '#94a3b8', gradient: '135deg, #0f172a 0%, #1e293b 100%' }
  };

  const tmpl = templates[style] || templates.tech;

  // 生成SVG封面
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:${tmpl.bg};stop-opacity:1" />
      <stop offset="100%" style="stop-color:#0a0a1a;stop-opacity:1" />
    </linearGradient>
    <filter id="glow">
      <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
      <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <circle cx="200" cy="100" r="150" fill="${tmpl.accent}" opacity="0.05"/>
  <circle cx="1050" cy="500" r="200" fill="${tmpl.accent}" opacity="0.08"/>
  ${brand.name ? `<text x="60" y="50" font-family="Arial,sans-serif" font-size="18" fill="${tmpl.accent}" opacity="0.7">${brand.name}</text>` : ''}
  <text x="60" y="280" font-family="Arial,sans-serif" font-size="56" font-weight="bold" fill="#ffffff" filter="url(#glow)">
    ${title.substring(0, 25)}${title.length > 25 ? '...' : ''}
  </text>
  ${subtitle ? `<text x="60" y="340" font-family="Arial,sans-serif" font-size="24" fill="${tmpl.accent}" opacity="0.8">${subtitle}</text>` : ''}
  <text x="60" y="550" font-family="Arial,sans-serif" font-size="20" fill="#666" opacity="0.6">Powered by Synapse AI · ${new Date().toLocaleDateString('zh-CN')}</text>
</svg>`;

  res.json({
    title,
    style,
    template: tmpl,
    brands: brand.name ? { name: brand.name, colors: brand_colors || {} } : null,
    svg,
    preview_url: `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
  });
});

module.exports = router;
