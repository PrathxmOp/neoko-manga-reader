import React, { useEffect, useRef } from 'react';
import { Heart } from 'lucide-react';

interface RazorpayDonateButtonProps {
  className?: string;
  compact?: boolean;
}

export const RazorpayDonateButton: React.FC<RazorpayDonateButtonProps> = ({ className = '', compact = false }) => {
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (formRef.current && formRef.current.children.length === 0) {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/payment-button.js';
      script.setAttribute('data-payment_button_id', 'pl_Tacl1DjuPRmN8H');
      script.async = true;
      formRef.current.appendChild(script);
    }
  }, []);

  if (compact) {
    return (
      <div className={`flex flex-col items-center gap-2 ${className}`}>
        <form ref={formRef} className="w-full flex items-center justify-center overflow-hidden" />
      </div>
    );
  }

  return (
    <div className={`p-4 rounded-2xl bg-[#161327] border border-[#2b2746] hover:border-[#ec4899]/50 transition-all flex flex-col gap-3 ${className}`}>
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-[#ec4899]/10 text-[#ec4899] shrink-0">
          <Heart className="w-5 h-5 fill-current" />
        </div>
        <div className="flex flex-col text-left min-w-0">
          <span className="font-bold text-xs text-white">Server & Domain Fund (Razorpay)</span>
          <span className="text-[10px] text-[#7c779b]">Donate to keep NEOKO online & ad-free</span>
        </div>
      </div>
      <form ref={formRef} className="flex items-center justify-start overflow-hidden min-h-[40px]" />
    </div>
  );
};
