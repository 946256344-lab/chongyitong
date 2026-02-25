// src/components/GuideModal.tsx
"use client";
import { X } from 'lucide-react';

export default function GuideModal({ isOpen, onClose, dict }: { isOpen: boolean; onClose: () => void; dict: any }) {
  if (!isOpen) return null;

  return (
    // 1. 确保 inset-0 和 fixed 能让遮罩铺满全屏
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 sm:p-6">
      
      {/* 2. 遮罩层：增加不可点击穿透的背景 */}
      <div 
        className="absolute   backdrop-blur-md" 
        onClick={onClose} 
      />
      
      {/* 3. 弹窗主体：确保有明确的宽度和相对定位 */}
    <div className="relative bg-white rounded-[28px] shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-300 translate-y-100">
      {/* 头部 */}
      <div className="p-6 border-b border-gray-50  items-center justify-between">
                <h3 className="text-xl font-bold text-gray-900">{dict?.guide?.title}</h3>

        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full"
        >
          <X size={20} />
        </button>
      </div>

        {/* 内容区：确保有 max-h 并且可以滚动 */}
        <div className="p-8 max-h-[70vh] overflow-y-auto text-[15px] text-gray-600 leading-relaxed space-y-6">
          <p className="font-medium text-gray-900">{dict.guide.p1}</p>
          
          <div className="space-y-5">
            {[1, 2, 3, 4].map((num) => (
              <div key={num} className="flex gap-4 items-start">
                <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-[10px]">
                  {num}
                </span>
                <p>{dict.guide[`step${num}`]}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="p-6 bg-gray-50 border-t border-gray-100 text-center">
                    <button 
            onClick={onClose}
            className="w-full py-4 bg-gray-900 text-white rounded-2xl font-bold hover:bg-gray-800 transition-all active:scale-95"
          >
            {dict?.guide?.btn}
          </button>

        </div>
      </div>
    </div>
    
  );
}