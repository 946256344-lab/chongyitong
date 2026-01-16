'use client'; // 必须加上这一行，因为我们要用到点击事件
import { useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
// ... 之前的图标 import 保持不变
import React from 'react';
import { Search, Clock, Sparkles, Image as ImageIcon, Send, Settings, User, Globe, Github, Twitter, Disc ,CheckCircle,HelpCircle, X} from 'lucide-react';

export default function Home() {
 const fileInputRef = useRef<HTMLInputElement>(null);
const [uploading, setUploading] = useState(false);
const [imageUrl, setImageUrl] = useState<string | null>(null);
const [description, setDescription] = useState(''); // 存储用户输入的文字
const [isSubmitting, setIsSubmitting] = useState(false); // 存储提交状态
const [email, setEmail] = useState(''); 
const [isSuccess, setIsSuccess] = useState(false);
const [showGuide, setShowGuide] = useState(false); // 控制说明弹窗
const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
  try {
    setUploading(true);
    const file = event.target.files?.[0];
    if (!file) return;

    // 1. 定义文件名（加上时间戳防止重名）
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${fileName}`;

    // 2. 上传到你在后台创建的 'user-images' Bucket
    let { error: uploadError } = await supabase.storage
      .from('user-images') // 确保你在后台创建了名为 user-images 的 bucket
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    // 3. 获取公开访问链接
    const { data } = supabase.storage.from('user-images').getPublicUrl(filePath);
    setImageUrl(data.publicUrl);
    alert('上传成功！');
    
  } catch (error) {
    alert('上传失败，请检查网络或配置');
    console.error(error);
  } finally {
    setUploading(false);
  }
};
const handleSubmit = async () => {
  if (!imageUrl || !description || !email) {
    alert('请先请填写完整信息：病情描述/报告和邮箱');
    return;
  }

  setIsSubmitting(true);
  try {
    // 将数据插入到 submissions 表
    const { error } = await supabase
      .from('submissions')
      .insert([
        { 
          description: description, 
          image_url: imageUrl, 
          status: 'pending' ,
          user_email:email // <--- 新增这一行
        }
      ]);

    if (error) throw error;
const pushKey = process.env.NEXT_PUBLIC_PUSHDEER_KEY;
    const title = encodeURIComponent("🔔 收到新需求！");
    const content = encodeURIComponent(`用户邮箱: ${email}\n需求描述: ${description}\n图片地址: ${imageUrl}`);
    
    // 无需等待结果，直接异步触发即可（不影响用户体验）
    fetch(`https://api2.pushdeer.com/message/push?pushkey=${pushKey}&text=${title}&desp=${content}`)
      .catch(err => console.error("通知发送失败", err));
    alert('需求已提交！请耐心等待反馈。');
    // 提交成功后清空输入框
    setIsSuccess(true);
    setImageUrl(null);
    setEmail('');
  } catch (error) {
    console.error(error);
    alert('提交失败，请重试');
  } finally {
    setIsSubmitting(false);
  }
};
  return (
    <div className="flex h-screen bg-white text-gray-800 font-sans">
      
      {/* 1. 左侧侧边栏 (Sidebar) */}
      <aside className="w-64 border-r border-gray-100 flex flex-col justify-between p-4 hidden md:flex">
        {/* 顶部导航 */}
        <div>
          <div className="flex items-center gap-2 mb-8 px-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white text-xl font-bold">
              T
            </div>
            <span className="text-xl font-bold tracking-tight">宠医通|决策助手</span>
          </div>
          
          <nav className="space-y-1">
            <button className="w-full flex items-center gap-3 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium">
              <Search size={18} />
              搜索
            </button>
            <button 
  onClick={() => setShowGuide(true)} // 点击打开弹窗
  className="w-full flex items-center gap-3 px-3 py-2 text-gray-500 hover:bg-gray-50 rounded-lg text-sm font-medium transition"
>
  <HelpCircle size={18} />
  使用说明
</button>
          </nav>
        </div>

        {/* 底部卡片与用户信息 */}
        <div className="space-y-40">
          {/* 升级卡片 */}
          

          {/* 用户信息 */}
          <div className="flex items-center gap-3 px-2 py-2 hover:bg-gray-50 rounded-lg cursor-pointer transition">
            <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
              U
            </div>
            <div className="text-sm font-medium">微信号：YZEG0810</div>
          </div>
        </div>
      </aside>

      {/* 2. 主内容区域 (Main Content) */}
      <main className="flex-1 flex flex-col relative">
        {/* 右上角按钮 (手机端菜单保留位) */}
        <div className="absolute top-4 right-4 md:hidden">
            {/* 手机端菜单按钮占位 */}
        </div>

        {/* 核心居中区域 */}
        <div className="flex-1 flex flex-col items-center justify-center p-4 w-full max-w-3xl mx-auto">
          
          {/* Logo 与 标题 */}
          <div className="mb-8 text-center">
            <div className="flex items-center justify-center gap-3 mb-5">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-blue-200">
                <Sparkles size={24} />
              </div>
              <h1 className="text-4xl font-bold text-slate-800">宠医通|决策助手</h1>
            </div>
            <p className="text-gray-500">看懂宠物医疗报告，理性评估治疗选择，安心与兽医沟通</p>
          </div>

          {/* 3. 核心输入框 (仿照截图，但增加了上传功能) */}
          {/* 核心区域：根据 isSuccess 状态切换显示 */}
          <div className="w-full relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-300 to-purple-300 rounded-2xl opacity-20 group-hover:opacity-40 transition duration-500 blur"></div>
            
            <div className="relative bg-white border border-gray-200 rounded-2xl shadow-sm p-4 flex flex-col gap-3 min-h-[160px] justify-center">
              
              {isSuccess ? (
                /* === 方案A：发送成功后的反馈界面 === */
                <div className="flex flex-col items-center justify-center text-center py-4 animate-in fade-in zoom-in duration-300">
                  <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-3">
                    <CheckCircle size={24} />
                  </div>
                  <h3 className="text-lg font-bold text-gray-800 mb-1">发送成功！</h3>
                  <p className="text-sm text-gray-500 max-w-md">
                    我们要收到您的需求了。专家会在 24 小时内处理完毕，并发送结果至您的邮箱：
                    <br/>
                    <span className="font-medium text-blue-600">{email}</span>
                  </p>
                  <button 
                    onClick={() => setIsSuccess(false)}
                    className="mt-6 text-xs text-gray-400 hover:text-gray-600 underline"
                  >
                    提交新的需求
                  </button>
                </div>
              ) : (
                /* === 原有的输入表单 (增加了邮箱输入) === */
                <>
                   {/* 1. 新增：邮箱输入框 (放在顶部，样式保持一致但做了一点区分) */}
                   <input 
                    type="email"
                    placeholder="您的联系邮箱 (用于接收结果)"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full outline-none text-sm text-gray-700 p-2 border-b border-gray-100 placeholder-gray-400 bg-transparent focus:border-blue-200 transition"
                  />

                  {/* 2. 原有的：文本输入区域 */}
                  <textarea 
                    placeholder="请根据使用说明输入宠物情况描述..." 
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full resize-none outline-none text-gray-700 p-2 min-h-[60px] bg-transparent"
                  />

                  {/* 3. 原有的：底部工具栏 */}
                  <div className="flex items-center justify-between pt-2 px-1">
                    <div className="flex items-center gap-2">
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleFileChange} 
                        className="hidden" 
                        accept="image/*" 
                      />
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-gray-500 bg-gray-50 hover:bg-gray-100 rounded-full text-xs font-medium transition border border-gray-100 ${imageUrl ? 'text-blue-600 border-blue-200 bg-blue-50' : ''}`}
                      >
                        <ImageIcon size={14} />
                        <span>{uploading ? '上传中...' : (imageUrl ? '图片已上传' : '上传报告')}</span>
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
            </div>
          </div>

          {/* 底部小图标链接 */}
          <div className="mt-12 flex items-center gap-6 text-gray-400">
             <Twitter size={20} className="hover:text-gray-600 cursor-pointer transition" />
             <Github size={20} className="hover:text-gray-600 cursor-pointer transition" />
             <Disc size={20} className="hover:text-gray-600 cursor-pointer transition" />
          </div>
          
          <div className="mt-4 flex gap-4 text-xs text-gray-400">
            <span className="hover:underline cursor-pointer">Privacy Policy</span>
            <span className="hover:underline cursor-pointer">Terms of Service</span>
          </div>

        </div>
      </main>
      {/* --- 使用说明弹窗 (Modal) --- */}
{showGuide && (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
    {/* 遮罩层：点击背景关闭 */}
    <div 
      className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300"
      onClick={() => setShowGuide(false)}
    ></div>

    {/* 弹窗主体 */}
    <div className="relative bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
      {/* 头部 */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100">
        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
          <HelpCircle size={20} className="text-blue-600" />
          使用指南
        </h2>
        <button 
          onClick={() => setShowGuide(false)}
          className="p-1 hover:bg-gray-100 rounded-full text-gray-400 transition"
        >
          <X size={20} />
        </button>
      </div>

      {/* 内容区：支持滚动 */}
      <div className="p-6 max-h-[60vh] overflow-y-auto text-sm text-gray-600 leading-relaxed space-y-4">
        <p>欢迎使用宠医通|决策助手！为了确保您能获得最佳的处理效果，请参考以下说明：</p>
        
        <div className="space-y-3">
          <div className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center font-bold text-xs">1</span>
            <p>上传或粘贴你的宠物医疗报告（血检 / 影像 / 医生结论均可）</p>
          </div>
          <div className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center font-bold text-xs">2</span>
            <p>简要描述宠物情况（年龄、症状、生活质量以及你的预算）。</p>
          </div>
          <div className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center font-bold text-xs">3</span>
            <p>完成输入后24小时内可获取一份「建议手册」。</p>
          </div>
          <div className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center font-bold text-xs">4</span>
            <p>「建议手册」包括：1医疗报告的通俗解读 2常见预后与治疗路径参考 3帮你和兽医沟通的关键问题清单。</p>
          </div>
        </div>

        <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-r-lg">
          <p className="text-amber-800 font-medium">重要提示：</p>
          <p className="text-amber-700 mt-1">
            本工具用于理解与沟通辅助，不替代兽医诊断
          </p>
        </div>

        <p>目前所有需求均由专家手动处理并优化，我们承诺在 <span className="font-bold text-slate-900 underline decoration-amber-300 underline-offset-4">24 小时</span> 内将处理好的结果发送至您的邮箱。</p>
      </div>

      {/* 底部按钮 */}
      <div className="p-4 border-t border-gray-100 flex justify-end">
        <button 
          onClick={() => setShowGuide(false)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-xl font-medium transition shadow-lg shadow-blue-100"
        >
          我知道了
        </button>
      </div>
    </div>
  </div>
)}
    </div>
  );
}