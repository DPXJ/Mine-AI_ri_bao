// ==================== 配置管理 ====================
const CONFIG_KEY = 'daily_report_config';

// 默认 AI 提示词（包含今日完成和明日计划两种场景）
const DEFAULT_AI_PROMPT = `Role: 工作日报润色专家

Background
用户输入的原始记录通常是碎片化、口语化的短语（如"平台名，功能名，具体工作"）。你需要将这些碎片信息转化为专业、客观、无主语的日报描述。

Goals
1. 准确识别工作项：用户输入通常是"项目/平台名 + 功能名 + 具体工作"的结构，正确理解并保持原意
2. 专业化重写：将口语化短语转化为专业术语，但不要曲解原意
3. 客观陈述：去除"我"、"我们"等主语，以动名词形式描述

Core Rules (核心规则)
1. 工作项是名词，不要拆解成多个动词短语，避免曲解原意
2. 用直角引号「」标注功能名称或工作重点
3. 保持简洁，一句话即可，不要过度扩展
4. 只返回润色后的内容，不要添加解释

场景判断规则
根据系统传入的【场景类型】进行处理：

【今日完成】场景：
- 使用"完成"、"产出"、"交付"等结果性动词
- 句末统一添加（已完成）
- 若包含百分比，追加（完成进度：XX%）
- 示例输入：云农谷平台，AI图片分享功能，UI设计审核
- 示例输出：完成云农谷平台「AI图片分享」功能的UI设计审核，同技术团队及UI设计同学进行沟通交流，确认调整后的设计稿。（已完成）

【明日计划】场景：
- 使用"计划"、"推进"、"开展"、"继续"等计划性动词开头
- 句末统一添加（计划完成：100%）或用户指定的百分比
- 示例输入：实现用户中心
- 示例输出：计划推进「用户中心」功能的开发与实现，完成核心模块的编码和调试工作。（计划完成：100%）`;

// 获取配置
function getConfig() {
  const config = localStorage.getItem(CONFIG_KEY);
  return config ? JSON.parse(config) : {
    apiKey: '',
    model: 'glm-4-flash',
    companyName: '',
    jobTitle: '',
    customPrompt: '',
    feishuEnabled: false,
    feishuAppId: '',
    feishuAppSecret: '',
    feishuAppToken: '',
    feishuTableId: ''
  };
}

// 保存配置
function saveConfig(config) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}

// ==================== DOM 元素 ====================
const elements = {
  // 输入
  todayInput: document.getElementById('todayInput'),
  tomorrowInput: document.getElementById('tomorrowInput'),

  // 输出
  todayOutput: document.getElementById('todayOutput'),
  tomorrowOutput: document.getElementById('tomorrowOutput'),

  // 按钮
  transformTodayBtn: document.getElementById('transformTodayBtn'),
  transformTomorrowBtn: document.getElementById('transformTomorrowBtn'),
  copyTodayBtn: document.getElementById('copyTodayBtn'),
  copyTomorrowBtn: document.getElementById('copyTomorrowBtn'),
  clearTodayBtn: document.getElementById('clearTodayBtn'),
  clearTomorrowBtn: document.getElementById('clearTomorrowBtn'),
  refreshTodayBtn: document.getElementById('refreshTodayBtn'),
  refreshTomorrowBtn: document.getElementById('refreshTomorrowBtn'),
  saveTodayBtn: document.getElementById('saveTodayBtn'),
  saveTomorrowBtn: document.getElementById('saveTomorrowBtn'),
  settingsBtn: document.getElementById('settingsBtn'),
  dateSelector: document.getElementById('dateSelector'),
  prevDayBtn: document.getElementById('prevDayBtn'),
  nextDayBtn: document.getElementById('nextDayBtn'),
  todayBtn: document.getElementById('todayBtn'),

  // 模态框
  settingsModal: document.getElementById('settingsModal'),
  closeModalBtn: document.getElementById('closeModalBtn'),
  cancelBtn: document.getElementById('cancelBtn'),
  saveBtn: document.getElementById('saveBtn'),
  apiKeyInput: document.getElementById('apiKey'),
  apiModelSelect: document.getElementById('apiModel'),

  // AI提示词配置
  companyNameInput: document.getElementById('companyName'),
  jobTitleInput: document.getElementById('jobTitle'),
  customPromptInput: document.getElementById('customPrompt'),

  // 飞书配置
  feishuEnabledInput: document.getElementById('feishuEnabled'),
  feishuConfig: document.getElementById('feishuConfig'),
  feishuAppIdInput: document.getElementById('feishuAppId'),
  feishuAppSecretInput: document.getElementById('feishuAppSecret'),
  feishuAppTokenInput: document.getElementById('feishuAppToken'),
  feishuTableIdInput: document.getElementById('feishuTableId'),
  feishuHelpBtn: document.getElementById('feishuHelpBtn'),
  feishuHelpModal: document.getElementById('feishuHelpModal'),
  closeHelpBtn: document.getElementById('closeHelpBtn'),
  resetPromptBtn: document.getElementById('resetPromptBtn')
};

// ==================== GLM API 调用 ====================
async function callGLMAPI(text, config, type = 'today') {
  const apiUrl = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';

  // 构建提示词：优先使用自定义提示词，否则使用默认提示词
  let prompt = config.customPrompt || DEFAULT_AI_PROMPT;
  prompt += '\n\n';

  // 添加场景类型
  const sceneType = type === 'tomorrow' ? '明日计划' : '今日完成';
  prompt += `【场景类型】${sceneType}\n\n`;

  // 添加岗位信息（用于调整专业术语和表达风格）
  if (config.jobTitle) {
    prompt += `【用户岗位】${config.jobTitle}，请根据该岗位特点适当调整专业术语和表达风格。\n\n`;
  }

  prompt += `【原始内容】${text}`;

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        model: config.model,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 200
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || `API请求失败: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0].message.content.trim();
  } catch (error) {
    console.error('GLM API调用失败:', error);
    throw error;
  }
}

// ==================== 飞书 API 调用 ====================
// 获取代理服务地址（自动检测环境）
function getProxyUrl() {
  const hostname = window.location.hostname;

  // 本地开发环境：使用本地代理
  if (hostname === 'localhost' || hostname === '127.0.0.1' || window.location.protocol === 'file:') {
    return 'http://localhost:3000';
  }

  // Vercel 部署环境：使用相对路径的 API
  if (hostname.includes('vercel.app') || hostname.includes('.vercel.')) {
    return '/api/feishu-proxy';
  }

  // 其他云端环境：尝试使用相对路径
  return '/api/feishu-proxy';
}

// 检查本地代理是否可用
async function checkLocalProxy() {
  try {
    const response = await fetch('http://localhost:3000/health', {
      method: 'GET',
      signal: AbortSignal.timeout(2000) // 2秒超时
    });
    return response.ok;
  } catch {
    return false;
  }
}

// 获取飞书 tenant_access_token
async function getFeishuTenantToken(appId, appSecret) {
  const proxyUrl = getProxyUrl();
  const targetPath = '/open-apis/auth/v3/tenant_access_token/internal';
  const isLocal = proxyUrl.includes('localhost');

  try {
    console.log('【飞书调试】获取Token... 代理地址:', proxyUrl);

    // 本地模式先检查代理是否运行
    if (isLocal) {
      const proxyOk = await checkLocalProxy();
      if (!proxyOk) {
        throw new Error('LOCAL_PROXY_NOT_RUNNING');
      }
    }

    const response = await fetch(proxyUrl + targetPath, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        app_id: appId,
        app_secret: appSecret
      })
    });

    const data = await response.json();
    if (data.code !== 0) {
      throw new Error(data.msg || '获取飞书token失败');
    }
    console.log('【飞书调试】Token获取成功');
    return data.tenant_access_token;
  } catch (error) {
    console.error('【严重】飞书Token获取失败:', error);

    let errorMsg = '飞书同步失败：\n\n';

    if (error.message === 'LOCAL_PROXY_NOT_RUNNING') {
      errorMsg += '⚠️ 本地代理服务未运行！\n\n';
      errorMsg += '请先运行代理服务：\n';
      errorMsg += '1. 双击 "启动日报助手.bat"\n';
      errorMsg += '2. 或在命令行运行: node proxy.js\n\n';
      errorMsg += '然后刷新此页面重试。';
    } else if (window.location.protocol === 'file:') {
      errorMsg += '⚠️ 请勿直接双击HTML文件打开！\n\n';
      errorMsg += '正确的使用方法：\n';
      errorMsg += '1. 双击 "启动日报助手.bat" 启动服务\n';
      errorMsg += '2. 在浏览器中访问显示的地址';
    } else {
      errorMsg += error.message || '未知错误';
    }

    alert(errorMsg);
    throw error;
  }
}

// 获取今天的日期字符串 (YYYY-MM-DD)
function getTodayDateString() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// 查找指定日期的记录（支持传入目标日期，默认使用日期选择器的值）
async function findTodayRecord(config, targetDate = null) {
  if (!config.feishuAppId || !config.feishuAppToken || !config.feishuTableId) {
    console.warn('【飞书调试】配置不完整，跳过查询');
    return null;
  }

  try {
    // 优先使用传入的目标日期，其次使用日期选择器的值，最后使用今天
    const searchDate = targetDate || (elements.dateSelector ? elements.dateSelector.value : null) || getTodayDateString();
    console.group('【飞书同步】开始查找记录');
    const token = await getFeishuTenantToken(config.feishuAppId, config.feishuAppSecret);
    console.log('目标日期:', searchDate);

    // 使用统一的代理地址
    const proxyUrl = getProxyUrl();
    const targetPath = `/open-apis/bitable/v1/apps/${config.feishuAppToken}/tables/${config.feishuTableId}/records?page_size=100`;

    const response = await fetch(proxyUrl + targetPath, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    if (data.code !== 0) {
      console.error('飞书 API 报错:', data.msg);
      throw new Error(data.msg || '查询飞书记录失败');
    }

    const records = data.data?.items || [];
    console.log(`共获取到 ${records.length} 条记录`);

    const matchedRecord = records.find(record => {
      let dateField = record.fields['日期'] || record.fields['Date'] || record.fields['date'];
      if (!dateField) return false;

      // 如果是时间戳（数字类型），转换为 YYYY-MM-DD
      if (typeof dateField === 'number') {
        const d = new Date(dateField);
        dateField = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      }

      const isMatch = dateField.toString().includes(searchDate);
      if (isMatch) console.log('匹配到记录:', record.record_id);
      return isMatch;
    });

    if (!matchedRecord) console.log('未找到指定日期的记录');
    console.groupEnd();
    return matchedRecord || null;
  } catch (error) {
    console.error('【飞书调试】查找失败:', error);
    console.groupEnd();
    return null;
  }
}

// ==================== 本地存储功能 ====================
// 【本地存储】保存到浏览器本地（替代飞书同步）
function saveToLocal(todayContent, tomorrowContent) {
  const saveData = {
    date: getTodayDateString(),
    todayContent: todayContent,
    tomorrowContent: tomorrowContent,
    timestamp: new Date().getTime()
  };

  try {
    localStorage.setItem('daily_report_backup', JSON.stringify(saveData));
    console.log('✅ 数据已自动保存到本地');
  } catch (error) {
    console.error('本地保存失败:', error);
  }
}

// 从本地加载之前保存的内容（只加载指定日期的数据）
function loadFromLocal(targetDate) {
  try {
    const savedData = localStorage.getItem('daily_report_backup');
    if (!savedData) return null;

    const data = JSON.parse(savedData);
    console.log('📂 发现本地保存的数据:', data.date, '目标日期:', targetDate);

    // 只有当保存的日期与目标日期匹配时才返回数据
    if (data.date !== targetDate) {
      console.log('💡 保存的数据是其他日期的，不加载');
      return null;
    }

    return data;
  } catch (error) {
    console.error('读取本地数据失败:', error);
    return null;
  }
}

// 创建或更新飞书记录
async function syncToFeishu(config, todayContent, tomorrowContent) {
  // 始终保存到本地作为备份
  saveToLocal(todayContent, tomorrowContent);

  // 检查是否启用飞书同步
  if (!config.feishuEnabled) {
    console.log('【飞书同步】未启用飞书同步，仅保存到本地');
    return;
  }

  if (!config.feishuAppId || !config.feishuAppToken || !config.feishuTableId) {
    console.warn('【飞书同步】配置不完整，跳过同步');
    return;
  }

  try {
    console.group('【飞书同步】开始上传数据');
    const token = await getFeishuTenantToken(config.feishuAppId, config.feishuAppSecret);
    const todayDate = getTodayDateString();
    const existingRecord = await findTodayRecord(config);

    // 将日期字符串转换为时间戳（毫秒）- 飞书日期字段需要时间戳格式
    const dateTimestamp = new Date(todayDate).getTime();

    const fields = {
      '日期': dateTimestamp,
      '今日完成': todayContent,
      '明日计划': tomorrowContent
    };

    console.log('准备推送的内容:', fields);

    // 使用统一的代理地址
    const proxyUrl = getProxyUrl();
    let response;
    if (existingRecord) {
      console.log('执行【更新】操作, RecordID:', existingRecord.record_id);
      const targetPath = `/open-apis/bitable/v1/apps/${config.feishuAppToken}/tables/${config.feishuTableId}/records/${existingRecord.record_id}`;
      response = await fetch(proxyUrl + targetPath, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ fields })
      });
    } else {
      console.log('执行【新增】操作');
      const targetPath = `/open-apis/bitable/v1/apps/${config.feishuAppToken}/tables/${config.feishuTableId}/records`;
      response = await fetch(proxyUrl + targetPath, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ fields })
      });
    }

    const data = await response.json();
    if (data.code !== 0) {
      console.error('飞书 API 报错:', data.msg);
      throw new Error(data.msg || '操作失败');
    }

    console.log('🚀 飞书同步成功！');
    console.groupEnd();
  } catch (error) {
    console.error('❌ 飞书同步失败:', error);
    console.groupEnd();
  }
}

// ==================== 文本处理 ====================
async function processText(text, config, type = 'today') {
  // 按行分割,过滤空行
  const lines = text.split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);

  if (lines.length === 0) {
    return '';
  }

  // 并行处理所有行，传递类型参数
  const promises = lines.map(line => callGLMAPI(line, config, type));

  try {
    const results = await Promise.all(promises);
    // 转换为 Markdown 列表格式
    return results.map(result => `- ${result}`).join('\n');
  } catch (error) {
    throw error;
  }
}

// ==================== 辅助函数 ====================
// 获取输出区域的文本内容（带序号的项目列表格式）
function getOutputText(outputElement, withNumbers = true) {
  const items = Array.from(outputElement.children);
  if (withNumbers) {
    // 返回带序号的格式: "1. 内容"
    return items.map((li, index) => `${index + 1}. ${li.textContent}`).join('\n');
  }
  return items.map(li => li.textContent).join('\n');
}

// 优先从飞书加载数据，失败时从本地加载
async function loadFromFeishu() {
  const currentDate = elements.dateSelector.value || getTodayDateString();
  const config = getConfig();

  // 优先尝试从飞书加载（如果启用了飞书同步）
  if (config.feishuEnabled && config.feishuAppId && config.feishuAppToken && config.feishuTableId) {
    try {
      console.log('🔄 尝试从飞书加载数据，目标日期:', currentDate);
      const feishuRecord = await findTodayRecord(config, currentDate);

      if (feishuRecord && feishuRecord.fields) {
        const fields = feishuRecord.fields;
        let hasData = false;

        // 清空现有内容
        elements.todayOutput.innerHTML = '';
        elements.tomorrowOutput.innerHTML = '';

        // 加载今日完成
        if (fields['今日完成']) {
          const lines = fields['今日完成'].split('\n').filter(line => line.trim());
          lines.forEach(line => {
            const li = document.createElement('li');
            li.textContent = line.replace(/^\d+\.\s*/, ''); // 移除数字序号
            elements.todayOutput.appendChild(li);
          });
          hasData = true;
        }

        // 加载明日计划
        if (fields['明日计划']) {
          const lines = fields['明日计划'].split('\n').filter(line => line.trim());
          lines.forEach(line => {
            const li = document.createElement('li');
            li.textContent = line.replace(/^\d+\.\s*/, '');
            elements.tomorrowOutput.appendChild(li);
          });
          hasData = true;
        }

        if (hasData) {
          console.log('✅ 已从飞书加载数据');
          return;
        }
      } else {
        // 飞书中没有该日期的记录，清空显示区域
        console.log(`💡 飞书中未找到 ${currentDate} 的记录`);
        elements.todayOutput.innerHTML = '';
        elements.tomorrowOutput.innerHTML = '';
      }
    } catch (error) {
      console.warn('⚠️ 从飞书加载失败，尝试从本地加载:', error.message);
    }
  }

  // 飞书加载失败或未启用，从本地加载
  const savedData = loadFromLocal(currentDate);

  if (!savedData) {
    console.log(`💡 ${currentDate} 暂无保存数据`);
    // 清空显示区域
    elements.todayOutput.innerHTML = '';
    elements.tomorrowOutput.innerHTML = '';
    return;
  }

  try {
    // 加载今日完成
    if (savedData.todayContent) {
      const lines = savedData.todayContent.split('\n').filter(line => line.trim());
      elements.todayOutput.innerHTML = '';
      lines.forEach(line => {
        const li = document.createElement('li');
        li.textContent = line.replace(/^\d+\.\s*/, ''); // 移除数字序号
        elements.todayOutput.appendChild(li);
      });
    }

    // 加载明日计划
    if (savedData.tomorrowContent) {
      const lines = savedData.tomorrowContent.split('\n').filter(line => line.trim());
      elements.tomorrowOutput.innerHTML = '';
      lines.forEach(line => {
        const li = document.createElement('li');
        li.textContent = line.replace(/^\d+\.\s*/, '');
        elements.tomorrowOutput.appendChild(li);
      });
    }

    console.log('✅ 已从本地恢复上次保存的内容');
  } catch (error) {
    console.error('恢复本地数据失败:', error);
  }
}

// 自动同步到飞书
async function autoSyncToFeishu() {
  const config = getConfig();
  const todayText = getOutputText(elements.todayOutput);
  const tomorrowText = getOutputText(elements.tomorrowOutput);

  await syncToFeishu(config, todayText, tomorrowText);
}

// ==================== 转换功能 ====================
async function handleTransform(type) {
  const config = getConfig();

  // 检查 API Key
  if (!config.apiKey) {
    alert('请先在设置中配置 GLM API Key');
    openModal();
    return;
  }

  const inputElement = type === 'today' ? elements.todayInput : elements.tomorrowInput;
  const outputElement = type === 'today' ? elements.todayOutput : elements.tomorrowOutput;
  const btnElement = type === 'today' ? elements.transformTodayBtn : elements.transformTomorrowBtn;

  const inputText = inputElement.value.trim();

  if (!inputText) {
    alert('请输入内容');
    return;
  }

  // 显示加载状态
  btnElement.classList.add('loading');
  btnElement.disabled = true;

  try {
    // 处理文本，传递类型参数（today/tomorrow）
    const result = await processText(inputText, config, type);

    // 累加模式:将新内容添加到现有内容后面
    const lines = result.split('\n');
    lines.forEach(line => {
      const li = document.createElement('li');
      li.textContent = line.replace(/^-\s*/, ''); // 移除开头的 "- "
      li.style.animation = 'fadeIn 0.5s ease';
      outputElement.appendChild(li);
    });

    // 清空输入框
    inputElement.value = '';

    // 自动同步到飞书
    await autoSyncToFeishu();

  } catch (error) {
    alert(`转换失败: ${error.message}\n\n请检查:\n1. API Key 是否正确\n2. 网络连接是否正常\n3. API 额度是否充足`);
    console.error('转换错误:', error);
  } finally {
    // 恢复按钮状态
    btnElement.classList.remove('loading');
    btnElement.disabled = false;
  }
}

// ==================== 复制功能 ====================
async function copyToClipboard(outputElement, button) {
  // 从 ul 元素中提取所有 li 的文本
  const items = Array.from(outputElement.children);

  if (items.length === 0) {
    alert('没有可复制的内容');
    return;
  }

  // 转换为 Markdown 数字列表格式
  const text = items.map((li, index) => `${index + 1}. ${li.textContent}`).join('\n');

  try {
    await navigator.clipboard.writeText(text);

    // 显示复制成功状态 - 保留原有的HTML内容
    const originalHTML = button.innerHTML;
    button.innerHTML = '✓ 已复制';
    button.classList.add('copied');

    setTimeout(() => {
      button.innerHTML = originalHTML;
      button.classList.remove('copied');
    }, 2000);
  } catch (error) {
    // 降级方案:使用传统方法
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();

    try {
      document.execCommand('copy');
      const originalHTML = button.innerHTML;
      button.innerHTML = '✓ 已复制';
      button.classList.add('copied');
      setTimeout(() => {
        button.innerHTML = originalHTML;
        button.classList.remove('copied');
      }, 2000);
    } catch (err) {
      alert('复制失败,请手动复制');
    }

    document.body.removeChild(textarea);
  }
}

// ==================== 清空功能 ====================
function clearOutput(outputElement) {
  if (outputElement.children.length === 0) {
    return;
  }

  if (confirm('确定要清空内容吗?')) {
    outputElement.innerHTML = '';
  }
}

// ==================== 手动保存功能 ====================
async function saveOutput(type) {
  const outputElement = type === 'today' ? elements.todayOutput : elements.tomorrowOutput;
  const btnElement = type === 'today' ? elements.saveTodayBtn : elements.saveTomorrowBtn;

  // 获取当前编辑后的内容（带序号）
  const todayText = getOutputText(elements.todayOutput, true);
  const tomorrowText = getOutputText(elements.tomorrowOutput, true);

  // 保存到本地
  saveToLocal(todayText, tomorrowText);

  // 同步到飞书
  const config = getConfig();
  if (config.feishuEnabled) {
    await syncToFeishu(config, todayText, tomorrowText);
  }

  // 显示保存成功状态
  btnElement.classList.add('saved');
  btnElement.title = '✓ 已保存';

  setTimeout(() => {
    btnElement.classList.remove('saved');
    btnElement.title = '保存修改';
  }, 2000);
}

// ==================== 刷新功能 ==
async function handleRefresh(type) {
  const config = getConfig();

  // 检查 API Key
  if (!config.apiKey) {
    alert('请先在设置中配置 GLM API Key');
    openModal();
    return;
  }

  const outputElement = type === 'today' ? elements.todayOutput : elements.tomorrowOutput;
  const btnElement = type === 'today' ? elements.refreshTodayBtn : elements.refreshTomorrowBtn;

  // 检查是否有内容
  if (outputElement.children.length === 0) {
    alert('没有可刷新的内容');
    return;
  }

  // 获取当前所有内容
  const items = Array.from(outputElement.children);
  const currentTexts = items.map(li => li.textContent);

  // 显示加载状态
  btnElement.classList.add('loading');
  btnElement.disabled = true;

  try {
    // 并行处理所有行,重新润色，传递类型参数
    const promises = currentTexts.map(text => callGLMAPI(text, config, type));
    const results = await Promise.all(promises);

    // 清空并重新填充
    outputElement.innerHTML = '';
    results.forEach(result => {
      const li = document.createElement('li');
      li.textContent = result;
      li.style.animation = 'fadeIn 0.5s ease';
      outputElement.appendChild(li);
    });

    // 自动同步到飞书
    await autoSyncToFeishu();

  } catch (error) {
    alert(`刷新失败: ${error.message}\n\n请检查:\n1. API Key 是否正确\n2. 网络连接是否正常\n3. API 额度是否充足`);
    console.error('刷新错误:', error);
  } finally {
    // 恢复按钮状态
    btnElement.classList.remove('loading');
    btnElement.disabled = false;
  }
}


// ==================== 模态框管理 ====================
function openModal() {
  const config = getConfig();
  elements.apiKeyInput.value = config.apiKey;
  elements.apiModelSelect.value = config.model;

  // 加载AI提示词配置
  if (elements.companyNameInput) elements.companyNameInput.value = config.companyName || '';
  if (elements.jobTitleInput) elements.jobTitleInput.value = config.jobTitle || '';
  if (elements.customPromptInput) elements.customPromptInput.value = config.customPrompt || '';

  // 加载飞书配置
  if (elements.feishuEnabledInput) {
    elements.feishuEnabledInput.checked = config.feishuEnabled || false;
    // 使用 classList 操作 hidden 类（因为 CSS 中 .hidden 有 !important）
    if (config.feishuEnabled) {
      elements.feishuConfig.classList.remove('hidden');
    } else {
      elements.feishuConfig.classList.add('hidden');
    }
  }
  elements.feishuAppIdInput.value = config.feishuAppId || '';
  elements.feishuAppSecretInput.value = config.feishuAppSecret || '';
  elements.feishuAppTokenInput.value = config.feishuAppToken || '';
  elements.feishuTableIdInput.value = config.feishuTableId || '';

  elements.settingsModal.classList.add('active');
}

function closeModal() {
  elements.settingsModal.classList.remove('active');
}

function saveSettings() {
  const apiKey = elements.apiKeyInput.value.trim();
  const model = elements.apiModelSelect.value;

  if (!apiKey) {
    alert('请输入 API Key');
    return;
  }

  // 保存所有配置
  const config = {
    apiKey,
    model,
    companyName: elements.companyNameInput ? elements.companyNameInput.value.trim() : '',
    jobTitle: elements.jobTitleInput ? elements.jobTitleInput.value.trim() : '',
    customPrompt: elements.customPromptInput ? elements.customPromptInput.value.trim() : '',
    feishuEnabled: elements.feishuEnabledInput ? elements.feishuEnabledInput.checked : false,
    feishuAppId: elements.feishuAppIdInput.value.trim(),
    feishuAppSecret: elements.feishuAppSecretInput.value.trim(),
    feishuAppToken: elements.feishuAppTokenInput.value.trim(),
    feishuTableId: elements.feishuTableIdInput.value.trim()
  };

  saveConfig(config);
  closeModal();

  // 显示保存成功提示
  const originalText = elements.settingsBtn.textContent;
  elements.settingsBtn.textContent = '✓ 已保存';
  setTimeout(() => {
    elements.settingsBtn.textContent = originalText;
  }, 2000);
}

// ==================== 事件监听 ====================
// 转换按钮
elements.transformTodayBtn.addEventListener('click', () => handleTransform('today'));
elements.transformTomorrowBtn.addEventListener('click', () => handleTransform('tomorrow'));

// 复制按钮
elements.copyTodayBtn.addEventListener('click', () => {
  copyToClipboard(elements.todayOutput, elements.copyTodayBtn);
});

elements.copyTomorrowBtn.addEventListener('click', () => {
  copyToClipboard(elements.tomorrowOutput, elements.copyTomorrowBtn);
});

// 清空按钮
elements.clearTodayBtn.addEventListener('click', () => {
  clearOutput(elements.todayOutput);
});

elements.clearTomorrowBtn.addEventListener('click', () => {
  clearOutput(elements.tomorrowOutput);
});

// 刷新按钮
elements.refreshTodayBtn.addEventListener('click', () => {
  handleRefresh('today');
});

elements.refreshTomorrowBtn.addEventListener('click', () => {
  handleRefresh('tomorrow');
});

// 保存按钮
elements.saveTodayBtn.addEventListener('click', () => {
  saveOutput('today');
});

elements.saveTomorrowBtn.addEventListener('click', () => {
  saveOutput('tomorrow');
});

// 设置按钮
elements.settingsBtn.addEventListener('click', openModal);
elements.closeModalBtn.addEventListener('click', closeModal);
elements.cancelBtn.addEventListener('click', closeModal);
elements.saveBtn.addEventListener('click', saveSettings);

// 点击模态框外部关闭
elements.settingsModal.addEventListener('click', (e) => {
  if (e.target === elements.settingsModal) {
    closeModal();
  }
});

// 键盘快捷键
document.addEventListener('keydown', (e) => {
  // Esc 关闭模态框
  if (e.key === 'Escape' && elements.settingsModal.classList.contains('active')) {
    closeModal();
  }

  // Ctrl/Cmd + Enter 执行转换
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    e.preventDefault(); // 阻止默认行为

    // 根据当前焦点判断转换哪个
    const activeElement = document.activeElement;
    if (activeElement === elements.todayInput) {
      handleTransform('today');
    } else if (activeElement === elements.tomorrowInput) {
      handleTransform('tomorrow');
    }
  }
});

// ==================== 初始化 ====================
// 初始化日期选择器和加载数据
window.addEventListener('load', async () => {
  const config = getConfig();

  // 设置日期选择器为今天
  const today = getTodayDateString();
  if (elements.dateSelector) {
    elements.dateSelector.value = today;
    elements.dateSelector.max = today; // 限制最大日期为今天
  }

  // 尝试加载今天的数据（从本地）
  await loadFromFeishu();

  if (!config.apiKey) {
    setTimeout(() => {
      alert('欢迎使用工作日报润色助手!\n\n请先配置 GLM API Key 以使用 AI 润色功能。');
      openModal();
    }, 500);
  }
});

// 日期选择器变化时，加载对应日期的数据
if (elements.dateSelector) {
  elements.dateSelector.addEventListener('change', async () => {
    await loadFromFeishu();
  });
}

// 添加淡入动画样式
const style = document.createElement('style');
style.textContent = `
  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;
document.head.appendChild(style);

// ==================== 标签页切换 ====================
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const tabName = btn.dataset.tab;

    // 切换标签按钮状态
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    // 切换标签内容
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    document.getElementById(`tab-${tabName}`).classList.add('active');
  });
});

// ==================== 飞书开关 ====================
if (elements.feishuEnabledInput) {
  elements.feishuEnabledInput.addEventListener('change', (e) => {
    // 使用 classList 操作 hidden 类（因为 CSS 中 .hidden 有 !important）
    if (e.target.checked) {
      elements.feishuConfig.classList.remove('hidden');
    } else {
      elements.feishuConfig.classList.add('hidden');
    }
  });
}

// ==================== 飞书帮助弹窗 ====================
if (elements.feishuHelpBtn) {
  elements.feishuHelpBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    elements.feishuHelpModal.classList.remove('hidden');
  });
}

if (elements.closeHelpBtn) {
  elements.closeHelpBtn.addEventListener('click', () => {
    elements.feishuHelpModal.classList.add('hidden');
  });
}

// 点击帮助弹窗外部关闭
if (elements.feishuHelpModal) {
  elements.feishuHelpModal.addEventListener('click', (e) => {
    if (e.target === elements.feishuHelpModal) {
      elements.feishuHelpModal.classList.add('hidden');
    }
  });
}

// ==================== 恢复默认提示词 ====================
if (elements.resetPromptBtn) {
  elements.resetPromptBtn.addEventListener('click', () => {
    if (elements.customPromptInput) {
      elements.customPromptInput.value = DEFAULT_AI_PROMPT;
    }
  });
}

// ==================== 日期导航按钮 ====================
// 切换到前一天
if (elements.prevDayBtn) {
  elements.prevDayBtn.addEventListener('click', async () => {
    if (elements.dateSelector) {
      const currentDate = new Date(elements.dateSelector.value);
      currentDate.setDate(currentDate.getDate() - 1);
      const newDateStr = formatDateToString(currentDate);
      elements.dateSelector.value = newDateStr;
      await loadFromFeishu();
    }
  });
}

// 切换到后一天
if (elements.nextDayBtn) {
  elements.nextDayBtn.addEventListener('click', async () => {
    if (elements.dateSelector) {
      const currentDate = new Date(elements.dateSelector.value);
      const today = new Date();
      currentDate.setDate(currentDate.getDate() + 1);

      // 不允许超过今天
      if (currentDate <= today) {
        const newDateStr = formatDateToString(currentDate);
        elements.dateSelector.value = newDateStr;
        await loadFromFeishu();
      }
    }
  });
}

// 切换到今天
if (elements.todayBtn) {
  elements.todayBtn.addEventListener('click', async () => {
    if (elements.dateSelector) {
      const todayStr = getTodayDateString();
      if (elements.dateSelector.value !== todayStr) {
        elements.dateSelector.value = todayStr;
        await loadFromFeishu();
      }
    }
  });
}

// 日期格式化辅助函数
function formatDateToString(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

