import { cn } from '@/lib/utils';

type AppLogoProps = {
  className?: string;
  imageClassName?: string;
  alt?: string;
  src?: string;
};

export function AppLogo({
  className,
  imageClassName,
  alt = 'App logo',
  src = '/icons/icon-512x512.png?v=2',
}: AppLogoProps) {
  return (
    <div className={cn('overflow-hidden rounded-xl bg-white/5', className)}>
      <img src={src} alt={alt} className={cn('h-full w-full object-cover', imageClassName)} />
    </div>
  );
}
