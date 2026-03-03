#!/usr/bin/env python3
"""
Pet Med-Pal Report Filler
─────────────────────────
用法:
  python3 fill_report.py --demo          # 内置示例
  python3 fill_report.py case.json       # 从 JSON 文件读入

环境变量:
  ANTHROPIC_API_KEY=sk-ant-...

模板文件（布局固定，不修改）:
  C:/Users/Administrator/Desktop/PetMedPal_Report_Template_v4.docx

输出到桌面: 宠医通报告_{breed}_{report_id}.docx
"""

import os, sys, json, zipfile, re, urllib.request, urllib.error
from datetime import datetime
from copy import deepcopy

# ── 路径 ──────────────────────────────────────────────────
TEMPLATE = r'/mnt/c/Users/Administrator/Desktop/PetMedPal_Report_Template_v4.docx'
OUT_DIR  = r'/mnt/c/Users/Administrator/Desktop/'
API_KEY  = os.environ.get('ANTHROPIC_API_KEY', '')
MODEL    = 'claude-opus-4-6'

# ── Demo 案例 ─────────────────────────────────────────────
DEMO_CASE = {
    "pet": {
        "species":          "Cat",
        "breed":            "British Shorthair",
        "age":              6,
        "weight":           "5.8 kg / 12.8 lbs",
        "sex":              "Male · Neutered",
        "chief_complaint":  "Grade II heart murmur detected at annual exam; occasional mild rapid breathing",
        "clinic":           "Cardiology Dept., specialty veterinary hospital",
        "report_type":      "Echocardiogram (cardiac ultrasound)",
        "vet":              "Board-certified cardiologist",
        "history":          "No prior conditions; vaccinations up to date"
    },
    "medical_data": """
Echocardiogram key parameters:
- Interventricular Septum (IVSd): 6.8 mm (ref ≤5.5 mm)
- Left Ventricular Wall (LVPWd): 6.2 mm (ref ≤5.5 mm)
- LA/Ao ratio: 1.52 (ref <1.5)
- Ejection Fraction (EF): 68% (ref >50%, normal)
- SAM phenomenon: Negative (no outflow obstruction)
- Preliminary diagnosis: Non-obstructive hypertrophic cardiomyopathy (HCM)
""",
    "owner_concerns": "Owner is very concerned about vet-visit stress on the cat. Budget is moderate. Prioritizes current quality of life over extending lifespan. Has concerns about medication and wants to fully understand options before deciding."
}

# ── Claude API ────────────────────────────────────────────
SYSTEM_PROMPT = """You are a senior veterinary internal medicine specialist and expert patient communicator.

Given pet case data, output a STRICT JSON object that fills a pre-formatted report template.
All fields must contain real, complete, usable content — no placeholders, no empty strings.
Prognostic data must cite published peer-reviewed veterinary literature. Never fabricate numbers.
Currency in USD.

Output ONLY valid JSON, no markdown, no commentary."""

USER_PROMPT_TEMPLATE = """Fill the following report template fields based on this case:

CASE DATA:
{case_json}

Output a JSON object with EXACTLY this structure:
{{
  "report_id": "PM-{year}-XXXX",
  "date": "{today}",
  "pet": {{
    "species_line": "[species] · [breed] · [sex] · [age] yrs · [weight]",
    "breed":        "...",
    "sex":          "...",
    "age_weight":   "[age] yrs    [weight]",
    "history":      "...",
    "chief_complaint": "...",
    "clinic":       "...",
    "report_type":  "...",
    "vet":          "..."
  }},
  "summary": {{
    "severity":        "☐ Mild  ☑ Moderate  ☐ Severe — [one sentence on what this means today]",
    "findings_count":  "[N] findings outside normal range: Severe [X] / Moderate [X] / Mild [X]  (see Section 3)",
    "decision_window": "☐ Emergency today  ☐ Decide within 24h  ☑ This week  ☐ Take time to discuss",
    "prognosis":       "With treatment: median ~[X] months/years  |  Without / palliative: ~[X] months",
    "paths":           "[N] options; estimated cost: $[X]–$[X]  |  Earliest start: [X days]",
    "priority_match":  "You care most about: [value]  →  Path [X] aligns closest",
    "next_step":       "Within [timeframe]: [single most important action]"
  }},
  "diagnosis_plain": "Diagnosis: [full name], [Stage per ACVIM/IRIS/WHO]",
  "findings": [
    {{
      "name":      "Full parameter name",
      "value":     "Measured value + unit",
      "range":     "Normal reference range",
      "deviation": "↑ Severe | ↑ Moderate | ↑ Mild | ↓ Mild | ↓ Moderate | ↓ Severe",
      "meaning":   "Plain-language explanation (1–2 sentences)"
    }}
  ],
  "paths": [
    {{
      "label":     "Path A\\nAggressive",
      "approach":  "Specific treatment name",
      "survival":  "X–Y months (citation)",
      "cost":      "$X–Y",
      "aligns":    "What aligns with owner priorities",
      "tensions":  "What tensions or challenges exist"
    }},
    {{
      "label":     "Path B\\nModerate",
      "approach":  "...",
      "survival":  "...",
      "cost":      "$X–Y",
      "aligns":    "...",
      "tensions":  "..."
    }},
    {{
      "label":     "Path C\\nPalliative",
      "approach":  "Pain control, maximize comfort",
      "survival":  "...",
      "cost":      "$X–Y",
      "aligns":    "...",
      "tensions":  "..."
    }}
  ],
  "sources": "Author et al., Journal, Year; Author et al., Journal, Year"
}}"""

def call_claude(case):
    if not API_KEY:
        raise RuntimeError('未设置 ANTHROPIC_API_KEY。请运行: export ANTHROPIC_API_KEY=sk-ant-...')
    today = datetime.now().strftime('%Y-%m-%d')
    year  = datetime.now().strftime('%Y')
    prompt = USER_PROMPT_TEMPLATE.format(
        case_json=json.dumps(case, ensure_ascii=False, indent=2),
        today=today,
        year=year,
    )
    payload = json.dumps({
        'model': MODEL,
        'max_tokens': 4000,
        'system': SYSTEM_PROMPT,
        'messages': [{'role': 'user', 'content': prompt}]
    }).encode('utf-8')
    req = urllib.request.Request(
        'https://api.anthropic.com/v1/messages',
        data=payload,
        headers={
            'x-api-key':         API_KEY,
            'anthropic-version': '2023-06-01',
            'content-type':      'application/json',
        }
    )
    with urllib.request.urlopen(req, timeout=120) as resp:
        body = json.loads(resp.read())
    raw = body['content'][0]['text'].strip()
    # strip markdown code fences if present
    raw = re.sub(r'^```[a-z]*\n?', '', raw)
    raw = re.sub(r'\n?```$', '', raw)
    return json.loads(raw)

# ── XML 工具 ──────────────────────────────────────────────
def xe(s):
    """XML escape"""
    return str(s).replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')

def merge_runs(xml):
    """
    将同一段落内的连续 <w:r> 文字合并到第一个 run，
    防止 WPS 拆分导致占位符跨 run 无法替换。
    只合并 rPr 完全相同的相邻 run。
    """
    def merge_para(m):
        para = m.group(0)
        # 找出所有 runs
        runs = re.findall(r'<w:r>(.*?)</w:r>', para, re.DOTALL)
        if not runs:
            return para
        # 简单方案：把所有纯文本 run 的文字合并
        # (保留有 rPr 的 run 不动，只合并相邻无 rPr 的 run)
        merged = re.sub(
            r'(<w:r><w:rPr>(.*?)</w:rPr><w:t[^>]*>)(.*?)(</w:t></w:r>)'
            r'\s*<w:r><w:rPr>\2</w:rPr><w:t[^>]*>(.*?)</w:t></w:r>',
            lambda mm: mm.group(1) + mm.group(3) + mm.group(5) + mm.group(4),
            para,
        )
        return merged
    return re.sub(r'<w:p\b[^>]*>.*?</w:p>', merge_para, xml, flags=re.DOTALL)

def replace_text(xml, old, new):
    """在 XML 中替换占位文字（先 escape 再替换）"""
    return xml.replace(xe(old), xe(new))

# ── 表格行克隆 ────────────────────────────────────────────
def clone_row(row_xml, field_map):
    """复制一个 <w:tr> 块，替换其中的占位符"""
    r = row_xml
    for k, v in field_map.items():
        r = replace_text(r, k, v)
    return r

def find_rows(xml, marker):
    """找到包含 marker 文字的所有 <w:tr> 块"""
    rows = re.findall(r'<w:tr\b.*?</w:tr>', xml, re.DOTALL)
    return [r for r in rows if xe(marker) in r or marker in r]

def replace_rows(xml, old_rows, new_rows_xml):
    """用新行组替换旧行组（整段替换）"""
    # 找到第一行在 xml 中的位置，替换整段
    if not old_rows:
        return xml
    start_marker = old_rows[0]
    end_marker   = old_rows[-1]
    # 构建要替换的完整字符串
    idx_start = xml.find(start_marker)
    idx_end   = xml.find(end_marker) + len(end_marker)
    if idx_start == -1 or idx_end == -1:
        return xml
    return xml[:idx_start] + new_rows_xml + xml[idx_end:]

# ── 主填充逻辑 ────────────────────────────────────────────
def fill_template(doc_xml, d, case):
    """
    d = Claude 返回的结构化数据
    case = 原始案例数据（用于备用字段）
    """
    xml = doc_xml

    pet = d.get('pet', {})
    s   = d.get('summary', {})

    # ── 封面 ──────────────────────────────────────────────
    xml = replace_text(xml, '[PM-XXXX-XXXX]', d.get('report_id', 'PM-0000-0000'))
    xml = replace_text(xml, '[YYYY-MM-DD]',   d.get('date', datetime.now().strftime('%Y-%m-%d')))
    xml = replace_text(xml, '[Cat / Dog]',    case['pet'].get('species', 'Cat'))

    # ── Quick Summary（右列）──────────────────────────────
    xml = replace_text(xml,
        '[Breed] · [Age] yrs · [X] kg / [X] lbs · Diagnosis: [Condition, Stage]',
        pet.get('species_line', ''))
    xml = replace_text(xml,
        '☐ Mild  ☐ Moderate  ☐ Severe — [One sentence on what this means for your pet today]',
        s.get('severity', ''))
    xml = replace_text(xml,
        '[X] findings outside normal range: Severe [X] / Moderate [X] / Mild [X]  (see Section 3)',
        s.get('findings_count', ''))
    xml = replace_text(xml,
        '☐ Emergency today  ☐ Decide within 24h  ☐ This week  ☐ Take time to discuss',
        s.get('decision_window', ''))
    xml = replace_text(xml,
        'With treatment: median ~[X–X months/years]  |  Without / palliative: ~[X–X months]',
        s.get('prognosis', ''))
    xml = replace_text(xml,
        '[X] options; estimated cost: $[X]–$[X]  |  Earliest start: [X days]',
        s.get('paths', ''))
    xml = replace_text(xml,
        'You care most about: [Quality of life / Longevity / Minimizing suffering]  →  Path [X] aligns closest',
        s.get('priority_match', ''))
    xml = replace_text(xml,
        'Within [X hours / X days]: [The single most important action]',
        s.get('next_step', ''))

    # ── Pet Profile 表格 ──────────────────────────────────
    xml = replace_text(xml, '[Enter breed]',                   pet.get('breed', ''))
    xml = replace_text(xml, '[Cat/Dog · M/F · Neutered Y/N]', pet.get('sex', ''))
    xml = replace_text(xml, '[yrs]  [kg / lbs]',              pet.get('age_weight', ''))
    xml = replace_text(xml, '[Enter history]',                 pet.get('history', ''))
    xml = replace_text(xml, '[Enter chief complaint]',         pet.get('chief_complaint', ''))
    xml = replace_text(xml, '[Clinic name]',                   pet.get('clinic', ''))
    xml = replace_text(xml, '[Blood work / Imaging / Pathology / Other]', pet.get('report_type', ''))
    xml = replace_text(xml, '[Name / Department]',             pet.get('vet', ''))

    # ── Medical Findings 表格（可变行数）─────────────────
    findings = d.get('findings', [])
    # 模板里有 3 行占位
    template_finding_rows = find_rows(xml, '[Parameter]')
    if template_finding_rows and findings:
        new_finding_rows = ''
        template_row = template_finding_rows[0]  # 用第一行作克隆模板
        for i, f in enumerate(findings[:8]):     # 最多 8 行
            # 偶数行用浅灰背景，奇数用白 — 直接套第一行的样式
            row = clone_row(template_row, {
                '[Parameter]':       f.get('name',      ''),
                '[Value + unit]':    f.get('value',     ''),
                '[Low–High]':        f.get('range',     ''),
                '↑ Severe':          f.get('deviation', ''),
                '[e.g. Kidneys clearing waste at significantly reduced efficiency]':
                                     f.get('meaning',  ''),
            })
            new_finding_rows += row
        xml = replace_rows(xml, template_finding_rows, new_finding_rows)

    # ── Treatment Paths 表格（固定 3 行）─────────────────
    paths = d.get('paths', [])
    template_path_rows = find_rows(xml, 'Path A')
    # 找到包含 'Path A' 到 'Path C' 的三行
    path_rows = [r for r in template_path_rows if
                 'Path A' in r or 'Path B' in r or 'Path C' in r]

    path_placeholders = [
        {
            'label':    'Path A\nAggressive',
            'approach': '[e.g. Chemo /\nSurgery]',
            'aligns':   '[e.g. Matches your wish to leave no stone unturned]',
            'tensions': '[e.g. Frequent visits may conflict with your quality-of-life focus; costs may exceed budget]',
        },
        {
            'label':    'Path B\nModerate',
            'approach': '[e.g. Single-agent /\nConservative]',
            'aligns':   '[e.g. Visit frequency and cost fit your stated constraints]',
            'tensions': '[e.g. May not satisfy your goal of maximizing time together]',
        },
        {
            'label':    'Path C\nPalliative',
            'approach': 'Pain control,\nmaximize comfort',
            'aligns':   '[e.g. Fully aligned with prioritizing comfort and presence]',
            'tensions': '[e.g. If you still feel a pull to try everything, you may have regret later]',
        },
    ]

    for i, (ph, row_xml) in enumerate(zip(path_placeholders, path_rows)):
        if i < len(paths):
            p = paths[i]
            new_row = replace_text(row_xml, ph['label'],    p.get('label',    ph['label']))
            new_row = replace_text(new_row, ph['approach'], p.get('approach', ''))
            new_row = replace_text(new_row, '[X–Y months]', p.get('survival', ''))
            new_row = replace_text(new_row, '$[X–Y]',       p.get('cost',     ''))
            new_row = replace_text(new_row, ph['aligns'],   p.get('aligns',   ''))
            new_row = replace_text(new_row, ph['tensions'],  p.get('tensions', ''))
            xml = xml.replace(row_xml, new_row)

    # ── 其他固定占位 ──────────────────────────────────────
    xml = replace_text(xml,
        'Species: [Cat / Dog]     Condition: [Diagnosis]     Stage: [X]',
        f"Species: {case['pet'].get('species','Cat')}     {d.get('diagnosis_plain','')}")
    xml = replace_text(xml,
        'Sources: [Author, Journal, Year]; [Author, Journal, Year]',
        'Sources: ' + d.get('sources', '[See attached references]'))
    xml = replace_text(xml,
        'Report ID: [PM-XXXX-XXXX]     Date: [YYYY-MM-DD]     Species: [Cat / Dog]',
        f"Report ID: {d.get('report_id','')}     Date: {d.get('date','')}     Species: {case['pet'].get('species','')}")

    return xml

# ── 写出 docx ─────────────────────────────────────────────
def write_report(doc_xml, template_path, out_path):
    with zipfile.ZipFile(template_path) as z:
        files = {name: z.read(name) for name in z.namelist()}
    files['word/document.xml'] = doc_xml.encode('utf-8')
    with zipfile.ZipFile(out_path, 'w', zipfile.ZIP_DEFLATED) as z:
        for name, data in files.items():
            z.writestr(name, data)
    print(f'✅  报告已生成: {out_path}')

# ── 入口 ─────────────────────────────────────────────────
def main():
    if len(sys.argv) > 1 and sys.argv[1] == '--demo':
        case = DEMO_CASE
        print('▶  使用内置示例（英短猫 HCM）')
    elif len(sys.argv) > 1:
        with open(sys.argv[1], 'r', encoding='utf-8') as f:
            case = json.load(f)
        print(f'▶  读取案例文件: {sys.argv[1]}')
    else:
        print('用法: python3 fill_report.py --demo')
        print('     python3 fill_report.py case.json')
        sys.exit(0)

    print('⏳  正在调用 Claude 分析案例...')
    data = call_claude(case)
    print(f'✅  Claude 分析完成，报告编号: {data.get("report_id","—")}')

    # 读取模板
    with zipfile.ZipFile(TEMPLATE) as z:
        doc_xml = z.read('word/document.xml').decode('utf-8')

    # 合并可能被 WPS 拆分的 run
    doc_xml = merge_runs(doc_xml)

    # 填充内容
    doc_xml = fill_template(doc_xml, data, case)

    # 输出文件名
    breed    = case['pet'].get('breed', 'Pet').replace(' ', '_')
    rep_id   = data.get('report_id', datetime.now().strftime('%Y%m%d'))
    out_path = os.path.join(OUT_DIR, f'PetMedPal_Report_{breed}_{rep_id}.docx')

    write_report(doc_xml, TEMPLATE, out_path)

if __name__ == '__main__':
    main()
