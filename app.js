// ==================== 配置管理 ====================
const CONFIG_KEY = 'daily_report_config';

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
  settingsBtn: document.getElementById('settingsBtn'),

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
  closeHelpBtn: document.getElementById('closeHelpBtn')
};

// ==================== GLM API 调用 ====================
async function callGLMAPI(text, config) {
  const apiUrl = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';

  // 构建基础提示词
  let prompt = '请将以下简短的工作描述扩展为一句完整、专业的工作汇报。保持简洁,不要过度扩展,一句话即可。只返回扩展后的内容,不要添加任何其他说明。\n\n';

  // 添加公司/产品名称信息
  if (config.companyName) {
    prompt += `公司/产品名称: ${config.companyName}\n`;
  }

  // 添加岗位/职责信息
  if (config.jobTitle) {
    prompt += `岗位/职责: ${config.jobTitle}\n`;
  }

  // 添加自定义提示词
  if (config.customPrompt) {
    prompt += `\n${config.customPrompt}\n`;
  }

  prompt += `\n原始内容: ${text}`;

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
// 获取飞书 tenant_access_token
async function getFeishuTenantToken(appId, appSecret) {
  try {
    const response = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
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
    return data.tenant_access_token;
  } catch (error) {
    console.error('获取飞书token失败:', error);
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

// 查找今天的记录
async function findTodayRecord(config) {
  if (!config.feishuAppId || !config.feishuAppToken || !config.feishuTableId) {
    return null;
  }

  try {
    const token = await getFeishuTenantToken(config.feishuAppId, config.feishuAppSecret);
    const todayDate = getTodayDateString();

    // 列出记录并查找今天的
    const response = await fetch(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${config.feishuAppToken}/tables/${config.feishuTableId}/records?page_size=100`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const data = await response.json();
    if (data.code !== 0) {
      throw new Error(data.msg || '查询飞书记录失败');
    }

    // 查找日期字段匹配今天的记录
    const records = data.data?.items || [];
    const todayRecord = records.find(record => {
      const dateField = record.fields['日期'] || record.fields['Date'] || record.fields['date'];
      return dateField && dateField.toString().includes(todayDate);
    });

    return todayRecord || null;
  } catch (error) {
    console.error('查找飞书记录失败:', error);
    return null;
  }
}

// 创建或更新飞书记录
async function syncToFeishu(config, todayContent, tomorrowContent) {
  if (!config.feishuAppId || !config.feishuAppToken || !config.feishuTableId) {
    return; // 未配置飞书，跳过同步
  }

  try {
    const token = await getFeishuTenantToken(config.feishuAppId, config.feishuAppSecret);
    const todayDate = getTodayDateString();
    const existingRecord = await findTodayRecord(config);

    const fields = {
      '日期': todayDate,
      '今日完成': todayContent,
      '明日计划': tomorrowContent
    };

    let response;
    if (existingRecord) {
      // 更新现有记录
      response = await fetch(
        `https://open.feishu.cn/open-apis/bitable/v1/apps/${config.feishuAppToken}/tables/${config.feishuTableId}/records/${existingRecord.record_id}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ fields })
        }
      );
    } else {
      // 创建新记录
      response = await fetch(
        `https://open.feishu.cn/open-apis/bitable/v1/apps/${config.feishuAppToken}/tables/${config.feishuTableId}/records`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ fields })
        }
      );
    }

    const data = await response.json();
    if (data.code !== 0) {
      throw new Error(data.msg || '同步到飞书失败');
    }

    console.log('飞书同步成功');
  } catch (error) {
    console.error('飞书同步失败:', error);
    // 不抛出错误，避免影响主流程
  }
}

// ==================== 文本处理 ====================
async function processText(text, config) {
  // 按行分割,过滤空行
  const lines = text.split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);

  if (lines.length === 0) {
    return '';
  }

  // 并行处理所有行
  const promises = lines.map(line => callGLMAPI(line, config));

  try {
    const results = await Promise.all(promises);
    // 转换为 Markdown 列表格式
    return results.map(result => `- ${result}`).join('\n');
  } catch (error) {
    throw error;
  }
}

// ==================== 辅助函数 ====================
// 获取输出区域的文本内容
function getOutputText(outputElement) {
  const items = Array.from(outputElement.children);
  return items.map(li => li.textContent).join('\n');
}

// 从飞书加载今天的数据
async function loadFromFeishu() {
  const config = getConfig();
  if (!config.feishuAppId || !config.feishuAppToken || !config.feishuTableId) {
    return; // 未配置飞书，跳过
  }

  try {
    const record = await findTodayRecord(config);
    if (record && record.fields) {
      // 加载今日完成
      const todayContent = record.fields['今日完成'] || '';
      if (todayContent) {
        const lines = todayContent.split('\n').filter(line => line.trim());
        elements.todayOutput.innerHTML = '';
        lines.forEach(line => {
          const li = document.createElement('li');
          li.textContent = line;
          elements.todayOutput.appendChild(li);
        });
      }

      // 加载明日计划
      const tomorrowContent = record.fields['明日计划'] || '';
      if (tomorrowContent) {
        const lines = tomorrowContent.split('\n').filter(line => line.trim());
        elements.tomorrowOutput.innerHTML = '';
        lines.forEach(line => {
          const li = document.createElement('li');
          li.textContent = line;
          elements.tomorrowOutput.appendChild(li);
        });
      }

      console.log('从飞书加载数据成功');
    }
  } catch (error) {
    console.error('从飞书加载数据失败:', error);
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
    // 处理文本
    const result = await processText(inputText, config);

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

    // 显示复制成功状态
    const originalText = button.textContent;
    button.textContent = '✓ 已复制';
    button.classList.add('copied');

    setTimeout(() => {
      button.textContent = originalText;
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
      button.textContent = '✓ 已复制';
      button.classList.add('copied');
      setTimeout(() => {
        button.textContent = '📋 复制';
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
    elements.feishuConfig.style.display = config.feishuEnabled ? 'block' : 'none';
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
// 检查是否已配置 API Key，并从飞书加载数据
window.addEventListener('load', async () => {
  const config = getConfig();

  // 尝试从飞书加载今天的数据
  await loadFromFeishu();

  if (!config.apiKey) {
    setTimeout(() => {
      alert('欢迎使用工作日报润色助手!\n\n请先配置 GLM API Key 以使用 AI 润色功能。');
      openModal();
    }, 500);
  }
});

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
    if (e.target.checked) {
      elements.feishuConfig.style.display = 'block';
    } else {
      elements.feishuConfig.style.display = 'none';
    }
  });
}

// ==================== 飞书帮助弹窗 ====================
if (elements.feishuHelpBtn) {
  elements.feishuHelpBtn.addEventListener('click', (e) => {
    e.preventDefault();
    elements.feishuHelpModal.style.display = 'flex';
  });
}

if (elements.closeHelpBtn) {
  elements.closeHelpBtn.addEventListener('click', () => {
    elements.feishuHelpModal.style.display = 'none';
  });
}

// 点击帮助弹窗外部关闭
if (elements.feishuHelpModal) {
  elements.feishuHelpModal.addEventListener('click', (e) => {
    if (e.target === elements.feishuHelpModal) {
      elements.feishuHelpModal.style.display = 'none';
    }
  });
}
