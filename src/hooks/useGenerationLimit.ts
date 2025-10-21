import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { supabase } from '@/integrations/supabase/client';

const FREE_GENERATIONS = 2;

export function useGenerationLimit() {
  const { user } = useAuth();
  const [generationCount, setGenerationCount] = useState<number>(0);
  const [purchasedGenerations, setPurchasedGenerations] = useState<number>(0);
  const [showOptionsModal, setShowOptionsModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const loadedUserIdRef = useRef<string | null>(null);

  // Function to load credits from database
  const loadCredits = async () => {
    if (!user?.id || !user?.email) {
      setLoading(false);
      return;
    }

    try {
      console.log("=== DEBUG: Loading credits from database ===");
      console.log("User ID:", user.id);
      console.log("User email:", user.email);

      // Get or create user credits
      const { data, error } = await supabase
        .rpc('get_or_create_user_credits', {
          p_user_id: user.id,
          p_email: user.email
        });

      if (error) {
        console.error("Error loading credits:", error);
      } else if (data) {
        console.log("=== DEBUG: Credits loaded from database ===", data);
        setGenerationCount(data.generations_used || 0);
        setPurchasedGenerations(data.purchased_generations || 0);
      }
    } catch (err) {
      console.error("Exception loading credits:", err);
    } finally {
      setLoading(false);
    }
  };

  // Load credits on mount or when user changes
  useEffect(() => {
    // Only load if user changed
    if (!user?.id || loadedUserIdRef.current === user.id) {
      if (!user?.id) setLoading(false);
      return;
    }
    
    loadCredits();
    loadedUserIdRef.current = user.id;
  }, [user?.id, user?.email]);

  const incrementGeneration = async () => {
    const newCount = generationCount + 1;
    const totalAvailable = FREE_GENERATIONS + purchasedGenerations;
    
    console.log("=== DEBUG: Incrementing generation count ===");
    console.log("User ID:", user?.id);
    console.log("Current count:", generationCount);
    console.log("New count:", newCount);
    console.log("FREE_GENERATIONS:", FREE_GENERATIONS);
    console.log("Purchased generations:", purchasedGenerations);
    console.log("Total available:", totalAvailable);
    
    // Check if user can generate BEFORE incrementing
    if (newCount > totalAvailable) {
      console.log("=== DEBUG: User exceeded available generations, showing payment modal ===");
      setShowOptionsModal(true);
      return false;
    }
    
    // Update local state
    setGenerationCount(newCount);
    console.log("=== DEBUG: Local state updated to:", newCount);
    
    // Update database
    if (user?.id) {
      try {
        console.log("=== DEBUG: Attempting database update ===");
        const { data, error } = await supabase
          .from('user_credits')
          .update({ 
            generations_used: newCount,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id)
          .select();

        if (error) {
          console.error("=== ERROR: Database update failed ===", error);
          // Revert on error
          setGenerationCount(generationCount);
          return false;
        } else {
          console.log("=== DEBUG: Database updated successfully ===");
          console.log("Updated data:", data);
        }
      } catch (err) {
        console.error("=== EXCEPTION: Database update exception ===", err);
        // Revert on error
        setGenerationCount(generationCount);
        return false;
      }
    }
    
    console.log("=== DEBUG: Generation allowed, count is now:", newCount);
    return true;
  };

  const canGenerate = () => {
    const totalAvailable = getTotalGenerations();
    console.log("=== DEBUG: canGenerate check ===");
    console.log("generationCount:", generationCount);
    console.log("Total available:", totalAvailable);
    const canGen = generationCount < totalAvailable;
    console.log("Result:", canGen);
    return canGen;
  };

  const getRemainingGenerations = () => {
    const totalAvailable = getTotalGenerations();
    const remaining = Math.max(0, totalAvailable - generationCount);
    return remaining;
  };
  
  const getTotalGenerations = () => {
    // If user has purchased credits, show 3 total, otherwise show 2 total
    return purchasedGenerations > 0 ? 3 : FREE_GENERATIONS;
  };

  const handlePurchase = () => {
    console.log("=== DEBUG: User initiated purchase ===");
    console.log("Opening Stripe payment link...");
    
    // Close modal
    setShowOptionsModal(false);
    
    // Add user email to Stripe URL for webhook identification
    // TODO: Replace with your actual Stripe Payment Link from Stripe Dashboard
    const stripeUrl = `https://buy.stripe.com/test_XXXXXXXX${user?.email ? `?prefilled_email=${encodeURIComponent(user.email)}` : ''}`;
    console.log("Stripe URL:", stripeUrl);
    
    // Check if we're on mobile
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    if (isMobile) {
      // On mobile, open in same window/tab
      console.log("Mobile device detected, opening Stripe in same window");
      window.location.href = stripeUrl;
    } else {
      // On desktop, open in new window
      const windowFeatures = 'width=800,height=700,scrollbars=yes,resizable=yes';
      const paymentWindow = window.open(stripeUrl, 'StripePayment', windowFeatures);
      
      if (!paymentWindow) {
        console.error("Popup blocked! Opening in same window instead.");
        window.location.href = stripeUrl;
        return;
      }
      
      console.log("Opened Stripe in new window");
      
      // Try to focus the payment window
      try {
        paymentWindow.focus();
      } catch (e) {
        console.log("Could not focus payment window:", e);
      }
    }
    
    // Show message after payment window opens
    setTimeout(() => {
      if (isMobile) {
        alert("💳 Redirecting to payment page...\n\nAfter payment, return to this app.\n\nCredits will be added automatically once Stripe confirms the payment.");
      } else {
        alert("💳 Payment window opened!\n\nCredits will be added automatically once Stripe confirms the payment.\n\nIt usually takes a few seconds.\n\nUse the Refresh button to check your balance.");
      }
    }, 1000);
  };

  // Function to manually add purchased generations (for testing or after payment confirmation)
  const addPurchasedGenerations = async (count: number = 3) => {
    console.log("=== DEBUG: Adding purchased generations ===", count);
    
    if (user?.id) {
      try {
        const newPurchasedCount = purchasedGenerations + count;
        const { data, error } = await supabase
          .from('user_credits')
          .update({ 
            purchased_generations: newPurchasedCount,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id)
          .select();

        if (error) {
          console.error("Error updating purchased generations:", error);
        } else {
          console.log("=== DEBUG: Purchased generations updated in database ===", data);
          setPurchasedGenerations(newPurchasedCount);
          await loadCredits(); // Reload to ensure consistency
        }
      } catch (err) {
        console.error("Exception updating purchased generations:", err);
      }
    }
  };

  const closeOptionsModal = () => {
    setShowOptionsModal(false);
  };

  const resetGenerationCount = async () => {
    console.log("=== DEBUG: Resetting generation count ===");
    setGenerationCount(0);
    setPurchasedGenerations(0);
    
    // Update database
    if (user?.id) {
      try {
        const { error } = await supabase
          .from('user_credits')
          .update({ 
            generations_used: 0,
            purchased_generations: 0,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id);

        if (error) {
          console.error("Error resetting credits:", error);
        }
      } catch (err) {
        console.error("Exception resetting credits:", err);
      }
    }
    
    setShowOptionsModal(false);
  };

  // Make functions available globally for testing
  if (typeof window !== 'undefined') {
    (window as any).resetGenerationCount = resetGenerationCount;
    (window as any).addPurchasedGenerations = addPurchasedGenerations;
  }

  // Refresh credits function (exposed for UI button)
  const refreshCredits = async () => {
    console.log("=== DEBUG: Refreshing credits from database ===");
    await loadCredits();
  };

  return {
    generationCount,
    purchasedGenerations,
    canGenerate,
    incrementGeneration,
    getRemainingGenerations,
    getTotalGenerations,
    showOptionsModal,
    closeOptionsModal,
    handlePurchase,
    addPurchasedGenerations,
    resetGenerationCount,
    reloadCredits: loadCredits, // Expose reload function
    refreshCredits, // Expose refresh function for UI button
    FREE_GENERATIONS,
    loading
  };
}
