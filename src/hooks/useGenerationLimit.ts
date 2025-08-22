import { useState, useEffect } from 'react';

const GENERATION_LIMIT = 5;
const STORAGE_KEY = 'turnright_generation_count';

export function useGenerationLimit() {
  const [generationCount, setGenerationCount] = useState<number>(0);
  const [showDonationModal, setShowDonationModal] = useState(false);

  useEffect(() => {
    // Load generation count from localStorage on component mount
    const savedCount = localStorage.getItem(STORAGE_KEY);
    if (savedCount) {
      setGenerationCount(parseInt(savedCount, 10) || 0);
    }
  }, []);

  const incrementGeneration = () => {
    const newCount = generationCount + 1;
    setGenerationCount(newCount);
    localStorage.setItem(STORAGE_KEY, newCount.toString());
    
    if (newCount > GENERATION_LIMIT) {
      setShowDonationModal(true);
      return false; // Generation not allowed
    }
    
    return true; // Generation allowed
  };

  const canGenerate = () => {
    return generationCount < GENERATION_LIMIT;
  };

  const getRemainingGenerations = () => {
    return Math.max(0, GENERATION_LIMIT - generationCount);
  };

  const closeDonationModal = () => {
    setShowDonationModal(false);
  };

  return {
    generationCount,
    canGenerate,
    incrementGeneration,
    getRemainingGenerations,
    showDonationModal,
    closeDonationModal,
    GENERATION_LIMIT
  };
}