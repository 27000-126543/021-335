import React from 'react';
import { CheckCircle, AlertCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';
import type { DocumentStatus } from '../types';

interface StatusBadgeProps {
  status: DocumentStatus;
  size?: 'sm' | 'md';
}

const statusConfig: Record<DocumentStatus, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  '已上传': {
    label: '已上传',
    color: 'text-green-700',
    bg: 'bg-green-100',
    icon: CheckCircle,
  },
  '未上传': {
    label: '未上传',
    color: 'text-gray-600',
    bg: 'bg-gray-100',
    icon: Clock,
  },
  '缺页': {
    label: '缺页',
    color: 'text-amber-700',
    bg: 'bg-amber-100',
    icon: AlertTriangle,
  },
  '命名不规范': {
    label: '命名不规范',
    color: 'text-orange-700',
    bg: 'bg-orange-100',
    icon: AlertCircle,
  },
  '日期倒挂': {
    label: '日期倒挂',
    color: 'text-red-700',
    bg: 'bg-red-100',
    icon: XCircle,
  },
};

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const config = statusConfig[status];
  const Icon = config.icon;
  const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4';
  const padding = size === 'sm' ? 'px-1.5 py-0.5' : 'px-2.5 py-1';
  const textSize = size === 'sm' ? 'text-xs' : 'text-xs';

  return (
    <span className={`inline-flex items-center space-x-1 ${config.bg} ${config.color} ${padding} rounded-full ${textSize} font-medium`}>
      <Icon className={iconSize} />
      <span>{config.label}</span>
    </span>
  );
};

export default StatusBadge;
