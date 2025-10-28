import React from 'react';
import clsx from 'classnames';

interface AppLogoProps {
  showText?: boolean;
  className?: string;
  textClassName?: string;
  orientation?: 'vertical' | 'horizontal';
}

const AppLogo: React.FC<AppLogoProps> = ({
  showText = true,
  className,
  textClassName,
  orientation = 'horizontal',
}) => {
  return (
    <div
      className={clsx(
        'flex items-center gap-2 text-lg font-semibold text-cyan-200',
        orientation === 'horizontal' ? 'flex-row' : 'flex-col items-start',
        className,
      )}
    >
      <svg
        className="size-10 rounded-xl border border-cyan-500/40 bg-cyan-500/10 p-2"
        viewBox="0 0 64 64"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#22d3ee" />
            <stop offset="100%" stopColor="#0ea5e9" />
          </linearGradient>
        </defs>
        <rect x="6" y="6" width="52" height="52" rx="14" fill="#0f172a" />
        <path
          d="M20 34l8 8 16-20"
          fill="none"
          stroke="url(#logoGradient)"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {showText && (
        <div className={clsx('flex flex-col leading-tight text-cyan-200', textClassName)}>
          <span>ComplianceAI</span>
          <span className="text-xs font-normal text-gray-400">Medical Device Reviewer</span>
        </div>
      )}
    </div>
  );
};

export default AppLogo;
