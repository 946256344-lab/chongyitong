# 宠医通 (Pet Med-Pal)

## OOXML / docx 报告生成规则（必须遵守）
- 所有 `<w:tr>` 必须加 `<w:trPr><w:cantSplit/></w:trPr>`，防止表格行被页面截断
- 行数多的大表格，所在章节的标题段落需加 `<w:pageBreakBefore/>`
- 第4章（Treatment & Your Fit）和第6章（Home Monitoring）固定加 `pageBreakBefore`

## 报告模板结构（English v3，已确认）
```
Cover → 0.Before You Read → 1.Quick Summary → 2.Pet Profile
→ 3.Medical Data → 4.Treatment & Your Fit → 5.Questions for Vet
→ 6.Home Monitoring → Disclaimer footer
```
- 第4章：治疗路径表内嵌决策画像（✓ Aligns / △ Tensions 两列）
- 第6章：急救信号 + 生活质量量表合并
- 免责声明：仅作为页脚小字，不单独成章

## 报告脚本
- 位置：`/tmp/make_report_en.py`（/tmp 重启后清空，丢失需重新生成）
