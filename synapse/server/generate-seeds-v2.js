/**
 * Seed Data Generator v2 — 分批生成，支持断点续传
 * 用法: node server/generate-seeds-v2.js
 * 每次运行最多生成 30 条新增，可多次执行直到 200 条
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const API_KEY = process.env.SF_API_KEY || process.env.DEEPSEEK_API_KEY || '';
// 修复路径: __dirname = server/, 实际数据在项目根 data/
const DATA_PATH = path.join(__dirname, '..', 'data', 'seed-posts.json');
const TARGET = 200;
const BATCH_LIMIT = 50; // 每次最多新增30条

const CATEGORIES = [
  '美妆护肤', '美食烹饪', '穿搭时尚', '家居生活',
  '旅行攻略', '宠物生活', '健身运动', '数码科技',
  '效率工具', '母婴育儿', '职场成长', '情感生活'
];

const PLATFORM_MAP = {
  xiaohongshu: { name: '小红书', style: '种草风，口语化，emoji点缀，20字以内标题' },
  zhihu: { name: '知乎', style: '专业深度，有数据/案例，60字以内标题' },
  wechat: { name: '公众号', style: '深度推文风，娓娓道来，有结构有干货' },
  douyin: { name: '抖音', style: '短视频口播风，节奏快，口语化，有悬念' },
  bilibili: { name: 'B站', style: '技术干货+娱乐化，适合年轻受众' },
  toutiao: { name: '今日头条', style: '算法推荐风，标题党，正文有干货' }
};

function callDeepSeek(messages) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ model: 'deepseek-chat', messages, temperature: 0.85, max_tokens: 3000 });
    const req = https.request({
      hostname: 'api.deepseek.com', path: '/chat/completions', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}`, 'Content-Length': Buffer.byteLength(body) },
      timeout: 45000
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const j = JSON.parse(data);
          if (j.error) { reject(new Error(j.error.message)); return; }
          resolve(j.choices?.[0]?.message?.content || '');
        } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout 45s')); });
    req.write(body); req.end();
  });
}

function loadData() {
  try {
    if (fs.existsSync(DATA_PATH)) {
      const d = JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));
      const posts = d.posts || [];
      console.log(`📚 现有数据: ${posts.length} 条`);
      return posts;
    }
  } catch (e) { console.error('读取失败:', e.message); }
  return [];
}

function saveData(posts) {
  const dir = path.dirname(DATA_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(DATA_PATH, JSON.stringify({
    version: '2.0',
    total: posts.length,
    last_updated: new Date().toISOString(),
    posts
  }, null, 2), 'utf-8');
  console.log(`💾 已保存: ${posts.length} 条`);
}

async function generateBatch(category, platform, existingIds, count = 3) {
  const pinfo = PLATFORM_MAP[platform] || { name: platform, style: '通用' };
  const prompt = [
    { role: 'system', content: `你是${category}领域的小红书/知乎/公众号资深创作者。你只输出合法JSON，不要解释。` },
    { role: 'user', content: `生成${count}条${pinfo.name}(${pinfo.style})平台上「${category}」品类的爆款种子数据。

每条JSON格式（输出纯JSON数组，不要markdown代码块）：
{
  "id": "seed-${category}-${platform}-序号",
  "title": "标题（${pinfo.style}风格，含数字/情绪词）",
  "platform": "${platform}",
  "category": "${category}",
  "author": "虚构2-4字中文笔名",
  "likes": 随机500-50000,
  "collects": 随机200-30000,
  "comments": 随机50-5000,
  "body": "完整正文（150-300字，${pinfo.style}风格，要有干货/细节/真实感）",
  "structure": {"opening": "开头一句话描述", "body": "正文结构描述", "closing": "结尾描述", "body_type": "list或narrative或howto"},
  "keywords": ["关键词1","关键词2","关键词3"],
  "hashtags": ["#标签1","#标签2","#标签3"],
  "tone": "口语化或专业或种草或干货或治愈",
  "template_score": 60-95的整数,
  "publish_date": "2025-01到2026-06之间的日期"
}

只输出数组: [{...}, {...}]` }
  ];

  try {
    const resp = await callDeepSeek(prompt);
    // Try multiple extraction strategies
    let arr = [];
    // Strategy 1: full array match
    const m = resp.match(/\[[\s\S]*\]/);
    if (m) {
      try { arr = JSON.parse(m[0]); } catch (e1) {
        // Strategy 2: extract individual objects
        const objMatches = resp.match(/\{[^{}]*"id"[^{}]*\}/g);
        if (objMatches) {
          arr = objMatches.map(o => { try { return JSON.parse(o); } catch(e) { return null; } }).filter(Boolean);
        }
      }
    }
    return arr.filter(p => p.id && !existingIds.has(p.id));
  } catch (e) {
    console.error(`  ❌ ${category}/${platform}: ${e.message}`);
    return [];
  }
}

async function main() {
  if (!API_KEY) { console.error('❌ 需要 SF_API_KEY'); process.exit(1); }

  const posts = loadData();
  const existingIds = new Set(posts.map(p => p.id));

  if (posts.length >= TARGET) {
    console.log(`✅ 已达目标 ${posts.length}/${TARGET}，无需生成`);
    process.exit(0);
  }

  // 统计各品类+平台短板
  const coverage = {};
  for (const cat of CATEGORIES) {
    coverage[cat] = {};
    for (const plat of Object.keys(PLATFORM_MAP)) {
      const count = posts.filter(p => p.category === cat && p.platform === plat).length;
      coverage[cat][plat] = count;
    }
  }

  // 优先补短板：品类×平台最少的数据
  const gaps = [];
  for (const cat of CATEGORIES) {
    for (const plat of Object.keys(PLATFORM_MAP)) {
      const minPerSlot = posts.length < 150 ? 3 : (posts.length < 200 ? 4 : 2);
      if (coverage[cat][plat] < minPerSlot) {
        gaps.push({ cat, plat, need: minPerSlot - coverage[cat][plat] });
      }
    }
  }

  gaps.sort((a, b) => a.need - b.need);

  console.log(`📊 需要补充: ${gaps.length} 个品类×平台组合`);
  console.log(`🎯 本次最多生成: ${BATCH_LIMIT} 条\n`);

  let generated = 0;

  for (const gap of gaps) {
    if (generated >= BATCH_LIMIT) break;
      const genCount = Math.min(gap.need, 4, BATCH_LIMIT - generated);
      if (genCount <= 0) continue;

    process.stdout.write(`  🎯 ${gap.cat} → ${gap.plat} (${genCount}条)... `);
    const batch = await generateBatch(gap.cat, gap.plat, existingIds, genCount);

    let added = 0;
    for (const p of batch) {
      if (!existingIds.has(p.id)) {
        existingIds.add(p.id);
        posts.push(p);
        added++;
      }
    }
    generated += added;
    console.log(`+${added}`);
  }

  // 保存
  saveData(posts);
  console.log(`\n✅ 本次新增 ${generated} 条 | 总计 ${posts.length}/${TARGET}`);
  if (posts.length < TARGET) {
    console.log(`📌 还需 ${TARGET - posts.length} 条，再次运行本脚本即可`);
  }
}

main().catch(e => { console.error('❌', e.message); process.exit(1); });
