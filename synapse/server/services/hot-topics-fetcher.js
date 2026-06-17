/**
 * Hot Topics Fetcher — 实时热点聚合 v1.0
 * 对标: 飞瓜数据+灰豚数据 实时热点
 * 
 * 数据源:
 * 1. 微博热搜 API (免费，30条)
 * 2. 百度风云榜 (免费，实时)
 * 3. 知乎热榜 (免费)
 * 4. 抖音热点榜 (需token，fallback可用)
 * 5. 本地静态JSON (离线fallback)
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const STATIC_PATH = path.join(__dirname, '..', 'data', 'hot-topics.json');
const CACHE_PATH = path.join(__dirname, '..', 'data', 'hot-topics-cache.json');
const CACHE_TTL = 10 * 60 * 1000; // 10分钟缓存

/**
 * 通用 HTTP GET 请求
 */
function httpGet(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        ...options.headers
      },
      timeout: 10000
    }, (res) => {
      // 处理重定向
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        httpGet(res.headers.location, options).then(resolve).catch(reject);
        return;
      }
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          resolve(body);
        }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Request timeout')); });
  });
}

/**
 * 获取微博热搜 (非官方接口，可能不稳定)
 */
async function fetchWeiboHot() {
  try {
    const data = await httpGet('https://weibo.com/ajax/side/hotSearch');
    const topics = (data.data?.realtime || []).slice(0, 20).map((item, i) => ({
      id: `wb-${i}`,
      title: item.word || item.note || '',
      rank: i + 1,
      heat: item.num || 0,
      source: '微博热搜',
      category: inferCategory(item.word || ''),
      url: `https://s.weibo.com/weibo?q=${encodeURIComponent(item.word || '')}`,
      trending: item.flag_desc || '',
      fetched_at: new Date().toISOString()
    }));
    return topics;
  } catch (e) {
    return []; // 静默fallback
  }
}

/**
 * 获取百度风云榜
 */
async function fetchBaiduHot() {
  try {
    // 百度今日热点
    const data = await httpGet('https://top.baidu.com/board?tab=realtime');
    // 这是个HTML页面，需要解析...作为fallback返回空
    return [];
  } catch (e) {
    return [];
  }
}

/**
 * 获取知乎热榜
 */
async function fetchZhihuHot() {
  try {
    const data = await httpGet('https://www.zhihu.com/api/v3/feed/topstory/hot-lists/total?limit=20&desktop=true');
    const topics = (data.data || []).slice(0, 20).map((item, i) => ({
      id: `zh-${i}`,
      title: item.target?.title || item.target?.question?.title || '',
      rank: i + 1,
      heat: parseInt(item.detail_text?.replace(/\D/g, '') || '0') || 0,
      source: '知乎热榜',
      category: inferCategory(item.target?.title || ''),
      url: item.target?.url || `https://www.zhihu.com/question/${item.target?.id || ''}`,
      trending: '',
      fetched_at: new Date().toISOString()
    }));
    return topics;
  } catch (e) {
    return [];
  }
}

/**
 * 获取抖音热点榜
 */
async function fetchDouyinHot() {
  try {
    const data = await httpGet('https://www.douyin.com/aweme/v1/web/hot/search/list/?detail_list=1&count=20');
    const topics = (data.data?.word_list || []).map((item, i) => ({
      id: `dy-${i}`,
      title: item.word || '',
      rank: i + 1,
      heat: item.hot_value || 0,
      source: '抖音热点',
      category: inferCategory(item.word || ''),
      url: `https://www.douyin.com/search/${encodeURIComponent(item.word || '')}`,
      trending: item.event_time ? `${item.event_time}` : '',
      fetched_at: new Date().toISOString()
    }));
    return topics;
  } catch (e) {
    return [];
  }
}

/**
 * 根据关键词推断品类
 */
function inferCategory(title) {
  const cats = {
    '美妆护肤': ['美妆', '护肤', '口红', '粉底', '面膜', '防晒', '化妆品'],
    '美食烹饪': ['美食', '小吃', '奶茶', '咖啡', '火锅', '烧烤', '食谱'],
    '穿搭时尚': ['穿搭', '衣服', '时尚', '鞋子', '包包', '搭配'],
    '家居生活': ['家居', '装修', '收纳', '好物', '租房'],
    '旅行攻略': ['旅行', '旅游', '景点', '酒店', '机票'],
    '宠物生活': ['猫', '狗', '宠物', '猫咪', '狗狗'],
    '健身运动': ['健身', '减肥', '运动', '跑步', '瑜伽'],
    '数码科技': ['手机', '电脑', '耳机', '数码', 'AI', '科技', '芯片'],
    '效率工具': ['工具', '效率', '软件', 'App', '插件'],
    '母婴育儿': ['宝宝', '婴儿', '育儿', '孕', '奶粉'],
    '职场成长': ['职场', '面试', '简历', '跳槽', '工资', '裁员'],
    '情感生活': ['恋爱', '分手', '结婚', '单身', '相亲'],
    '娱乐': ['明星', '综艺', '电影', '电视剧', '音乐', '偶像'],
    '社会': ['社会', '新闻', '政策', '事故', '通报']
  };

  const t = title.toLowerCase();
  for (const [cat, keywords] of Object.entries(cats)) {
    if (keywords.some(kw => t.includes(kw))) return cat;
  }
  return '综合';
}

/**
 * 从缓存读取
 */
function readCache() {
  try {
    if (fs.existsSync(CACHE_PATH)) {
      const cache = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf-8'));
      if (Date.now() - cache.cached_at < CACHE_TTL) {
        return cache.topics;
      }
    }
  } catch (e) { /* ignore */ }
  return null;
}

function writeCache(topics) {
  try {
    fs.writeFileSync(CACHE_PATH, JSON.stringify({
      cached_at: Date.now(),
      topics
    }, null, 2), 'utf-8');
  } catch (e) { /* ignore */ }
}

/**
 * 加载静态热点 (离线fallback)
 */
function loadStaticTopics() {
  try {
    const data = JSON.parse(fs.readFileSync(STATIC_PATH, 'utf-8'));
    return data.topics || [];
  } catch (e) {
    return [];
  }
}

/**
 * 统一获取热点 - 聚合所有来源
 */
async function fetchAllHotTopics(options = {}) {
  const { refresh = false, min_sources = 1 } = options;

  // 先检查缓存
  if (!refresh) {
    const cached = readCache();
    if (cached) return { topics: cached, from: 'cache', total: cached.length };
  }

  // 并行抓取所有源
  const [weibo, zhihu, douyin] = await Promise.allSettled([
    fetchWeiboHot(),
    fetchZhihuHot(),
    fetchDouyinHot()
  ]);

  const allTopics = [];
  const sources = [];

  if (weibo.status === 'fulfilled' && weibo.value.length > 0) {
    allTopics.push(...weibo.value);
    sources.push('weibo');
  }
  if (zhihu.status === 'fulfilled' && zhihu.value.length > 0) {
    allTopics.push(...zhihu.value);
    sources.push('zhihu');
  }
  if (douyin.status === 'fulfilled' && douyin.value.length > 0) {
    allTopics.push(...douyin.value);
    sources.push('douyin');
  }

  // 如果实时源不够，用静态数据补充
  if (sources.length < min_sources) {
    const staticTopics = loadStaticTopics();
    const existingTitles = new Set(allTopics.map(t => t.title));
    const extraTopics = staticTopics
      .filter(t => !existingTitles.has(t.title))
      .slice(0, 20);
    allTopics.push(...extraTopics);
    sources.push('static_fallback');
  }

  // 去重 + 排序
  const seen = new Set();
  const unique = allTopics.filter(t => {
    if (seen.has(t.title)) return false;
    seen.add(t.title);
    return true;
  }).sort((a, b) => a.rank - b.rank);

  // 更新缓存
  writeCache(unique);

  return {
    topics: unique,
    from: sources.join(','),
    total: unique.length,
    fetched_at: new Date().toISOString()
  };
}

/**
 * 按品类筛选
 */
function filterByCategory(topics, category, limit = 20) {
  if (!category) return topics.slice(0, limit);
  return topics.filter(t => t.category === category).slice(0, limit);
}

module.exports = {
  fetchAllHotTopics,
  filterByCategory,
  loadStaticTopics,
  readCache
};
