/**
 * Synapse 工具链调度脚本
 * WorkBuddy → Claude Code (架构) → Codex CLI (实现) → Trae (查看)
 * 
 * 用法: node workflow.js "主题描述"
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PROXY = 'http://localhost:8080';
const MODEL = 'deepseek-ai/DeepSeek-V3';
const TASK = process.argv[2] || '优化Content Engine搜索速度';
const PROJECT = 'D:/AI-Workshop/content-engine';
const OUTPUT = 'D:/AI-Workshop/CURRENT.md';

async function callProxy(endpoint, body, opts = {}) {
  const url = require('url');
  const http = require('http');
  return new Promise((resolve, reject) => {
    const u = url.parse(PROXY + endpoint);
    const postData = JSON.stringify(body);
    const options = {
      hostname: u.hostname, port: u.port, path: u.pathname,
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) }
    };
    const req = http.request(options, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch(e) { resolve(data); }
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function main() {
  console.log('╔══════════════════════════════════════════╗');
  console.log('║  Synapse 工具链调度器                     ║');
  console.log('║  WorkBuddy → Claude Code → Codex → Trae   ║');
  console.log('╚══════════════════════════════════════════╝\n');
  
  // Step 1: WorkBuddy 写好需求
  console.log('📋 Step 1: 需求拆解...');
  const taskMd = `# ${TASK}\n## 需求\n来自WorkBuddy的任务分配\n## 目标\n优化Content Engine\n## 状态\n⏳ 进行中`;
  fs.writeFileSync(OUTPUT, taskMd, 'utf8');
  console.log('   ✅ CURRENT.md 已生成\n');
  
  // Step 2: Claude Code 出架构方案
  console.log('🤖 Step 2: Claude Code 架构设计...');
  const archPrompt = `你是Claude Code架构师。请为以下任务设计技术架构方案：${TASK}\\n项目位置：${PROJECT}\\n\\n请输出：1.架构概览 2.模块划分 3.数据流 4.关键决策 5.风险点\\n输出Markdown格式。`;
  
  const archResult = await callProxy('/v1/messages', {
    model: MODEL, max_tokens: 2000, temperature: 0.5,
    messages: [{ role: 'user', content: archPrompt }]
  });
  
  const archContent = archResult.content ? archResult.content.map(c => c.text).join('\n') : JSON.stringify(archResult);
  fs.writeFileSync('D:/AI-Workshop/ARCHITECTURE.md', `# 架构设计方案\n## 任务\n${TASK}\n## 架构师\nClaude Code (DeepSeek V3)\n---\n${archContent}`, 'utf8');
  console.log('   ✅ ARCHITECTURE.md 已生成');
  console.log('   📐 方案摘要:', archContent.substring(0, 150).replace(/\n/g, ' ') + '...\n');
  
  // Step 3: Codex CLI 实现代码
  console.log('⚡ Step 3: Codex CLI 静默实现...');
  const codexPrompt = `你是Codex CLI程序员。请基于以下架构方案实现代码：\n${archContent.substring(0, 3000)}\n\n项目：${PROJECT}\n请修改/新增以下文件来实现方案：\n输出每个文件的完整代码。`;
  
  const codexResult = await callProxy('/v1/chat/completions', {
    model: MODEL, max_tokens: 4000, temperature: 0.3,
    messages: [{ role: 'user', content: codexPrompt }]
  });
  
  const codeContent = (codexResult.choices && codexResult.choices[0]) 
    ? codexResult.choices[0].message.content 
    : JSON.stringify(codexResult);
  fs.writeFileSync('D:/AI-Workshop/IMPLEMENTATION.md', `# 代码实现\n## 程序员\nCodex CLI (DeepSeek V3)\n---\n${codeContent}`, 'utf8');
  console.log('   ✅ IMPLEMENTATION.md 已生成');
  console.log('   💻 代码摘要:', codeContent.substring(0, 150).replace(/\n/g, ' ') + '...\n');
  
  // Step 4: 打开 Trae 查看效果
  console.log('👁️ Step 4: 打开 Trae IDE 查看...');
  try {
    const traePath = 'D:/AI_Tools/Trae/TRAE SOLO CN/Trae CN.exe';
    if (fs.existsSync(traePath)) {
      execSync(`start "" "${traePath}" "${PROJECT}"`, { timeout: 5000 });
      console.log('   ✅ Trae IDE 已启动\n');
    } else {
      console.log('   ⚠️ Trae IDE 路径不存在，请手动打开\n');
    }
  } catch(e) {
    console.log('   ⚠️ 无法启动Trae，请手动打开项目目录\n');
  }
  
  // 更新状态
  const finalMd = fs.readFileSync(OUTPUT, 'utf8').replace('⏳ 进行中', '✅ 已完成');
  fs.writeFileSync(OUTPUT, finalMd, 'utf8');
  
  console.log('╔══════════════════════════════════════════╗');
  console.log('║  🎉 全流程完成！                          ║');
  console.log('║  CURRENT.md     → 需求文档               ║');  
  console.log('║  ARCHITECTURE.md → Claude Code 架构方案   ║');
  console.log('║  IMPLEMENTATION.md → Codex 代码实现      ║');
  console.log('║  Trae IDE       → 查看项目                ║');
  console.log('╚══════════════════════════════════════════╝');
}

main().catch(e => console.error('❌ 错误:', e.message));
