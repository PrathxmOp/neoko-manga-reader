import React, { useState, useEffect, useRef } from 'react';
import { Heart, Loader2 } from 'lucide-react';

interface RazorpayDonateButtonProps {
  className?: string;
  compact?: boolean;
}

export const RazorpayDonateButton: React.FC<RazorpayDonateButtonProps> = ({
  className = '',
  compact = false,
}) => {
  const formContainerRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!formContainerRef.current) return;
    formContainerRef.current.innerHTML = '';
    setIsLoaded(false);

    try {
      const form = document.createElement('form');
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/payment-button.js';
      script.setAttribute('data-payment_button_id', 'pl_Tacl1DjuPRmN8H');
      script.async = true;

      script.onload = () => {
        setIsLoaded(true);
      };

      form.appendChild(script);
      formContainerRef.current.appendChild(form);

      // Polling check for Razorpay button DOM element
      const interval = setInterval(() => {
        if (formContainerRef.current?.querySelector('.razorpay-payment-button')) {
          setIsLoaded(true);
          clearInterval(interval);
        }
      }, 200);

      // Safety timeout after 4s
      const timeout = setTimeout(() => {
        setIsLoaded(true);
        clearInterval(interval);
      }, 4000);

      return () => {
        clearInterval(interval);
        clearTimeout(timeout);
      };
    } catch (e) {
      console.error('Razorpay script load error:', e);
      setIsLoaded(true);
    }
  }, []);

  if (compact) {
    return (
      <div className={`relative flex flex-col items-center justify-center w-full min-h-[50px] ${className}`}>
        {!isLoaded && (
          <div className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#1c1833] border border-[#2b2746] text-xs font-bold text-[#9d86e9] animate-pulse w-full">
            <Loader2 className="w-4 h-4 animate-spin shrink-0 text-[#ec4899]" />
            <span>Loading Razorpay Button...</span>
          </div>
        )}

        {/* Official Razorpay Form Button Container */}
        <div
          ref={formContainerRef}
          className={`w-full flex justify-center items-center overflow-hidden transition-opacity duration-300 ${
            isLoaded ? 'opacity-100' : 'opacity-0 absolute -z-10 pointer-events-none'
          }`}
        />
      </div>
    );
  }

  return (
    <div
      className={`relative p-5 rounded-2xl bg-[#161327] border border-[#2b2746] hover:border-[#ec4899]/50 transition-all flex flex-col gap-4 shadow-xl ${className}`}
    >
      <div className="flex items-center gap-3">
        <div className="p-3 rounded-xl bg-[#ec4899]/10 text-[#ec4899] shrink-0 border border-[#ec4899]/20">
          <Heart className="w-6 h-6 fill-current animate-pulse" />
        </div>
        <div className="flex flex-col text-left min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-bold text-xs text-white">Dedicated Server Fund</span>
            <span className="px-2 py-0.5 text-[9px] font-extrabold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded">
              UPI / Cards / NetBanking
            </span>
          </div>
          <span className="text-xs text-[#7c779b] leading-tight mt-1">
            Donate to upgrade NEOKO to a 24/7 dedicated high-speed server!
          </span>
        </div>
      </div>

      {!isLoaded && (
        <div className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#1c1833] border border-[#2b2746] text-xs font-bold text-[#9d86e9] animate-pulse w-full">
          <Loader2 className="w-4 h-4 animate-spin shrink-0 text-[#ec4899]" />
          <span>Loading Razorpay Payment Button...</span>
        </div>
      )}

      {/* Official Razorpay Form Button Container */}
      <div
        ref={formContainerRef}
        className={`w-full flex justify-center items-center overflow-hidden transition-opacity duration-300 ${
          isLoaded ? 'opacity-100' : 'opacity-0 absolute -z-10 pointer-events-none'
        }`}
      />
    </div>
  );
};
