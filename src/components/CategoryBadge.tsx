import React from 'react';

interface CategoryBadgeProps {
  category: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showCoolScore?: boolean;
  coolScore?: number;
}

const CategoryBadge: React.FC<CategoryBadgeProps> = ({ 
  category, 
  size = 'md', 
  className = '',
  showCoolScore = false,
  coolScore = 0
}) => {
  // Category configuration with colors, emojis, and styling
  const categoryConfig = {
    'Viewpoints': {
      emoji: '🗺️',
      bgColor: 'bg-blue-100',
      textColor: 'text-blue-800',
      borderColor: 'border-blue-200'
    },
    'Museums': {
      emoji: '🖼️',
      bgColor: 'bg-purple-100',
      textColor: 'text-purple-800',
      borderColor: 'border-purple-200'
    },
    'Bars': {
      emoji: '🍸',
      bgColor: 'bg-red-100',
      textColor: 'text-red-800',
      borderColor: 'border-red-200'
    },
    'Bakery': {
      emoji: '🍞',
      bgColor: 'bg-yellow-100',
      textColor: 'text-yellow-800',
      borderColor: 'border-yellow-200'
    },
    'Parks': {
      emoji: '🌳',
      bgColor: 'bg-green-100',
      textColor: 'text-green-800',
      borderColor: 'border-green-200'
    },
    'Specialty coffee': {
      emoji: '☕',
      bgColor: 'bg-orange-100',
      textColor: 'text-orange-800',
      borderColor: 'border-orange-200'
    },
    'Restaurants': {
      emoji: '🍽️',
      bgColor: 'bg-pink-100',
      textColor: 'text-pink-800',
      borderColor: 'border-pink-200'
    },
    'Cafés': {
      emoji: '☕',
      bgColor: 'bg-amber-100',
      textColor: 'text-amber-800',
      borderColor: 'border-amber-200'
    },
    'Coworking': {
      emoji: '💼',
      bgColor: 'bg-indigo-100',
      textColor: 'text-indigo-800',
      borderColor: 'border-indigo-200'
    },
    'Architectural landmarks': {
      emoji: '🏛️',
      bgColor: 'bg-gray-100',
      textColor: 'text-gray-800',
      borderColor: 'border-gray-200'
    }
  };

  // Size configurations
  const sizeConfig = {
    sm: {
      text: 'text-xs',
      padding: 'px-2 py-1',
      border: 'border'
    },
    md: {
      text: 'text-sm',
      padding: 'px-3 py-1',
      border: 'border'
    },
    lg: {
      text: 'text-base',
      padding: 'px-4 py-2',
      border: 'border-2'
    }
  };

  const config = categoryConfig[category as keyof typeof categoryConfig] || {
    emoji: '📍',
    bgColor: 'bg-gray-100',
    textColor: 'text-gray-800',
    borderColor: 'border-gray-200'
  };

  const sizeStyle = sizeConfig[size];

  return (
    <span 
      className={`
        ${sizeStyle.text} 
        ${sizeStyle.padding} 
        ${sizeStyle.border}
        ${config.bgColor} 
        ${config.textColor} 
        ${config.borderColor}
        rounded-full 
        font-medium 
        inline-flex 
        items-center 
        gap-1
        ${className}
      `}
    >
      <span>{config.emoji}</span>
      <span>{category}</span>
      {/* Cool score intentionally hidden */}
    </span>
  );
};

export default CategoryBadge;
