'use client';
import { useRouter } from 'next/navigation';
import { useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import React from 'react';
import {
  Image as ImageIcon, Send, CheckCircle, HelpCircle, X,
  ChevronRight, ChevronLeft, Twitter, Github, Disc, Loader2, Zap, ClipboardList,
} from 'lucide-react';
import { Dictionary } from '@/app/dictionaries';
import Link from 'next/link';
import GuideModal from './GuideModal';
import type { FeaturedCase } from '@/app/[lang]/page';
import ReportView, { type ReportData } from './ReportView';

// ── 阶段状态 ─────────────────────────────────────────────
type Phase = 'form' | 'success' | 'generating' | 'report' | 'intake' | 'done';

interface IntakeData {
  species: string;
  breed: string;
  age: string;
  weight: string;
  sex: string;
  diagnosis: string;
  treatmentOptions: string;
  priority: string;
  budget: string;
  visitFreq: string;
}

// ── 小工具：单选按钮组 ────────────────────────────────────
function RadioGroup({
  value, onChange, options,
}: { value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <div className="flex flex-col gap-2">
      {options.map((opt) => (
        <label
          key={opt}
          onClick={() => onChange(opt)}
          className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border cursor-pointer transition-all text-sm
            ${value === opt
              ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium'
              : 'border-gray-100 bg-gray-50 text-gray-600 hover:border-gray-300'}`}
        >
          <span className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center
            ${value === opt ? 'border-blue-500' : 'border-gray-300'}`}>
            {value === opt && <span className="w-2 h-2 rounded-full bg-blue-500" />}
          </span>
          {opt}
        </label>
      ))}
    </div>
  );
}

// ── 进度点 ───────────────────────────────────────────────
function StepDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-4">
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={`rounded-full transition-all ${
            i === current ? 'w-5 h-2 bg-blue-600' : i < current ? 'w-2 h-2 bg-blue-300' : 'w-2 h-2 bg-gray-200'
          }`}
        />
      ))}
    </div>
  );
}

// ── 通用多图上传按钮 ──────────────────────────────────────
function UploadButton({
  inputRef, uploading, urls, label, labelUploading, labelDone, onChange,
}: {
  inputRef: React.RefObject<HTMLInputElement | null>;
  uploading: boolean;
  urls: string[];
  label: string;
  labelUploading: string;
  labelDone: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  const hasFiles = urls.length > 0;
  return (
    <>
      <input
        type="file"
        ref={inputRef}
        onChange={onChange}
        className="hidden"
        accept="image/*"
        multiple
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition border ${
          hasFiles
            ? 'text-blue-600 border-blue-200 bg-blue-50'
            : 'text-gray-500 bg-gray-50 hover:bg-gray-100 border-gray-100'
        }`}
      >
        <ImageIcon size={14} />
        <span>
          {uploading
            ? labelUploading
            : hasFiles
              ? `${urls.length} ${labelDone}`
              : label}
        </span>
      </button>
    </>
  );
}

// ── 主组件 ───────────────────────────────────────────────
export default function MainForm({ dict, lang, featuredCases }: { dict: Dictionary; lang: string; featuredCases: FeaturedCase[] }) {
  const fileInputRef      = useRef<HTMLInputElement>(null);
  const intakeFileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Phase 1 states
  const [uploading, setUploading]       = useState(false);
  const [imageUrls, setImageUrls]       = useState<string[]>([]);
  const [description, setDescription]   = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGuideOpen, setIsGuideOpen]   = useState(false);

  // Phase management
  const [phase, setPhase]               = useState<Phase>('form');
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [savedDescription, setSavedDescription] = useState('');
  const [reportData, setReportData]     = useState<ReportData | null>(null);
  const [generateError, setGenerateError] = useState(false);
  const [isQuickReport, setIsQuickReport] = useState(false);

  // Intake state
  const [intakeStep, setIntakeStep]               = useState(0);
  const [isIntakeSubmitting, setIsIntakeSubmitting] = useState(false);
  const [intakeUploading, setIntakeUploading]     = useState(false);
  const [intakeImageUrls, setIntakeImageUrls]     = useState<string[]>([]);
  const [intake, setIntake] = useState<IntakeData>({
    species: '', breed: '', age: '', weight: '', sex: '',
    diagnosis: '', treatmentOptions: '',
    priority: '', budget: '', visitFreq: '',
  });

  const setField = (field: keyof IntakeData, value: string) =>
    setIntake((prev) => ({ ...prev, [field]: value }));

  // ── 通用多图上传函数 ────────────────────────────────────
  const uploadFiles = async (files: File[]): Promise<string[]> => {
    return Promise.all(files.map(async (file) => {
      const fileExt = file.name.split('.').pop();
      const filePath = `${Math.random()}.${fileExt}`;
      const { error } = await supabase.storage.from('user-images').upload(filePath, file);
      if (error) throw error;
      const { data } = supabase.storage.from('user-images').getPublicUrl(filePath);
      return data.publicUrl;
    }));
  };

  // ── 主表单文件上传 ──────────────────────────────────────
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;
    setUploading(true);
    try {
      const urls = await uploadFiles(files);
      setImageUrls((prev) => [...prev, ...urls]);
    } catch (error) {
      alert(dict.uploaderror);
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  // ── 补充信息文件上传 ────────────────────────────────────
  const handleIntakeFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;
    setIntakeUploading(true);
    try {
      const urls = await uploadFiles(files);
      setIntakeImageUrls((prev) => [...prev, ...urls]);
    } catch (error) {
      alert(dict.uploaderror);
      console.error(error);
    } finally {
      setIntakeUploading(false);
    }
  };

  // ── 第一步提交 ──────────────────────────────────────────
  const handleSubmit = async () => {
    if (!description) {
      alert(dict.uploaderror);
      return;
    }
    setIsSubmitting(true);
    try {
      const { data: insertData, error } = await supabase
        .from('submissions')
        .insert([{ description, image_url: imageUrls[0] ?? null, status: 'pending' }])
        .select('id')
        .single();

      if (error) throw error;

      setSubmissionId(insertData?.id ?? null);
      setSavedDescription(description);

      fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: '', description, imageUrl: imageUrls[0] ?? '' }),
      }).catch((err) => console.error('通知发送失败', err));

      setImageUrls([]);
      setDescription('');
      setPhase('success');
    } catch (error) {
      console.error(error);
      alert(dict.uploaderror);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── 快速生成报告（仅基础信息）────────────────────────────
  const handleQuickGenerate = async () => {
    setGenerateError(false);
    setIsQuickReport(true);
    setPhase('generating');
    try {
      const res = await fetch('/api/generate-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: savedDescription, intake: null, lang }),
      });
      const json = await res.json();
      if (!res.ok || !json.report) throw new Error(`${json.error ?? 'failed'} | ${json.detail ?? ''}`);
      setReportData(json.report);
      setPhase('report');
    } catch (err) {
      console.error(err);
      setGenerateError(true);
      setIsQuickReport(false);
      setPhase('success');
    }
  };

  // ── 补充信息提交 → 生成完整报告 ──────────────────────────
  const handleIntakeSubmit = async () => {
    setIsIntakeSubmitting(true);
    setGenerateError(false);
    setIsQuickReport(false);
    try {
      if (submissionId) {
        await supabase
          .from('submissions')
          .update({ intake_data: intake })
          .eq('id', submissionId);
      }
      fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: '',
          description: `[补充信息]\n物种:${intake.species} 品种:${intake.breed} 年龄:${intake.age}岁 体重:${intake.weight}\n性别:${intake.sex}\n诊断:${intake.diagnosis}\n治疗选项:${intake.treatmentOptions}\n最在意:${intake.priority}\n预算:${intake.budget}\n复诊接受度:${intake.visitFreq}`,
          imageUrl: intakeImageUrls[0] ?? '',
        }),
      }).catch(() => {});

      setIsIntakeSubmitting(false);
      setPhase('generating');

      const res = await fetch('/api/generate-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: savedDescription, intake, lang }),
      });
      const json = await res.json();
      if (!res.ok || !json.report) throw new Error(`${json.error ?? 'failed'} | ${json.detail ?? ''}`);
      setReportData(json.report);
      setPhase('report');
    } catch (error) {
      console.error(error);
      setGenerateError(true);
      setPhase('success');
    } finally {
      setIsIntakeSubmitting(false);
    }
  };

  // ── intake 步骤校验 ─────────────────────────────────────
  const canAdvanceStep = () => {
    if (intakeStep === 0) return !!intake.species;
    if (intakeStep === 1) return !!intake.diagnosis;
    if (intakeStep === 2) return !!intake.priority && !!intake.budget;
    return false;
  };

  const d = dict.intake;
  const uploadedLabel = lang === 'zh' ? '张已上传' : 'uploaded';

  // ── 渲染 ────────────────────────────────────────────────
  return (
    <div className="bg-white text-gray-800 font-sans">

      {/* ══ Screen 1: Hero ══════════════════════════════════ */}
      <section className="bg-[#fdf8f3]">
        <div className="min-h-screen max-w-6xl mx-auto flex flex-col md:flex-row md:items-center px-6 lg:px-12 pt-32 md:pt-0 pb-12 md:pb-0 gap-10 md:gap-16">

          {/* 文字：手机端在上，桌面端左侧 */}
          <div className="flex-1 flex flex-col items-start text-left">
            {/* 徽章 */}
            <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-full border border-gray-100 shadow-sm text-xs text-gray-500 font-medium mb-6">
              <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
              {dict.hero.badge}
            </div>

            {/* 标题 */}
            <h1 className="text-6xl md:text-7xl font-extrabold text-slate-900 leading-[1.1] tracking-tight mb-5">
              {dict.hero.headlineBefore}
              <span className="text-blue-600">{dict.hero.headlineHighlight}</span>
              {dict.hero.headlineAfter}
            </h1>

            {/* 副标题 */}
            <p className="text-base text-gray-500 leading-relaxed mb-8 max-w-md">
              {dict.hero.subline}
            </p>

            {/* CTA */}
            <a
              href="#form"
              className="w-full md:w-auto flex items-center justify-center gap-2 bg-slate-900 hover:bg-black text-white px-8 py-4 rounded-2xl text-base font-semibold transition-all shadow-xl shadow-slate-200 hover:shadow-slate-300 hover:-translate-y-0.5"
            >
              {dict.hero.cta} <ChevronRight size={18} strokeWidth={2.5} />
            </a>
          </div>

          {/* 图片：手机端在下，桌面端右侧，浮动卡片装饰 */}
          <div className="relative flex-shrink-0 self-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://images.unsplash.com/photo-1552053831-71594a27632d?w=600&h=700&fit=crop&q=80"
              alt="A pet"
              className="w-full md:w-[400px] h-[260px] md:h-[500px] object-cover rounded-2xl md:rounded-3xl shadow-xl shadow-slate-200"
            />
            {/* 浮动卡片 1 */}
            <div className="absolute bottom-4 left-4 bg-white rounded-xl px-3 py-2 shadow-lg flex items-center gap-1.5 text-xs font-semibold text-slate-700">
              {dict.hero.card1}
            </div>
            {/* 浮动卡片 2 */}
            <div className="absolute top-4 right-4 bg-white rounded-xl px-3 py-2 shadow-lg flex items-center gap-1.5 text-xs font-semibold text-slate-700">
              {dict.hero.card2}
            </div>
          </div>

        </div>
      </section>

      {/* ══ Screen 2: How it works ══════════════════════════ */}
      <section
        className="relative min-h-screen flex flex-col items-center justify-center px-6 py-24 bg-[#f8f9fc] overflow-hidden"
        style={{ backgroundImage: 'radial-gradient(#e2e8f0 1.5px, transparent 1.5px)', backgroundSize: '28px 28px' }}
      >
        {/* 角落柔光色块 */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-100 rounded-full blur-3xl opacity-50 pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-purple-100 rounded-full blur-3xl opacity-50 pointer-events-none" />

        <h2 className="relative text-2xl md:text-3xl font-bold text-slate-800 mb-16 md:mb-20 text-center">
          {dict.howItWorks.title}
        </h2>
        <div className="relative grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-16 max-w-4xl w-full">
          {dict.howItWorks.steps.map((step) => (
            <div key={step.num} className="flex flex-col gap-4">
              <span className="text-7xl md:text-8xl font-black text-gray-200 leading-none select-none">
                {step.num}
              </span>
              <h3 className="text-lg font-semibold text-slate-800">{step.title}</h3>
              <p className="text-base text-gray-400 leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ══ Screen 3: Form / Report ═════════════════════════ */}
      <section id="form" className="min-h-screen flex flex-col items-center justify-center px-4 py-24 bg-gradient-to-b from-[#fdf8f3] to-white">

        {/* ── report 阶段：全宽展示 ReportView ── */}
        {phase === 'report' && reportData && (
          <div className="w-full max-w-4xl mx-auto">
            <ReportView data={reportData} lang={lang} mode={isQuickReport ? 'quick' : 'full'} />

            {/* 快速报告升级提示 */}
            {isQuickReport && (
              <div className="mt-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl text-center">
                <p className="text-sm text-slate-600 leading-relaxed mb-4">
                  {dict.reportGen.upgradeHint}
                </p>
                <button
                  onClick={() => { setIntakeStep(0); setPhase('intake'); }}
                  className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl text-sm font-semibold transition shadow-sm shadow-blue-200"
                >
                  <ClipboardList size={16} />
                  {dict.reportGen.upgradeBtn}
                  <ChevronRight size={15} />
                </button>
              </div>
            )}

            <div className="mt-6 text-center">
              <button
                onClick={() => {
                  setPhase('form');
                  setReportData(null);
                  setIsQuickReport(false);
                  setImageUrls([]);
                  setIntakeImageUrls([]);
                  setIntake({ species:'',breed:'',age:'',weight:'',sex:'',diagnosis:'',treatmentOptions:'',priority:'',budget:'',visitFreq:'' });
                  setIntakeStep(0);
                }}
                className="text-sm text-gray-400 hover:text-gray-600 transition underline"
              >
                {dict.reportGen.restart}
              </button>
            </div>
          </div>
        )}

        {/* ── 其他阶段：表单卡片 ── */}
        {phase !== 'report' && (
        <div className="w-full max-w-3xl mx-auto flex flex-col items-center">

          {/* Logo */}
          <div className="mb-8 text-center">
            <div className="flex items-center justify-center gap-3 mb-2">
              <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center text-white text-lg font-bold shadow-lg shadow-blue-200">
                T
              </div>
              <span className="text-2xl font-bold text-slate-800">{dict.slogan}</span>
            </div>
          </div>

          {/* 卡片区域 */}
          <div className="w-full relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-300 to-purple-300 rounded-2xl opacity-20 group-hover:opacity-40 transition duration-500 blur" />
            <div className="relative bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden flex flex-col gap-0 min-h-[160px]">

              {/* ── Phase: form ── */}
              {phase === 'form' && (
                <>
                  {/* 表单标题行 */}
                  <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 bg-gray-50/60">
                    <span className="text-sm font-semibold text-gray-500 uppercase tracking-widest">{dict.formLabel}</span>
                    <span className="text-[10px] text-gray-300 font-mono">Rx</span>
                  </div>

                  <textarea
                    placeholder={dict.descPlaceholder}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full resize-none outline-none text-gray-700 px-4 bg-transparent leading-7 placeholder-gray-300"
                    style={{
                      minHeight: '196px',
                      paddingTop: '14px',
                      backgroundImage: 'repeating-linear-gradient(transparent, transparent 27px, #e9ecef 27px, #e9ecef 28px)',
                      backgroundSize: '100% 28px',
                      backgroundPositionY: '14px',
                    }}
                  />
                  {/* 上传 + 提交行 */}
                  <div className="flex items-center gap-3 px-4 pb-4 pt-1">
                    <UploadButton
                      inputRef={fileInputRef}
                      uploading={uploading}
                      urls={imageUrls}
                      label={dict.uploadBtn}
                      labelUploading={dict.uploading}
                      labelDone={uploadedLabel}
                      onChange={handleFileChange}
                    />
                    <button
                      onClick={handleSubmit}
                      disabled={isSubmitting || !description}
                      className="flex-1 flex items-center justify-center gap-2 bg-gray-900 hover:bg-black text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Send size={15} />
                      {isSubmitting ? '...' : dict.submitBtn}
                    </button>
                  </div>
                </>
              )}

              {/* ── Phase: success ── */}
              {phase === 'success' && (
                <div className="flex flex-col items-center text-center p-4 animate-in fade-in zoom-in duration-300">
                  <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-3">
                    <CheckCircle size={24} />
                  </div>
                  <h3 className="text-lg font-bold text-gray-800 mb-1">{dict.success.title}</h3>
                  <p className="text-sm text-gray-500 max-w-sm mb-6">
                    {dict.success.desc}
                  </p>

                  {generateError && (
                    <p className="text-xs text-red-500 mb-4">{dict.reportGen.error}</p>
                  )}

                  {/* 两个选项卡 */}
                  <div className="w-full flex flex-col gap-3">
                    {/* Option A：快速报告 */}
                    <button
                      onClick={handleQuickGenerate}
                      className="w-full flex items-start gap-4 p-4 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-2xl text-left transition-all group"
                    >
                      <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm shadow-blue-200">
                        <Zap size={18} className="text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-800 mb-0.5">{dict.reportGen.optionATitle}</p>
                        <p className="text-xs text-gray-500">{dict.reportGen.optionADesc}</p>
                      </div>
                      <ChevronRight size={16} className="text-blue-400 group-hover:translate-x-0.5 transition-transform mt-2 flex-shrink-0" />
                    </button>

                    {/* Option B：完整报告 */}
                    <button
                      onClick={() => { setIntakeStep(0); setPhase('intake'); }}
                      className="w-full flex items-start gap-4 p-4 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-2xl text-left transition-all group"
                    >
                      <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center flex-shrink-0">
                        <ClipboardList size={18} className="text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-800 mb-0.5">{dict.reportGen.optionBTitle}</p>
                        <p className="text-xs text-gray-500">{dict.reportGen.optionBDesc}</p>
                      </div>
                      <ChevronRight size={16} className="text-gray-400 group-hover:translate-x-0.5 transition-transform mt-2 flex-shrink-0" />
                    </button>
                  </div>
                </div>
              )}

              {/* ── Phase: generating ── */}
              {phase === 'generating' && (
                <div className="flex flex-col items-center text-center px-4 py-10 animate-in fade-in duration-300">
                  <Loader2 size={36} className="text-blue-500 animate-spin mb-5" />
                  <p className="text-base font-semibold text-slate-800 mb-1">{dict.reportGen.generating}</p>
                  <p className="text-xs text-gray-400">{dict.reportGen.generatingSub}</p>
                </div>
              )}

              {/* ── Phase: intake ── */}
              {phase === 'intake' && (
                <div className="p-4 animate-in fade-in duration-300">
                  <StepDots current={intakeStep} total={3} />
                  <p className="text-center text-xs text-gray-400 mb-4">
                    {['step1Title','step2Title','step3Title'].map((k,i) => (
                      <span key={k} className={i === intakeStep ? 'text-blue-600 font-medium' : ''}>
                        {i > 0 && ' › '}
                        {(d as any)[k]}
                      </span>
                    ))}
                  </p>

                  {intakeStep === 0 && (
                    <div className="flex flex-col gap-4">
                      <div>
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">{d.species}</label>
                        <div className="flex gap-3 mt-2">
                          {[d.speciesCat, d.speciesDog].map((s) => (
                            <button
                              key={s}
                              onClick={() => setField('species', s)}
                              className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition
                                ${intake.species === s ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-100 bg-gray-50 text-gray-600 hover:border-gray-300'}`}
                            >
                              {s === d.speciesCat ? '🐱 ' : '🐶 '}{s}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">{d.breed}</label>
                          <input
                            value={intake.breed}
                            onChange={(e) => setField('breed', e.target.value)}
                            placeholder={d.breedPlaceholder}
                            className="mt-1 w-full text-sm border border-gray-100 rounded-lg px-3 py-2 outline-none focus:border-blue-300 bg-gray-50"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">{d.age}</label>
                          <input
                            value={intake.age}
                            onChange={(e) => setField('age', e.target.value)}
                            placeholder="e.g. 6"
                            type="number"
                            className="mt-1 w-full text-sm border border-gray-100 rounded-lg px-3 py-2 outline-none focus:border-blue-300 bg-gray-50"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">{d.weight}</label>
                          <input
                            value={intake.weight}
                            onChange={(e) => setField('weight', e.target.value)}
                            placeholder="e.g. 12 lbs"
                            className="mt-1 w-full text-sm border border-gray-100 rounded-lg px-3 py-2 outline-none focus:border-blue-300 bg-gray-50"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 block">{d.sex}</label>
                        <div className="grid grid-cols-2 gap-2">
                          {[d.sex1, d.sex2, d.sex3, d.sex4].map((s) => (
                            <button
                              key={s}
                              onClick={() => setField('sex', s)}
                              className={`py-2 rounded-xl border text-xs font-medium transition
                                ${intake.sex === s ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-100 bg-gray-50 text-gray-600 hover:border-gray-300'}`}
                            >
                              {s}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {intakeStep === 1 && (
                    <div className="flex flex-col gap-4">
                      <div>
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">{d.diagnosis}</label>
                        <textarea
                          value={intake.diagnosis}
                          onChange={(e) => setField('diagnosis', e.target.value)}
                          placeholder={d.diagnosisPlaceholder}
                          rows={3}
                          className="mt-1 w-full text-sm border border-gray-100 rounded-xl px-3 py-2.5 outline-none focus:border-blue-300 bg-gray-50 resize-none"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">{d.treatmentOptions}</label>
                        <textarea
                          value={intake.treatmentOptions}
                          onChange={(e) => setField('treatmentOptions', e.target.value)}
                          placeholder={d.treatmentPlaceholder}
                          rows={2}
                          className="mt-1 w-full text-sm border border-gray-100 rounded-xl px-3 py-2.5 outline-none focus:border-blue-300 bg-gray-50 resize-none"
                        />
                      </div>
                      {/* 补充图片上传 */}
                      <div>
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 block">{d.uploadImages}</label>
                        <UploadButton
                          inputRef={intakeFileInputRef}
                          uploading={intakeUploading}
                          urls={intakeImageUrls}
                          label={d.uploadImages}
                          labelUploading={dict.uploading}
                          labelDone={uploadedLabel}
                          onChange={handleIntakeFileChange}
                        />
                      </div>
                    </div>
                  )}

                  {intakeStep === 2 && (
                    <div className="flex flex-col gap-4">
                      <div>
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 block">{d.priority}</label>
                        <RadioGroup
                          value={intake.priority}
                          onChange={(v) => setField('priority', v)}
                          options={[d.priority1, d.priority2, d.priority3, d.priority4]}
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 block">{d.budget}</label>
                        <RadioGroup
                          value={intake.budget}
                          onChange={(v) => setField('budget', v)}
                          options={[d.budget1, d.budget2, d.budget3, d.budget4]}
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 block">{d.visitFreq}</label>
                        <RadioGroup
                          value={intake.visitFreq}
                          onChange={(v) => setField('visitFreq', v)}
                          options={[d.visit1, d.visit2, d.visit3, d.visit4]}
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-5">
                    <button
                      onClick={() => intakeStep === 0
                        ? setPhase(isQuickReport && reportData ? 'report' : 'success')
                        : setIntakeStep((s) => s - 1)}
                      className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 transition"
                    >
                      <ChevronLeft size={16} /> {d.back}
                    </button>
                    {intakeStep < 2 ? (
                      <button
                        onClick={() => setIntakeStep((s) => s + 1)}
                        disabled={!canAdvanceStep()}
                        className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-xl text-sm font-medium transition disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {d.next} <ChevronRight size={16} />
                      </button>
                    ) : (
                      <button
                        onClick={handleIntakeSubmit}
                        disabled={isIntakeSubmitting || !canAdvanceStep()}
                        className="flex-1 ml-4 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl text-sm font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {isIntakeSubmitting ? d.submitting : d.submit}
                        {!isIntakeSubmitting && <ChevronRight size={16} />}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* ── Phase: done ── */}
              {phase === 'done' && (
                <div className="flex flex-col items-center text-center p-4 animate-in fade-in zoom-in duration-300">
                  <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-3">
                    <CheckCircle size={24} />
                  </div>
                  <h3 className="text-lg font-bold text-gray-800 mb-1">{d.doneTitle}</h3>
                  <p className="text-sm text-gray-500 max-w-sm">
                    {d.doneDesc}
                  </p>
                  <button
                    onClick={() => { setPhase('form'); setIntake({ species:'',breed:'',age:'',weight:'',sex:'',diagnosis:'',treatmentOptions:'',priority:'',budget:'',visitFreq:'' }); setIntakeStep(0); }}
                    className="mt-6 text-xs text-gray-400 hover:text-gray-600 transition underline"
                  >
                    {dict.backBtn}
                  </button>
                </div>
              )}

            </div>
          </div>

          {/* 退款保证 */}
          <p className="mt-3 text-xs text-gray-400 text-center">↩ {dict.trust.guarantee}</p>

          {/* 案例入口卡片 */}
          <div className="w-full mt-10">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">
              {dict.casesTeaser.title}
            </p>
            <div className="flex flex-col gap-3">
              {featuredCases.map((c) => (
                <Link key={c.slug} href={`/${lang}/cases/${c.slug}`} className="block group">
                  <div className="relative bg-white border border-gray-100 rounded-xl p-4 pl-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex items-start gap-3 overflow-hidden">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-l-xl" />
                    <div className="flex-1 min-w-0">
                      <span className="inline-block text-xs text-blue-600 bg-blue-50 font-medium px-2 py-0.5 rounded-full mb-1.5">{c.category}</span>
                      <p className="text-sm font-semibold text-gray-700 group-hover:text-blue-600 transition-colors line-clamp-1">{c.title}</p>
                      <p className="text-xs text-gray-400 mt-1 line-clamp-2 leading-relaxed">{c.description}</p>
                    </div>
                    <ChevronRight size={15} className="text-gray-300 group-hover:text-blue-400 transition-colors flex-shrink-0 mt-1" />
                  </div>
                </Link>
              ))}
            </div>
            <Link href={`/${lang}/cases`} className="mt-3 block text-center text-xs text-blue-500 hover:underline">
              {dict.casesTeaser.link}
            </Link>
          </div>

          {/* 底部 */}
          <div className="w-full mt-16 pt-6 border-t border-gray-100 flex flex-col items-center gap-4">
            <div className="flex items-center gap-5 text-gray-300">
              <Twitter size={18} className="hover:text-gray-500 cursor-pointer transition" />
              <Github size={18} className="hover:text-gray-500 cursor-pointer transition" />
              <Disc size={18} className="hover:text-gray-500 cursor-pointer transition" />
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-300">
              <Link href={`/${lang}/terms`} className="hover:text-gray-500 transition">Privacy Policy</Link>
              <span>·</span>
              <Link href={`/${lang}/terms`} className="hover:text-gray-500 transition">Terms of Service</Link>
            </div>
            <p className="text-xs text-gray-300">© 2026 Pet Med-Pal. All rights reserved.</p>
          </div>

        </div>
        )}
      </section>

      <GuideModal isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} dict={dict} />
    </div>
  );
}
