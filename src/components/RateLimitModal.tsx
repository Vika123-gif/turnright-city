import React from 'react';

interface RateLimitModalProps {
  isOpen: boolean;
  onClose: () => void;
  attemptsUsed: number;
  resetAt?: string;
}

export function RateLimitModal({ isOpen, onClose, attemptsUsed, resetAt }: RateLimitModalProps) {
  if (!isOpen) return null;

  const formatResetTime = (resetAt: string) => {
    const resetDate = new Date(resetAt);
    const now = new Date();
    const hoursUntilReset = Math.ceil((resetDate.getTime() - now.getTime()) / (1000 * 60 * 60));
    
    if (hoursUntilReset <= 1) {
      return 'in about 1 hour';
    } else if (hoursUntilReset <= 24) {
      return `in ${hoursUntilReset} hours`;
    } else {
      return `tomorrow at ${resetDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-8 max-w-md mx-4 text-center">
        <div className="mb-6">
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Daily Limit Reached</h2>
          <p className="text-gray-600">
            You've used all {attemptsUsed} of your daily route generations.
          </p>
        </div>

        <div className="bg-gray-50 rounded-xl p-4 mb-6">
          <p className="text-sm text-gray-700">
            <strong>Free Plan:</strong> 3 route generations per day
          </p>
          {resetAt && (
            <p className="text-sm text-gray-600 mt-1">
              Your limit resets {formatResetTime(resetAt)}
            </p>
          )}
        </div>

        <div className="space-y-3">
          <button
            onClick={onClose}
            className="w-full bg-gray-900 text-white py-3 px-6 rounded-xl font-medium hover:bg-gray-800 transition-colors"
          >
            Got it
          </button>
          
          <button
            onClick={() => {
              // This could open a pricing page or contact form
              window.open('mailto:support@turnright.city?subject=Upgrade Request', '_blank');
            }}
            className="w-full border border-gray-300 text-gray-700 py-3 px-6 rounded-xl font-medium hover:bg-gray-50 transition-colors"
          >
            Contact us for more generations
          </button>
        </div>
      </div>
    </div>
  );
}
