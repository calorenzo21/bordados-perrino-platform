import Image from 'next/image';

import { cn } from '@/lib/utils';

const LOGO_PATH = '/icons/perrino-logo.png';

type PerrinoLogoSize = 'sm' | 'md' | 'lg';

const sizeClasses: Record<PerrinoLogoSize, string> = {
  sm: 'h-9 w-9',
  md: 'h-12 w-12',
  lg: 'h-14 w-14',
};

interface PerrinoLogoProps {
  size?: PerrinoLogoSize;
  className?: string;
  rounded?: 'xl' | '2xl' | 'full';
}

export function PerrinoLogo({ size = 'md', className, rounded = 'xl' }: PerrinoLogoProps) {
  const roundedClass =
    rounded === 'full' ? 'rounded-full' : rounded === '2xl' ? 'rounded-2xl' : 'rounded-xl';

  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center overflow-hidden bg-slate-900',
        sizeClasses[size],
        roundedClass,
        className
      )}
    >
      <Image
        src={LOGO_PATH}
        alt="Bordados Perrino"
        width={size === 'sm' ? 36 : size === 'md' ? 48 : 56}
        height={size === 'sm' ? 36 : size === 'md' ? 48 : 56}
        className="h-full w-full object-contain p-0.5"
        priority
      />
    </div>
  );
}
