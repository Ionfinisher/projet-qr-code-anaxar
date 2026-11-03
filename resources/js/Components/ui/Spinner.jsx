import { Icon } from './Icon.jsx';
import { cn } from '../../Lib/cn.js';

export function Spinner({ size = 18, className, label }) {
  return <Icon name="loader-circle" size={size} label={label} className={cn('animate-spin', className)} />;
}
