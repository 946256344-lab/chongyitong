#!/usr/bin/env python3
"""
宠医通 · 报告生成智能体
─────────────────────────────
用法：
  python3 report_agent.py               # 交互式引导输入
  python3 report_agent.py case.json     # 从 JSON 文件读取
  python3 report_agent.py --demo        # 用内置示例运行

环境变量：
  ANTHROPIC_API_KEY=sk-ant-...
"""

import json, sys, os, re, io, zipfile, textwrap
import urllib.request, urllib.error
from datetime import datetime

# ══════════════════════════════════════════════════════════
#  配置
# ══════════════════════════════════════════════════════════
API_KEY  = os.environ.get('ANTHROPIC_API_KEY', '')
MODEL    = 'claude-sonnet-4-6'
OUT_DIR  = os.path.expanduser('~/Desktop/')   # 输出到桌面（WSL 下指向 Windows）
WIN_DESK = '/mnt/c/Users/Administrator/Desktop/'
if os.path.exists(WIN_DESK):
    OUT_DIR = WIN_DESK

# ══════════════════════════════════════════════════════════
#  示例输入（--demo 模式）
# ══════════════════════════════════════════════════════════
DEMO_CASE = {
    "pet": {
        "species": "猫",
        "breed": "英国短毛猫",
        "age": 6,
        "weight_kg": 5.8,
        "sex": "雄性·已绝育",
        "chief_complaint": "年度体检发现心脏杂音（Ⅱ级），偶有轻度呼吸急促",
        "medical_history": "无既往病史，疫苗接种完整"
    },
    "clinic": {
        "hospital": "北京某宠物专科医院心脏科",
        "vet": "心脏专科医生",
        "report_type": "心脏超声（心动图）"
    },
    "medical_data": """
心动图关键参数：
- 室间隔厚度 IVSd：6.8 mm（参考 ≤5.5 mm）
- 左室后壁厚度 LVPWd：6.2 mm（参考 ≤5.5 mm）
- 左心房/主动脉比值 LA/Ao：1.52（参考 <1.5）
- 射血分数 EF：68%（参考 >50%，正常）
- SAM 现象：阴性（无左室流出道梗阻）
- 初步诊断：非梗阻性肥厚性心肌病（HCM）
""",
    "owner_concerns": "主人非常担心频繁就医对猫咪造成应激，预算中等，最重视猫咪当下的生活质量而非延长寿命。对用药有顾虑，希望充分了解再决定。"
}

# ══════════════════════════════════════════════════════════
#  Claude API 调用（纯 urllib，无需第三方库）
# ══════════════════════════════════════════════════════════
SYSTEM_PROMPT = """你是一位资深兽医内科专家，同时也是出色的医患沟通翻译者。

你的任务：根据宠物医疗数据，输出一份严格遵循格式的 JSON 分析报告，用于生成专业的《宠物医疗决策导航报告》。

**核心原则**：
1. 预后数据必须来自已发表的同行评审兽医文献，不得捏造数字
2. 犬猫预后数据绝对不可混用
3. 路径分析客观中立，不得推荐或劝导
4. 异常指标偏离分级：轻度 <30%、中度 30–100%、重度 >100% 或临床危急
5. 费用范围以人民币（¥）估算，覆盖中国主要城市二三级宠物医院水平
6. 所有字段必须是真实可用的内容，禁止留空或填"待填写"

**严格输出 JSON，不要有任何前缀或后缀文字。**
"""

def call_claude(user_message: str) -> str:
    if not API_KEY:
        raise RuntimeError('未设置 ANTHROPIC_API_KEY 环境变量。请运行：export ANTHROPIC_API_KEY=sk-ant-...')

    payload = json.dumps({
        'model': MODEL,
        'max_tokens': 6000,
        'system': SYSTEM_PROMPT,
        'messages': [{'role': 'user', 'content': user_message}]
    }).encode('utf-8')

    req = urllib.request.Request(
        'https://api.anthropic.com/v1/messages',
        data=payload,
        headers={
            'x-api-key': API_KEY,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json',
        }
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            result = json.loads(resp.read().decode('utf-8'))
            return result['content'][0]['text']
    except urllib.error.HTTPError as e:
        body = e.read().decode('utf-8')
        raise RuntimeError(f'API 错误 {e.code}: {body}')

def build_prompt(case: dict) -> str:
    schema = {
        "report_id": "PM-自动生成四位年份-四位随机编号",
        "species": "犬或猫",
        "dashboard": {
            "pet_summary": "品种·年龄岁·Xkg·诊断名称+分期（一行，30字内）",
            "severity_level": "轻度|中度|重度",
            "severity_description": "一句话说明现状（不超过30字，说对宠物意味着什么）",
            "abnormal_total": 0,
            "abnormal_severe": 0,
            "abnormal_moderate": 0,
            "abnormal_mild": 0,
            "time_window": "今日急诊|24h内决策|本周内决策|可充分讨论后决策",
            "prognosis_with_treatment": "最积极治疗路径的中位生存期（带数字和单位）",
            "prognosis_without_treatment": "不治疗或纯保守路径的预期（带数字和单位）",
            "treatment_path_count": 0,
            "cost_range": "¥X – ¥X（从最低到最高路径）",
            "decision_profile_summary": "最重视[XX] → 路径[X]契合度最高",
            "next_action_timeframe": "X小时内|X天内|本周内",
            "next_action": "最关键的一个行动（不超过50字）"
        },
        "diagnosis": {
            "name": "完整诊断名称（含英文缩写）",
            "stage": "使用权威分期系统（IRIS/ACVIM/WHO/OFA等）",
            "plain_language": "用宠物家长能理解的语言解释（2-3句，避免术语）",
            "urgency_reason": "解释为什么是这个时间窗口"
        },
        "indicators": [
            {
                "name": "指标中文名（英文缩写）",
                "value": "检测值+单位",
                "reference": "参考范围（含单位）",
                "deviation": "偏离描述如 ↑24% 或 ↓15%，正常则为 正常",
                "deviation_level": "severe|moderate|mild|normal",
                "plain_meaning": "通俗解释一句话（20字内）"
            }
        ],
        "pre_treatment_checklist": [
            {
                "item": "检查项目",
                "category": "影像|血检|病理|专科会诊|其他",
                "is_done": "已完成|建议补充|视情况而定",
                "reason": "为什么需要（一句话）"
            }
        ],
        "treatment_paths": [
            {
                "label": "路径A",
                "name": "路径名称",
                "goal": "核心目标（一句话）",
                "median_survival": "中位生存期（带数字范围）",
                "quality_of_life": "常见生活质量描述（一句话）",
                "support_care": "配套支持治疗（简列）",
                "cost_range": "费用估算（¥X–X）",
                "frequency": "就医频率",
                "best_for": "适合条件",
                "challenges": "主要挑战",
                "evidence": "数据来源（作者/期刊/年份，简写即可）"
            }
        ],
        "decision_profile": {
            "owner_priority": "主人核心关切（3字以内的关键词）",
            "decision_style": "情感主导|理性主导|风险规避|积极争取",
            "budget_level": "充裕|中等|有限",
            "path_match": [
                {
                    "path": "路径X",
                    "fit": "契合之处（一句话）",
                    "tension": "潜在张力（一句话）"
                }
            ]
        },
        "questions": {
            "diagnosis_confirmation": ["问题1（含具体指标数值）", "问题2", "问题3"],
            "treatment": ["问题1", "问题2", "问题3"],
            "quality_of_life": ["问题1", "问题2", "问题3"],
            "end_of_life": ["问题1", "问题2", "问题3（含如何寻求二次意见）"]
        }
    }

    return f"""请根据以下宠物医疗案例，生成完整的 JSON 分析报告。

## 案例信息
{json.dumps(case, ensure_ascii=False, indent=2)}

## 输出格式（严格遵循，所有字段必须填入真实内容）
{json.dumps(schema, ensure_ascii=False, indent=2)}

注意：
- indicators 数组需包含所有检测指标（包括正常的），deviation_level 为 normal 的也要列出
- treatment_paths 需列出 2–3 条路径
- questions 每个类别恰好 3 条问题，问题中需引用具体数值
- 直接输出 JSON，不要任何解释文字"""

def parse_response(text: str) -> dict:
    """从 Claude 回复中提取 JSON"""
    # 尝试直接解析
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    # 尝试提取 ```json ... ``` 块
    m = re.search(r'```json\s*([\s\S]+?)\s*```', text)
    if m:
        return json.loads(m.group(1))
    # 尝试提取第一个 { ... }
    m = re.search(r'\{[\s\S]+\}', text)
    if m:
        return json.loads(m.group(0))
    raise ValueError('无法从 Claude 回复中解析 JSON')

# ══════════════════════════════════════════════════════════
#  DOCX 生成器（复用 make_report.py 的基础函数）
# ══════════════════════════════════════════════════════════
def xe(s):
    return str(s).replace('&','&amp;').replace('<','&lt;').replace('>','&gt;').replace('"','&quot;')

def rpr(bold=False, italic=False, color=None, sz=None):
    t = '<w:rPr>'
    if bold:    t += '<w:b/>'
    if italic:  t += '<w:i/>'
    if color:   t += f'<w:color w:val="{color}"/>'
    if sz:      t += f'<w:sz w:val="{sz}"/><w:szCs w:val="{sz}"/>'
    return t + '</w:rPr>'

def run(text, bold=False, italic=False, color=None, sz=20):
    return f'<w:r>{rpr(bold,italic,color,sz)}<w:t xml:space="preserve">{xe(text)}</w:t></w:r>'

def para(content_xml, align=None, after=100, indent=None):
    ppr = f'<w:spacing w:after="{after}"/>'
    if align:  ppr += f'<w:jc w:val="{align}"/>'
    if indent: ppr += f'<w:ind w:left="{indent}"/>'
    return f'<w:p><w:pPr>{ppr}</w:pPr>{content_xml}</w:p>'

def empty():
    return '<w:p><w:pPr><w:spacing w:after="60"/></w:pPr></w:p>'

def hr():
    return '<w:p><w:pPr><w:pBdr><w:bottom w:val="single" w:sz="6" w:space="1" w:color="BBBBBB"/></w:pBdr><w:spacing w:after="100"/></w:pPr></w:p>'

def h1(text, color='1F3864'):
    return para(run(text, bold=True, sz=30, color=color), after=140)

def h2(text, color='2E74B5'):
    return para(run(text, bold=True, sz=24, color=color), after=100)

def p(text, indent=0):
    return para(run(text, sz=20), after=80, indent=indent or None)

def li(text, num='•'):
    return para(run(f'{num}  {text}', sz=20), after=60, indent=360)

def tc(text, w, fill=None, bold=False, color=None, sz=20, span=1, align=None, italic=False):
    shd = f'<w:shd w:val="clear" w:color="auto" w:fill="{fill}"/>' if fill else ''
    tcp = f'<w:tcPr><w:tcW w:w="{w}" w:type="dxa"/>{shd}<w:vAlign w:val="center"/>'
    if span > 1: tcp += f'<w:gridSpan w:val="{span}"/>'
    tcp += '</w:tcPr>'
    rp = rpr(bold=bold, color=color, sz=sz, italic=italic)
    ja = f'<w:jc w:val="{align}"/>' if align else ''
    return (f'<w:tc>{tcp}'
            f'<w:p><w:pPr><w:spacing w:after="60"/>{ja}</w:pPr>'
            f'<w:r>{rp}<w:t xml:space="preserve">{xe(text)}</w:t></w:r></w:p></w:tc>')

def tr(*cells):
    return f'<w:tr>{"".join(cells)}</w:tr>'

def tbl(*rows, width=9000):
    b = lambda s: f'<w:{s} w:val="single" w:sz="4" w:space="0" w:color="BBBBBB"/>'
    bdr = f'<w:tblBorders>{b("top")}{b("left")}{b("bottom")}{b("right")}{b("insideH")}{b("insideV")}</w:tblBorders>'
    mar = '<w:tblCellMar><w:top w:w="80" w:type="dxa"/><w:left w:w="120" w:type="dxa"/><w:bottom w:w="80" w:type="dxa"/><w:right w:w="120" w:type="dxa"/></w:tblCellMar>'
    pr  = f'<w:tblPr><w:tblW w:w="{width}" w:type="dxa"/>{bdr}{mar}</w:tblPr>'
    return f'<w:tbl>{pr}{"".join(rows)}</w:tbl>'

def box(paras_xml, fill='FFF8DC', border='F9A825'):
    b = lambda s: f'<w:{s} w:val="single" w:sz="12" w:space="0" w:color="{border}"/>'
    bdr = f'<w:tblBorders>{b("top")}{b("left")}{b("bottom")}{b("right")}</w:tblBorders>'
    shd = f'<w:shd w:val="clear" w:color="auto" w:fill="{fill}"/>'
    pr  = f'<w:tblPr><w:tblW w:w="9000" w:type="dxa"/>{bdr}</w:tblPr>'
    tcp = f'<w:tcPr><w:tcW w:w="9000" w:type="dxa"/>{shd}</w:tcPr>'
    return f'<w:tbl>{pr}<w:tr><w:tc>{tcp}{paras_xml}</w:tc></w:tr></w:tbl>'

# ── 严重程度颜色映射 ──
SEVERITY_COLORS = {
    '轻度': ('E8F5E9', '2E7D32'),
    '中度': ('FFF8E1', 'F57F17'),
    '重度': ('FFEBEE', 'C62828'),
}
DEVIATION_COLORS = {
    'severe':   ('FFD7D7', 'C00000'),
    'moderate': ('FFF3CD', 'E65100'),
    'mild':     ('FFFDE7', 'F9A825'),
    'normal':   ('F5F5F5', '444444'),
}
DEVIATION_LABELS = {
    'severe': '重度', 'moderate': '中度', 'mild': '轻度', 'normal': '正常',
}

# ══════════════════════════════════════════════════════════
#  报告构建：将 Claude 输出的 JSON 渲染为 docx body
# ══════════════════════════════════════════════════════════
def build_docx_body(d: dict, case: dict) -> str:
    out = []
    W = out.append

    dash = d.get('dashboard', {})
    diag = d.get('diagnosis', {})
    inds = d.get('indicators', [])
    paths= d.get('treatment_paths', [])
    qs   = d.get('questions', {})
    dp   = d.get('decision_profile', {})
    pre  = d.get('pre_treatment_checklist', [])

    report_id = d.get('report_id', f"PM-{datetime.now().strftime('%Y-%m%d')}")
    now_str   = datetime.now().strftime('%Y-%m-%d %H:%M')
    species   = d.get('species', case.get('pet', {}).get('species', ''))

    # ── 封面 ──────────────────────────────────────────────
    W(para(run('宠医通  Pet Med-Pal', bold=True, sz=18, color='888888'), align='center', after=60))
    W(para(run('宠物医疗决策导航报告', bold=True, sz=44, color='1F3864'), align='center', after=80))
    W(para(run('Pet Medical Decision Navigator', italic=True, sz=22, color='2E74B5'), align='center', after=60))
    W(para(run(f'报告编号：{report_id}　　生成时间：{now_str}　　物种：{species}',
               sz=18, color='888888'), align='center', after=200))
    W(hr())

    # ── 零、致用户信 ──────────────────────────────────────
    W(h1('零 · 致用户'))
    dq = '\u201c决策副驾\u201d'
    inner = (
        f'<w:p><w:pPr><w:spacing w:after="100"/></w:pPr>{run("亲爱的宠物家长：", bold=True, sz=20)}</w:p>'
        f'<w:p><w:pPr><w:spacing w:after="100"/><w:ind w:firstLine="400"/></w:pPr>'
        f'{run("此刻您正面对一份也许充满陌生术语的医疗报告，和一个没有标准答案的艰难选择。这份手册的唯一目的，是做您的", sz=20)}'
        f'{run(dq, bold=True, sz=20)}'
        f'{run("——帮您看懂数字，理清选项，并在您走进诊室时，知道该问出哪些最关键的问题。", sz=20)}</w:p>'
        f'<w:p><w:pPr><w:spacing w:after="60"/><w:ind w:firstLine="400"/></w:pPr>'
        f'{run("我们不会替您或您的医生做决定。任何医疗选择都必须由您与信任的兽医共同完成。", sz=20, italic=True, color="555555")}</w:p>'
    )
    W(box(inner, fill='EBF3FB', border='2E74B5'))
    W(empty())

    # ── 一、重要声明 ──────────────────────────────────────
    W(h1('一 · 重要声明'))
    for label, text in [
        ('数据来源',   '所有预后数据来源于公开发表的同行评审兽医学文献，仅为信息摘要'),
        ('非个性化建议', '报告不替代执业兽医的当面诊断，具体治疗方案须由主诊兽医决定'),
        ('物种差异',   f'本报告数据适用物种：{species}。犬猫相同疾病预后差异显著，请勿混用'),
        ('决策责任',   '路径分析为中性呈现，不构成推荐。所有决策由您与主诊兽医共同负责'),
    ]:
        W(para(run(f'{label}：', bold=True, sz=20, color='C00000') + run(text, sz=20),
               after=70, indent=200))
    W(empty())

    # ── 二、快速导览 ──────────────────────────────────────
    W(h1('二 · 快速导览  — 60秒读完这一页'))
    W(p('如果您现在没有时间阅读全文，请先看以下8行摘要，每行均附可量化数据。'))
    W(empty())

    sev_level = dash.get('severity_level', '中度')
    sev_fill, sev_color = SEVERITY_COLORS.get(sev_level, ('FFF8E1','F57F17'))

    dw = [700, 1900, 6400]
    def drow(icon, label, content, ifill='FFFFFF', bold_c=False):
        return tr(
            tc(icon,    dw[0], fill=ifill,    bold=True,  sz=22, align='center'),
            tc(label,   dw[1], fill='EBF3FB', bold=True,  sz=20, color='1F3864'),
            tc(content, dw[2], fill=ifill,    bold=bold_c, sz=20),
        )

    abnorm = (f'共 {dash.get("abnormal_total","?")} 项异常：'
              f'重度 {dash.get("abnormal_severe","?")} 项 / '
              f'中度 {dash.get("abnormal_moderate","?")} 项 / '
              f'轻度 {dash.get("abnormal_mild","?")} 项  （详见第五章）')
    prognosis = (f'积极治疗：{dash.get("prognosis_with_treatment","?")}  ｜  '
                 f'保守/不治疗：{dash.get("prognosis_without_treatment","?")}')
    options = (f'{dash.get("treatment_path_count","?")} 条路径；'
               f'费用跨度 {dash.get("cost_range","?")}')

    W(tbl(
        tr(tc('',      dw[0], fill='1F3864'),
           tc('维度',  dw[1], fill='1F3864', bold=True, color='FFFFFF'),
           tc('一句话摘要（由 AI 根据您的报告生成）', dw[2], fill='1F3864', bold=True, color='FFFFFF')),
        drow('🐾', '您的宠物',   dash.get('pet_summary',''), 'D6E4F7'),
        drow('🔴', '严重程度',
             f'{sev_level} — {dash.get("severity_description","")}', sev_fill, bold_c=True),
        drow('📊', '异常指标',   abnorm, 'FFFDF0'),
        drow('⏰', '决策时间窗', dash.get('time_window',''), 'FFF0F0', bold_c=True),
        drow('📅', '预后范围',   prognosis, 'F0FBF0'),
        drow('💊', '治疗选项',   options, 'FAF0FF'),
        drow('🧠', '决策特征',   dash.get('decision_profile_summary',''), 'F0FBF0'),
        drow('🚨', '紧急信号',
             '本报告列出 7 项警示信号——任意 1 项出现请立刻急诊，不要等预约时间（详见第九章）',
             'FFF0F0', bold_c=True),
    ))
    W(empty())

    next_a = (f'<w:p><w:pPr><w:spacing w:after="80"/></w:pPr>'
              f'{run("✅  您现在最需要做的一件事", bold=True, sz=22, color="1B5E20")}</w:p>'
              f'<w:p><w:pPr><w:spacing w:after="60"/><w:ind w:left="200"/></w:pPr>'
              f'{run("在 " + dash.get("next_action_timeframe","本周内") + "内，", sz=20)}'
              f'{run(dash.get("next_action","请与主诊兽医预约复诊"), bold=True, sz=20, color="1B5E20")}'
              f'</w:p>')
    W(box(next_a, fill='E8F5E9', border='2E7D32'))
    W(empty())
    W(hr())

    # ── 三、宠物基本信息 ──────────────────────────────────
    W(h1('三 · 宠物基本信息'))
    pet  = case.get('pet', {})
    clin = case.get('clinic', {})
    w1,w2,w3,w4 = 1500,2700,1500,3300
    W(tbl(
        tr(tc('基本信息', w1+w2, fill='2E74B5', bold=True, color='FFFFFF', span=2),
           tc('本次就诊', w3+w4, fill='2E74B5', bold=True, color='FFFFFF', span=2)),
        tr(tc('品种',    w1,fill='D6E4F7',bold=True), tc(f'{pet.get("breed","")} （{species}）',w2),
           tc('主诉',    w3,fill='D6E4F7',bold=True), tc(pet.get('chief_complaint',''),w4)),
        tr(tc('性别',    w1,fill='D6E4F7',bold=True), tc(pet.get('sex',''),w2),
           tc('就诊医院',w3,fill='D6E4F7',bold=True), tc(clin.get('hospital',''),w4)),
        tr(tc('年龄/体重',w1,fill='D6E4F7',bold=True),
           tc(f'{pet.get("age","?")} 岁 / {pet.get("weight_kg","?")} kg',w2),
           tc('报告类型',w3,fill='D6E4F7',bold=True), tc(clin.get('report_type',''),w4)),
        tr(tc('既往病史',w1,fill='D6E4F7',bold=True), tc(pet.get('medical_history','无'),w2),
           tc('主诊医生',w3,fill='D6E4F7',bold=True), tc(clin.get('vet',''),w4)),
    ))
    W(empty())

    # ── 四、诊断摘要 ──────────────────────────────────────
    W(h1('四 · 诊断摘要'))
    d_inner = (
        f'<w:p><w:pPr><w:spacing w:after="80"/></w:pPr>'
        f'{run("诊断：", bold=True, sz=22, color="1F3864")}'
        f'{run(diag.get("name",""), sz=22)}'
        f'{run("　　", sz=22)}'
        f'{run("分期：", bold=True, sz=22, color="1F3864")}'
        f'{run(diag.get("stage",""), sz=22)}</w:p>'
        f'<w:p><w:pPr><w:spacing w:after="80"/></w:pPr>'
        f'{run("通俗解释：", bold=True, sz=20)}'
        f'{run(diag.get("plain_language",""), sz=20, color="333333")}</w:p>'
        f'<w:p><w:pPr><w:spacing w:after="60"/></w:pPr>'
        f'{run("时间窗口：", bold=True, sz=20)}'
        f'{run(dash.get("time_window",""), bold=True, sz=20, color="C62828")}'
        f'{run("　（" + diag.get("urgency_reason","") + "）", sz=20, color="555555")}</w:p>'
    )
    W(box(d_inner, fill='FFFDE7', border='F9A825'))
    W(empty())

    # ── 五、医疗数据解读 ──────────────────────────────────
    W(h1('五 · 医疗数据解读'))
    W(h2('5.1  异常指标总览'))
    wa = [1700,1300,1400,900,3700]
    ind_rows = [tr(
        tc('指标名称',   wa[0],fill='2E74B5',bold=True,color='FFFFFF'),
        tc('检测值',     wa[1],fill='2E74B5',bold=True,color='FFFFFF'),
        tc('参考范围',   wa[2],fill='2E74B5',bold=True,color='FFFFFF'),
        tc('偏离程度',   wa[3],fill='2E74B5',bold=True,color='FFFFFF'),
        tc('通俗含义',   wa[4],fill='2E74B5',bold=True,color='FFFFFF'),
    )]
    # 先列异常，再列正常
    sorted_inds = sorted(inds, key=lambda x: ['severe','moderate','mild','normal'].index(x.get('deviation_level','normal')))
    for ind in sorted_inds:
        dl = ind.get('deviation_level','normal')
        ifill, icolor = DEVIATION_COLORS.get(dl, ('F5F5F5','444444'))
        dlabel = DEVIATION_LABELS.get(dl, dl)
        dev_txt = ind.get('deviation','正常')
        ind_rows.append(tr(
            tc(ind.get('name',''),      wa[0], fill=ifill),
            tc(ind.get('value',''),     wa[1], fill=ifill),
            tc(ind.get('reference',''),  wa[2], fill=ifill),
            tc(f'{dlabel}\n{dev_txt}',  wa[3], fill=ifill, bold=(dl!='normal'), color=icolor),
            tc(ind.get('plain_meaning',''), wa[4], fill=ifill),
        ))
    W(tbl(*ind_rows))
    W(empty())

    W(h2('5.2  启动治疗前，请确认以下检查'))
    wb = [1600,1200,7200]
    pre_rows = [tr(
        tc('检查项目', wb[0],fill='2E74B5',bold=True,color='FFFFFF'),
        tc('状态',    wb[1],fill='2E74B5',bold=True,color='FFFFFF'),
        tc('说明',    wb[2],fill='2E74B5',bold=True,color='FFFFFF'),
    )]
    STATUS_COLOR = {'已完成':'E8F5E9','建议补充':'FFF0F0','视情况而定':'FFF8E1'}
    for i,item in enumerate(pre):
        status = item.get('is_done','建议补充')
        sf = STATUS_COLOR.get(status,'FFFFFF')
        rf = 'F8F8F8' if i%2==0 else 'FFFFFF'
        pre_rows.append(tr(
            tc(f'{item.get("category","")}\n{item.get("item","")}', wb[0], fill=rf, bold=True, sz=18),
            tc(status, wb[1], fill=sf, sz=18, bold=True),
            tc(item.get('reason',''), wb[2], fill=rf, sz=18),
        ))
    W(tbl(*pre_rows))
    W(empty())

    # ── 六、预后与路径对比 ────────────────────────────────
    W(h1('六 · 预后参考与治疗路径对比'))
    W(p(f'以下数据基于已发表兽医学文献，代表该疾病的总体统计规律。适用物种：{species}。', indent=200))
    W(empty())

    PATH_FILLS = [
        ('E8F5E9','1B5E20'),
        ('FFF8E1','E65100'),
        ('FCE4EC','880E4F'),
    ]
    wc = [1100,1100,1100,1700,1200,2800]
    path_rows = [tr(
        tc('路径',       wc[0],fill='1F3864',bold=True,color='FFFFFF'),
        tc('核心目标',   wc[1],fill='1F3864',bold=True,color='FFFFFF'),
        tc('中位生存期', wc[2],fill='1F3864',bold=True,color='FFFFFF'),
        tc('生活质量',   wc[3],fill='1F3864',bold=True,color='FFFFFF'),
        tc('费用估算',   wc[4],fill='1F3864',bold=True,color='FFFFFF'),
        tc('适合条件 / 挑战', wc[5],fill='1F3864',bold=True,color='FFFFFF'),
    )]
    for i, path in enumerate(paths):
        fill,color = PATH_FILLS[i] if i<len(PATH_FILLS) else ('F5F5F5','333333')
        chal = f'适合：{path.get("best_for","")}\n挑战：{path.get("challenges","")}'
        path_rows.append(tr(
            tc(f'{path.get("label","")}\n{path.get("name","")}', wc[0],fill=fill,bold=True,color=color,sz=18),
            tc(path.get('goal',''),          wc[1],fill=fill,sz=18),
            tc(path.get('median_survival',''), wc[2],fill=fill,sz=18),
            tc(path.get('quality_of_life',''), wc[3],fill=fill,sz=18),
            tc(f'{path.get("cost_range","")}\n{path.get("frequency","")}', wc[4],fill=fill,sz=18),
            tc(chal,                          wc[5],fill=fill,sz=18),
        ))
    # 通用支持治疗行
    sup_texts = [p.get('support_care','') for p in paths if p.get('support_care')]
    if sup_texts:
        W(tbl(*path_rows))
        W(p('通用支持治疗（适用所有路径）：' + ' ｜ '.join(dict.fromkeys(sup_texts)), indent=200))
    else:
        W(tbl(*path_rows))

    evids = [f'{p.get("label","")}: {p.get("evidence","")}'
             for p in paths if p.get('evidence')]
    if evids:
        W(p('数据来源：' + '；'.join(evids), indent=200))
    W(empty())

    # ── 七、决策画像 ──────────────────────────────────────
    W(h1('七 · 您的决策画像'))
    W(h2('7.1  决策特征'))
    owner_p = (
        f'<w:p><w:pPr><w:spacing w:after="80"/><w:ind w:firstLine="400"/></w:pPr>'
        f'{run("基于您的描述，您", sz=20)}'
        f'{run("最重视：" + dp.get("owner_priority",""), bold=True, sz=20, color="2E74B5")}'
        f'{run("，决策风格偏向", sz=20)}'
        f'{run(dp.get("decision_style",""), bold=True, sz=20)}'
        f'{run(f'，预算敏感度：{dp.get("budget_level","")}。', sz=20)}</w:p>'
        f'<w:p><w:pPr><w:spacing w:after="60"/></w:pPr>'
        f'{run("以上描述基于您的输入，仅为系统性梳理，不代表倾向性建议。", sz=18, italic=True, color="888888")}</w:p>'
    )
    W(box(owner_p, fill='F0F7FF', border='2E74B5'))
    W(empty())

    W(h2('7.2  路径匹配度分析'))
    wd = [1300,3850,3850]
    match_rows = [tr(
        tc('路径',         wd[0],fill='2E74B5',bold=True,color='FFFFFF'),
        tc('✓  与您关切契合之处', wd[1],fill='2E74B5',bold=True,color='FFFFFF'),
        tc('△  潜在张力或挑战',   wd[2],fill='2E74B5',bold=True,color='FFFFFF'),
    )]
    for i, m in enumerate(dp.get('path_match', [])):
        fill = PATH_FILLS[i][0] if i < len(PATH_FILLS) else 'F5F5F5'
        match_rows.append(tr(
            tc(m.get('path',''), wd[0],fill=fill,bold=True),
            tc(m.get('fit',''),  wd[1],fill=fill),
            tc(m.get('tension',''), wd[2],fill=fill),
        ))
    W(tbl(*match_rows))
    W(empty())

    # ── 八、沟通问题清单 ──────────────────────────────────
    W(h1('八 · 与兽医沟通的问题清单'))
    W(p('请将以下问题带入您的下次就诊。选择最困扰您的 3–5 个即可，不必全问。'))
    W(empty())

    q_sections = [
        ('关于诊断确认', '2E74B5', 'D6E4F7', qs.get('diagnosis_confirmation',[])),
        ('关于治疗方案', '1B5E20', 'E8F5E9', qs.get('treatment',[])),
        ('关于生活质量', '4A148C', 'F3E5F5', qs.get('quality_of_life',[])),
        ('关于终点关怀', 'C00000', 'FFF0F0', qs.get('end_of_life',[])),
    ]
    for sec_title, hc, fc, questions in q_sections:
        W(h2(f'  {sec_title}', color=hc))
        for i, q in enumerate(questions, 1):
            W(tbl(tr(
                tc(str(i), 300, fill=fc, bold=True, color=hc, align='center'),
                tc(q, 8700),
            )))
        W(empty())

    # ── 九、紧急就诊信号 ──────────────────────────────────
    W(h1('九 · 紧急就诊信号'))
    signals = [
        '突发呼吸困难或张口喘气（腹部起伏异常）',
        '牙龈颜色变白、发灰或发紫',
        '完全无法站立或突然倒地、抽搐',
        '持续呕吐超过 3 次，或呕血、便血',
        '24 小时以上完全不进食、不饮水、不排尿',
        '腹部急剧膨胀或触摸腹部时发出痛叫',
        '意识改变：无法认出您，对刺激无反应',
    ]
    sig_inner = (
        f'<w:p><w:pPr><w:spacing w:after="80"/></w:pPr>'
        f'{run("⚠  出现以下任意 1 项，请立刻急诊，不要等到预约时间", bold=True, sz=22, color="C00000")}</w:p>'
    )
    for s in signals:
        sig_inner += (f'<w:p><w:pPr><w:spacing w:after="60"/><w:ind w:left="300"/></w:pPr>'
                      f'{run("■  ", bold=True, sz=20, color="C00000")}{run(s, sz=20)}</w:p>')
    W(box(sig_inner, fill='FFF0F0', border='C00000'))
    W(empty())

    # ── 十、HHHHHMM 量表 ──────────────────────────────────
    W(h1('十 · 居家生活质量日常监测'))
    W(p('建议每日评分，连续 3 天低于 35 分时主动联系主诊兽医。（HHHHHMM 量表，Dr. Alice Villalobos）'))
    W(empty())
    wh = [700,3500,800,800,800,800,800,800,1000]
    hh_header = tr(
        tc('维度',    wh[0],fill='2E74B5',bold=True,color='FFFFFF'),
        tc('评估问题',wh[1],fill='2E74B5',bold=True,color='FFFFFF'),
        *[tc(f'{s}分',wh[i+2],fill='2E74B5',bold=True,color='FFFFFF',align='center')
          for i,s in enumerate([0,2,4,6,8,10])],
        tc('今日分',  wh[8],fill='2E74B5',bold=True,color='FFFFFF',align='center'),
    )
    hh_items = [
        ('Hurt 疼痛',    '疼痛是否得到控制？呼吸是否平稳？'),
        ('Hunger 食欲',  '是否主动进食？（辅助喂食≥4分）'),
        ('Hydration 水分','皮肤弹性正常？牙龈湿润？'),
        ('Hygiene 清洁', '能否保持基本清洁？有无褥疮？'),
        ('Happiness 精神','对家人/玩具/窗外有反应？'),
        ('Mobility 移动', '能否独立或辅助移动到它想去的地方？'),
        ('More 好日子',   '今天整体快乐多于痛苦吗？'),
    ]
    hh_rows = []
    for i,(dim,q) in enumerate(hh_items):
        f = 'F8F8F8' if i%2==0 else 'FFFFFF'
        hh_rows.append(tr(
            tc(dim,wh[0],fill=f,bold=True,sz=17),
            tc(q,  wh[1],fill=f,sz=17),
            *[tc('',wh[j+2],fill=f,align='center') for j in range(6)],
            tc('___',wh[8],fill=f,align='center'),
        ))
    W(tbl(hh_header,*hh_rows,
          tr(tc('总分（满分70）',sum(wh[:8]),fill='1F3864',bold=True,color='FFFFFF',span=8),
             tc('___ / 70',wh[8],fill='1F3864',bold=True,color='FFFFFF',align='center'))))
    W(empty())

    # ── 十一、免责声明 ────────────────────────────────────
    W(h1('十一 · 完整免责声明'))
    for i, d_text in enumerate([
        f'本报告由宠医通 Pet Med-Pal 根据用户提交材料及公开兽医学文献生成（报告编号：{report_id}）',
        '报告内容仅供信息参考，不构成医疗诊断、处方或治疗建议，不能替代执业兽医的当面诊断',
        '预后数据来源于已发表同行评审文献，代表统计中位数，个体预后可能与数据存在显著差异',
        '报告不考虑用户所在地区的医疗资源可及性、地区性费用差异及特定药物/设备可用性',
        '宠医通对用户根据本报告自行做出的任何医疗决策不承担法律责任',
        '如宠物情况在报告生成后发生变化，请勿继续参考本报告，应及时就诊并请求新评估',
    ], 1):
        W(para(run(f'{i}. ', bold=True, sz=18) + run(d_text, sz=18), after=60, indent=200))

    W(empty())
    W(para(run(f'© 宠医通 Pet Med-Pal　|　severepetcondition.site　|　{report_id}',
               sz=16, color='888888'), align='center', after=60))

    return ''.join(out)

# ══════════════════════════════════════════════════════════
#  打包为 .docx
# ══════════════════════════════════════════════════════════
STYLES = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults><w:rPrDefault><w:rPr>
    <w:rFonts w:ascii="微软雅黑" w:hAnsi="微软雅黑" w:eastAsia="微软雅黑" w:cs="微软雅黑"/>
    <w:sz w:val="20"/><w:szCs w:val="20"/>
  </w:rPr></w:rPrDefault></w:docDefaults>
  <w:style w:type="paragraph" w:styleId="Normal"><w:name w:val="Normal"/></w:style>
</w:styles>'''

def write_docx(body_xml: str, out_path: str):
    doc = f'''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:body>
<w:sectPr>
  <w:pgSz w:w="12240" w:h="15840"/>
  <w:pgMar w:top="1080" w:right="900" w:bottom="1080" w:left="900"/>
</w:sectPr>
{body_xml}
</w:body></w:document>'''

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, 'w', zipfile.ZIP_DEFLATED) as z:
        z.writestr('[Content_Types].xml', '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml"  ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml"   ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>''')
        z.writestr('_rels/.rels', '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>''')
        z.writestr('word/document.xml', doc)
        z.writestr('word/styles.xml', STYLES)
        z.writestr('word/_rels/document.xml.rels', '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>''')
    with open(out_path, 'wb') as f:
        f.write(buf.getvalue())

# ══════════════════════════════════════════════════════════
#  交互式输入引导
# ══════════════════════════════════════════════════════════
def interactive_input() -> dict:
    print('\n' + '═'*50)
    print('  宠医通 · 报告生成智能体  (交互模式)')
    print('═'*50)
    def ask(prompt, default=''):
        val = input(f'  {prompt}：').strip()
        return val or default

    return {
        'pet': {
            'species':         ask('物种 (猫/犬)', '猫'),
            'breed':           ask('品种'),
            'age':             ask('年龄（岁）'),
            'weight_kg':       ask('体重（kg）'),
            'sex':             ask('性别（雄性已绝育 / 雌性已绝育 / 雄性未绝育 / 雌性未绝育）'),
            'chief_complaint': ask('主诉（就诊主要原因）'),
            'medical_history': ask('既往病史（无则直接回车）', '无'),
        },
        'clinic': {
            'hospital':    ask('就诊医院'),
            'vet':         ask('主诊医生/科室'),
            'report_type': ask('报告类型（血检/超声/X光/病理等）'),
        },
        'medical_data':    ask('请粘贴或描述医疗数据（指标数值、诊断结论等）'),
        'owner_concerns':  ask('主人最关切的问题、预算情况、生活质量偏好等'),
    }

# ══════════════════════════════════════════════════════════
#  主入口
# ══════════════════════════════════════════════════════════
def main():
    # 1. 读取输入
    if len(sys.argv) > 1 and sys.argv[1] == '--demo':
        case = DEMO_CASE
        print('▶  使用内置示例案例（英短猫 HCM）')
    elif len(sys.argv) > 1:
        path = sys.argv[1]
        with open(path, encoding='utf-8') as f:
            case = json.load(f)
        print(f'▶  从文件读取：{path}')
    else:
        case = interactive_input()

    # 2. 调用 Claude 分析
    print('\n⏳  正在调用 Claude 分析报告（约 20–40 秒）...')
    prompt = build_prompt(case)
    raw = call_claude(prompt)

    # 3. 解析 JSON
    print('⏳  解析分析结果...')
    try:
        data = parse_response(raw)
    except Exception as e:
        err_path = OUT_DIR + 'claude_raw_output.txt'
        with open(err_path, 'w', encoding='utf-8') as f:
            f.write(raw)
        print(f'❌  JSON 解析失败：{e}')
        print(f'    原始输出已保存至：{err_path}')
        sys.exit(1)

    # 4. 生成 .docx
    print('⏳  生成报告文档...')
    body = build_docx_body(data, case)
    rid   = data.get('report_id', f"PM-{datetime.now().strftime('%Y%m%d-%H%M')}")
    pet_b = case.get('pet', {}).get('breed', '宠物')
    fname = f'宠医通报告_{pet_b}_{rid}.docx'
    out_path = OUT_DIR + fname

    write_docx(body, out_path)

    kb = os.path.getsize(out_path) // 1024
    print(f'\n✅  报告已生成！')
    print(f'   📄  {out_path}')
    print(f'   📦  大小：{kb} KB')
    print(f'   🔖  报告编号：{rid}')

if __name__ == '__main__':
    main()
