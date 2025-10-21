import { useState, useEffect } from 'react';

const FREE_GENERATIONS = 1;
const STORAGE_KEY = 'turnright_generation_count';
const FEEDBACK_GIVEN_KEY = 'turnright_feedback_given';

export function useGenerationLimit() {
  const [generationCount, setGenerationCount] = useState<number>(0);
  const [feedbackGiven, setFeedbackGiven] = useState<boolean>(false);
  const [showOptionsModal, setShowOptionsModal] = useState(false);

  useEffect(() => {
    // Load generation count and feedback status from localStorage
    const savedCount = localStorage.getItem(STORAGE_KEY);
    const savedFeedback = localStorage.getItem(FEEDBACK_GIVEN_KEY);
    
    if (savedCount) {
      setGenerationCount(parseInt(savedCount, 10) || 0);
    }
    
    if (savedFeedback) {
      setFeedbackGiven(savedFeedback === 'true');
    }
  }, []);

  const incrementGeneration = () => {
    const newCount = generationCount + 1;
    setGenerationCount(newCount);
    localStorage.setItem(STORAGE_KEY, newCount.toString());
    
    // After first generation, show options modal
    if (newCount === FREE_GENERATIONS) {
      setShowOptionsModal(true);
      return false; // Generation not allowed until user chooses option
    }
    
    return true; // Generation allowed
  };

  const canGenerate = () => {
    // Can generate if under free limit OR if feedback was given
    return generationCount < FREE_GENERATIONS || feedbackGiven;
  };

  const getRemainingGenerations = () => {
    if (generationCount < FREE_GENERATIONS) {
      return FREE_GENERATIONS - generationCount;
    }
    return feedbackGiven ? 1 : 0; // After feedback, they get 1 more
  };

  const giveFeedback = () => {
    setFeedbackGiven(true);
    localStorage.setItem(FEEDBACK_GIVEN_KEY, 'true');
    setShowOptionsModal(false);
  };

  const purchaseGenerations = () => {
    // Open Stripe payment link
    window.open('https://buy.stripe.com/3cI00bgHd9lk48vbv7dMI00', '_blank');
    setShowOptionsModal(false);
  };

  const closeOptionsModal = () => {
    setShowOptionsModal(false);
  };

  const resetGenerationCount = () => {
    setGenerationCount(0);
    setFeedbackGiven(false);
    localStorage.setItem(STORAGE_KEY, '0');
    localStorage.setItem(FEEDBACK_GIVEN_KEY, 'false');
    setShowOptionsModal(false);
  };

  return {
    generationCount,
    canGenerate,
    incrementGeneration,
    getRemainingGenerations,
    showOptionsModal,
    closeOptionsModal,
    giveFeedback,
    purchaseGenerations,
    resetGenerationCount,
    FREE_GENERATIONS,
    feedbackGiven
  };
}