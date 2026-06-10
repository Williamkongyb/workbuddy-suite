/**
 * Content Engine — 核心服务层
 * AI调用 / 缓存 / 评分 / 内容生成
 */
const https = require('https');
const url = require('url');
const { PLATFORMS, CATEGORIES } = require('./config');

const SF_API_KEY = process.env.SF_API_KEY || 'sk-uvzcbywuncvtchdmxmoyehzouehoicmwcjdznkprufozrdpj';
const SF_BASE = process.env.SF_BASE || 'https://api.siliconflow.cn/v1';
const MODEL = process.env.SF_MODEL || 'deepseek-ai/DeepSeek-V3';

var cache = {};

function apiCall(endpoint, data) {
  return new Promise(function(resolve, reject) {
    var body = JSON.stringify(data);
    var u = url.parse(SF_BASE + endpoint);
    var opts = {
      hostname: u.hostname, port: 443, path: u.path, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + SF_API_KEY, 'Content-Length': Buffer.byteLength(body) }
    };
    var req = https.request(opts, function(res) {
      var chunks = [];
      res.on('data', function(c) { chunks.push(c); });
      res.on('end', function() {
        var text = Buffer.concat(chunks).toString();
        try { resolve(JSON.parse(text)); } catch(e) { resolve({ raw: text }); }
      });
    });
    req.on('error', reject);
    req.write(body); req.end();
  });
}

function cached(key, ttl) {
  var entry = cache[key];
  if (entry && (Date.now() - entry.time) < (ttl || 300000)) return entry.data;
  return null;
}
function cacheSet(key, data) { cache[key] = { data: data, time: Date.now() }; }

function parseJSON(content) {
  var c = (content || '').replace(/```(?:json)?\s*/g, '').replace(/```\s*/g, '').trim();
  try { return JSON.parse(c); } catch(e) {
    var m = c.match(/\[[\s\S]*\]/) || c.match(/\{[\s\S]*\}/);
    if (m) try { return JSON.parse(m[0]); } catch(e2) {}
    return null;
  }
}

async function fetchHotTopics(categoryKey) {
  var cat = CATEGORIES[categoryKey]; if (!cat) return [];
  var ck = 'hot_' + categoryKey, hit = cached(ck, 180000);
  if (hit) { console.log('  (hot cache)'); return hit; }
  
  var resp = await apiCall('/chat/completions', {
    model: MODEL, temperature: 0.5, max_tokens: 1500,
    messages: [{ role: 'user', content: '模拟' + (cat.hotSources||[]).join('、') + '平台今天【' + cat.name + '】领域前10热门话题。输出JSON: [{title,score,source,brief}]' }]
  });
  var result = parseJSON(resp.choices ? resp.choices[0].message.content : '') || [];
  cacheSet(ck, result); return result;
}

async function researchTopic(topic, categoryKey) {
  var cat = categoryKey ? CATEGORIES[categoryKey] : null;
  var ck = 'research_' + (categoryKey||'none') + '_' + topic, hit = cached(ck, 300000);
  if (hit) { console.log('  (research cache)'); return hit; }
  
  var prompt;
  if (cat) {
    prompt = '你是【' + cat.persona + '】（' + cat.personaTrait + '）。只围绕【' + topic + '】调研，领域：' + cat.name + '。要素：' + cat.contentElements + '。输出JSON数组5个角度含angle/keyPoints/facts。';
  } else {
    prompt = '围绕【' + topic + '】调研5个角度。输出JSON数组含angle/keyPoints/facts。';
  }
  var resp = await apiCall('/chat/completions', { model: MODEL, temperature: 0.7, max_tokens: 2000, messages: [{ role: 'user', content: prompt }] });
  var result = parseJSON(resp.choices ? resp.choices[0].message.content : '') || { raw: '解析失败' };
  cacheSet(ck, result); return result;
}

async function generatePlatformContent(topic, platformKey, researchData, categoryKey) {
  var plat = PLATFORMS[platformKey]; if (!plat) throw new Error('Unknown platform: ' + platformKey);
  var cat = categoryKey ? CATEGORIES[categoryKey] : null;
  
  var ctx = '';
  if (Array.isArray(researchData)) {
    ctx = researchData.map(function(r, i) { return '角度'+(i+1)+': '+r.angle+'\n观点: '+(r.keyPoints||[]).join('；'); }).join('\n\n');
  }
  
  var persona = cat ? '人设：【' + cat.persona + '】（' + cat.personaTrait + '）。' : '';
  var templates = '';
  if (cat && cat.templates) {
    var t = cat.templates;
    templates = '钩子参考：\n' + (t.hooks||[]).map(function(h){return '· '+h}).join('\n') + '\n结构参考：\n' + (t.structures||[]).map(function(s){return '· '+s}).join('\n') + '\n';
  }
  
  var prompt = persona + templates + '为【' + plat.name + '】创作关于【' + topic + '】的文案。\n平台规则：' + plat.rules.style + '|字数：' + plat.rules.length + '|标题：' + plat.rules.title + '|结构：' + plat.rules.structure + '|格式：' + plat.rules.format + '|语气：' + plat.rules.tone + '\n参考数据：' + ctx + '\n输出：第一行标题，空行后正文。不用markdown，不写开场白。';
  
  var resp = await apiCall('/chat/completions', { model: MODEL, temperature: 0.8, max_tokens: 3000, messages: [{ role: 'user', content: prompt }] });
  var content = (resp.choices ? resp.choices[0].message.content : '').replace(/^(好的|以下是).*?[\n\r]+/i, '').replace(/\*\*(.+?)\*\*/g, '$1');
  
  var lines = content.split('\n'), title = '', bs = 0;
  for (var i = 0; i < lines.length; i++) { if (lines[i].trim()) { title = lines[i].trim(); bs = i + 1; break; } }
  while (bs < lines.length && !lines[bs].trim()) bs++;
  return { title: title.replace(/^标题[：:]\s*/i, ''), body: lines.slice(bs).join('\n').trim() };
}

async function scoreContent(content, platformKey) {
  var plat = PLATFORMS[platformKey], platName = plat ? plat.name : '通用';
  var resp = await apiCall('/chat/completions', {
    model: MODEL, temperature: 0.3, max_tokens: 800,
    messages: [{ role: 'user', content: '为【'+platName+'】文案评分(0-100)。维度:hookQuality/structureQuality/platformFit/emotionCurve/actionability各0-20。输出JSON:{total,suggestions:[]}' + '\n文案：' + content }]
  });
  return parseJSON(resp.choices ? resp.choices[0].message.content : '') || { total: 70, suggestions: ['评分解析失败'] };
}

async function analyzeCopy(copyText, platformKey) {
  var plat = PLATFORMS[platformKey], platName = plat ? plat.name : '通用';
  var resp = await apiCall('/chat/completions', {
    model: MODEL, temperature: 0.5, max_tokens: 1500,
    messages: [{ role: 'user', content: '深度拆解【'+platName+'】文案。输出JSON:{hookAnalysis,structure,emotionCurve,keywords,reusableTemplate,score}。\n文案：' + copyText }]
  });
  return parseJSON(resp.choices ? resp.choices[0].message.content : '') || { raw: '解析失败' };
}

module.exports = { apiCall, cached, cacheSet, parseJSON, fetchHotTopics, researchTopic, generatePlatformContent, scoreContent, analyzeCopy };
