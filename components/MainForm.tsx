'use client';
import { useRouter } from 'next/navigation';
import { useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import React from 'react';
import {
  Image as ImageIcon, Send, CheckCircle, HelpCircle, X,
  ChevronRight, ChevronLeft, Twitter, Github, Disc,
} from 'lucide-react';
import { Dictionary } from '@/app/dictionaries';
import Link from 'next/link';
import GuideModal from './GuideModal';

// ── 阶段状态 ─────────────────────────────────────────────
type Phase = 'form' | 'success' | 'intake' | 'done';

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

// ── 主组件 ───────────────────────────────────────────────
export default function MainForm({ dict, lang }: { dict: Dictionary; lang: string }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Phase 1 states
  const [uploading, setUploading]     = useState(false);
  const [imageUrl, setImageUrl]       = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [email, setEmail]             = useState('');
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  // Phase management
  const [phase, setPhase]               = useState<Phase>('form');
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [savedEmail, setSavedEmail]     = useState('');

  // Intake state
  const [intakeStep, setIntakeStep]         = useState(0);
  const [isIntakeSubmitting, setIsIntakeSubmitting] = useState(false);
  const [intake, setIntake] = useState<IntakeData>({
    species: '', breed: '', age: '', weight: '', sex: '',
    diagnosis: '', treatmentOptions: '',
    priority: '', budget: '', visitFreq: '',
  });

  const setField = (field: keyof IntakeData, value: string) =>
    setIntake((prev) => ({ ...prev, [field]: value }));

  // ── 文件上传 ────────────────────────────────────────────
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      const file = event.target.files?.[0];
      if (!file) return;
      const fileExt = file.name.split('.').pop();
      const filePath = `${Math.random()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('user-images')
        .upload(filePath, file);
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('user-images').getPublicUrl(filePath);
      setImageUrl(data.publicUrl);
    } catch (error) {
      alert(dict.uploaderror);
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  // ── 第一步提交 ──────────────────────────────────────────
  const handleSubmit = async () => {
    if (!imageUrl || !description || !email) {
      alert(dict.descPlaceholder);
      return;
    }
    setIsSubmitting(true);
    try {
      const { data: insertData, error } = await supabase
        .from('submissions')
        .insert([{ description, image_url: imageUrl, status: 'pending', user_email: email }])
        .select('id')
        .single();

      if (error) throw error;

      setSubmissionId(insertData?.id ?? null);
      setSavedEmail(email);

      fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, description, imageUrl }),
      }).catch((err) => console.error('通知发送失败', err));

      setImageUrl(null);
      setEmail('');
      setDescription('');
      setPhase('success');
    } catch (error) {
      console.error(error);
      alert(dict.uploaderror);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── 补充信息提交 ────────────────────────────────────────
  const handleIntakeSubmit = async () => {
    setIsIntakeSubmitting(true);
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
          email: savedEmail,
          description: `[补充信息]\n物种:${intake.species} 品种:${intake.breed} 年龄:${intake.age}岁 体重:${intake.weight}\n性别:${intake.sex}\n诊断:${intake.diagnosis}\n治疗选项:${intake.treatmentOptions}\n最在意:${intake.priority}\n预算:${intake.budget}\n复诊接受度:${intake.visitFreq}`,
          imageUrl: '',
        }),
      }).catch(() => {});
      setPhase('done');
    } catch (error) {
      console.error(error);
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

  // ── 渲染 ────────────────────────────────────────────────
  return (
    <div className="flex h-screen bg-white text-gray-800 font-sans">
      <main className="flex-1 flex flex-col relative">
        <div className="flex-1 flex flex-col items-center justify-center p-4 w-full max-w-3xl mx-auto">

          {/* Logo */}
          <div className="mb-8 text-center">
            <div className="flex items-center justify-center gap-3 mb-5">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-blue-200">
                T
              </div>
              <h1 className="text-4xl font-bold text-slate-800">{dict.slogan}</h1>
            </div>
            <p className="text-gray-500">{dict.subSlogan}</p>
          </div>

          {/* 卡片区域 */}
          <div className="w-full relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-300 to-purple-300 rounded-2xl opacity-20 group-hover:opacity-40 transition duration-500 blur" />
            <div className="relative bg-white border border-gray-200 rounded-2xl shadow-sm p-4 flex flex-col gap-3 min-h-[160px] justify-center">

              {/* ── Phase: form ── */}
              {phase === 'form' && (
                <>
                  <input
                    type="email"
                    placeholder={dict.emailPlaceholder}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full outline-none text-sm text-gray-700 p-2 border-b border-gray-100 placeholder-gray-400 bg-transparent focus:border-blue-200 transition"
                  />
                  <textarea
                    placeholder={dict.descPlaceholder}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full resize-none outline-none text-gray-700 p-2 min-h-[60px] bg-transparent"
                  />
                  <div className="flex items-center justify-between pt-2 px-1">
                    <div className="flex items-center gap-2">
                      <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-gray-500 bg-gray-50 hover:bg-gray-100 rounded-full text-xs font-medium transition border border-gray-100 ${imageUrl ? 'text-blue-600 border-blue-200 bg-blue-50' : ''}`}
                      >
                        <ImageIcon size={14} />
                        <span>{uploading ? dict.uploading : imageUrl ? dict.uploaded : dict.uploadBtn}</span>
                      </button>
                    </div>
                    <button
                      onClick={handleSubmit}
                      disabled={isSubmitting || !imageUrl || !description || !email}
                      className="bg-gray-900 hover:bg-black text-white p-2 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Send size={16} />
                    </button>
                  </div>
                </>
              )}

              {/* ── Phase: success ── */}
              {phase === 'success' && (
                <div className="flex flex-col items-center text-center py-4 animate-in fade-in zoom-in duration-300">
                  <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-3">
                    <CheckCircle size={24} />
                  </div>
                  <h3 className="text-lg font-bold text-gray-800 mb-1">{dict.success.title}</h3>
                  <p className="text-sm text-gray-500 max-w-sm mb-6">
                    {dict.success.desc}<br />
                    <span className="font-medium text-blue-600">{savedEmail}</span>
                  </p>

                  {/* 引导去补充信息 */}
                  <div className="w-full max-w-sm bg-blue-50 rounded-xl p-4 text-left mb-4">
                    <p className="text-sm text-blue-800 font-medium mb-1">💡 {d.hint}</p>
                    <p className="text-xs text-blue-600">{d.hint}</p>
                  </div>

                  <button
                    onClick={() => { setIntakeStep(0); setPhase('intake'); }}
                    className="w-full max-w-sm bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-medium transition shadow-lg shadow-blue-100 flex items-center justify-center gap-2"
                  >
                    {d.start} <ChevronRight size={16} />
                  </button>
                  <button
                    onClick={() => setPhase('form')}
                    className="mt-3 text-xs text-gray-400 hover:text-gray-600 transition"
                  >
                    {d.skip}
                  </button>
                </div>
              )}

              {/* ── Phase: intake ── */}
              {phase === 'intake' && (
                <div className="animate-in fade-in duration-300">
                  {/* 进度 */}
                  <StepDots current={intakeStep} total={3} />
                  <p className="text-center text-xs text-gray-400 mb-4">
                    {['step1Title','step2Title','step3Title'].map((k,i) => (
                      <span key={k} className={i === intakeStep ? 'text-blue-600 font-medium' : ''}>
                        {i > 0 && ' › '}
                        {(d as any)[k]}
                      </span>
                    ))}
                  </p>

                  {/* Step 0: 宠物基本信息 */}
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

                  {/* Step 1: 就诊情况 */}
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
                    </div>
                  )}

                  {/* Step 2: 优先级 */}
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

                  {/* 导航按钮 */}
                  <div className="flex items-center justify-between mt-5">
                    <button
                      onClick={() => intakeStep === 0 ? setPhase('success') : setIntakeStep((s) => s - 1)}
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
                        className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-xl text-sm font-medium transition disabled:opacity-40 disabled:cursor-not-allowed"
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
                <div className="flex flex-col items-center text-center py-4 animate-in fade-in zoom-in duration-300">
                  <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-3">
                    <CheckCircle size={24} />
                  </div>
                  <h3 className="text-lg font-bold text-gray-800 mb-1">{d.doneTitle}</h3>
                  <p className="text-sm text-gray-500 max-w-sm">
                    {d.doneDesc}<br />
                    <span className="font-medium text-blue-600">{savedEmail}</span>
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

          {/* 底部 */}
          <div className="mt-12 flex items-center gap-6 text-gray-400">
            <Twitter size={20} className="hover:text-gray-600 cursor-pointer transition" />
            <Github size={20} className="hover:text-gray-600 cursor-pointer transition" />
            <Disc size={20} className="hover:text-gray-600 cursor-pointer transition" />
          </div>
          <div className="mt-4 flex gap-4 text-xs text-gray-400">
            <span className="hover:underline cursor-pointer">Privacy Policy</span>
            <Link href={`/${lang}/terms`} className="hover:underline">Terms of Service</Link>
          </div>
        </div>
      </main>

      <GuideModal isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} dict={dict} />
    </div>
  );
}
