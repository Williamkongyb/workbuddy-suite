/**
 * M1 文案收集引擎 — Collector Service
 * 负责：搜索+收集+去重+存储 小红书/公众号等平台的竞品文案
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const SEED_FILE = path.join(DATA_DIR, 'seed-posts.json');
const COLLECTED_FILE = path.join(DATA_DIR, 'collected-posts.json');

// --- 内部工具函数 ---

function loadSeedData() {
  if (!fs.existsSync(SEED_FILE)) return [];
  const data = JSON.parse(fs.readFileSync(SEED_FILE, 'utf-8'));
  // 兼容两种格式：纯数组 和 {posts:[...]}
  return Array.isArray(data) ? data : (data.posts || []);
}

function loadCollected() {
  if (!fs.existsSync(COLLECTED_FILE)) return [];
  return JSON.parse(fs.readFileSync(COLLECTED_FILE, 'utf-8'));
}

function saveCollected(posts) {
  fs.writeFileSync(COLLECTED_FILE, JSON.stringify(posts, null, 2), 'utf-8');
}

/**
 * 按关键词搜索 (从种子数据 + 已收集数据)
 */
function searchByKeyword(keyword, limit = 20) {
  const seed = loadSeedData();
  const collected = loadCollected();
  const all = [...seed, ...collected];

  const kw = keyword.toLowerCase();
  const results = all.filter(p => {
    const searchStr = `${p.title} ${p.content_preview || ''} ${(p.keywords || []).join(' ')} ${(p.hashtags || []).join(' ')}`.toLowerCase();
    return searchStr.includes(kw);
  });

  return results.slice(0, limit);
}

/**
 * 按平台筛选
 */
function filterByPlatform(platform, limit = 20) {
  const seed = loadSeedData();
  const collected = loadCollected();
  const all = [...seed, ...collected];

  return all.filter(p => p.platform === platform).slice(0, limit);
}

/**
 * 按品类筛选
 */
function filterByCategory(category, limit = 20) {
  const seed = loadSeedData();
  const collected = loadCollected();
  const all = [...seed, ...collected];

  return all.filter(p => p.category === category).slice(0, limit);
}

/**
 * 获取Top N爆款 (按点赞排序)
 */
function getTopPosts(limit = 20, platform = null) {
  const seed = loadSeedData();
  const collected = loadCollected();
  let all = [...seed, ...collected];

  if (platform) {
    all = all.filter(p => p.platform === platform);
  }

  all.sort((a, b) => (b.likes || 0) - (a.likes || 0));
  return all.slice(0, limit);
}

/**
 * 添加新收集的帖子
 */
function addCollectedPost(post) {
  const collected = loadCollected();
  // 去重：按 url 或 title
  const exists = collected.find(p =>
    (post.url && p.url === post.url) ||
    (post.title && p.title === post.title)
  );
  if (exists) return { ...exists, _duplicate: true };

  const newPost = {
    ...post,
    id: `col-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    collected_at: new Date().toISOString()
  };
  collected.push(newPost);
  saveCollected(collected);
  return newPost;
}

/**
 * 统计概览
 */
function getStats() {
  const seed = loadSeedData();
  const collected = loadCollected();
  const all = [...seed, ...collected];

  const byPlatform = {};
  const byCategory = {};
  const keywords = {};

  all.forEach(p => {
    byPlatform[p.platform] = (byPlatform[p.platform] || 0) + 1;
    byCategory[p.category] = (byCategory[p.category] || 0) + 1;
    (p.keywords || []).forEach(k => {
      keywords[k] = (keywords[k] || 0) + 1;
    });
    (p.hashtags || []).forEach(h => {
      keywords[h] = (keywords[h] || 0) + 1;
    });
  });

  // 关键字排序
  const topKeywords = Object.entries(keywords)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30)
    .map(([k, v]) => ({ keyword: k, count: v }));

  return {
    total_posts: all.length,
    seed_count: seed.length,
    collected_count: collected.length,
    by_platform: byPlatform,
    by_category: byCategory,
    top_keywords: topKeywords,
    avg_likes: Math.round(all.reduce((s, p) => s + (p.likes || 0), 0) / all.length),
    avg_collects: Math.round(all.reduce((s, p) => s + (p.collects || 0), 0) / all.length),
    avg_comments: Math.round(all.reduce((s, p) => s + (p.comments || 0), 0) / all.length)
  };
}

// --- 导出 API ---

module.exports = {
  searchByKeyword,
  filterByPlatform,
  filterByCategory,
  getTopPosts,
  addCollectedPost,
  getStats,
  loadSeedData,
  loadCollected
};
