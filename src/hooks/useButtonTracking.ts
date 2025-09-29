import { supabase } from '@/integrations/supabase/client';

export const useButtonTracking = () => {
  const trackButtonClick = async (buttonType: string) => {
    try {
      console.log(`Трекинг клика: ${buttonType}`);
      const { error } = await (supabase as any).from('button_clicks').insert({ 
        button_type: buttonType,
        clicked_at: new Date().toISOString()
      });
      
      if (error) {
        console.error('Ошибка записи клика:', error.message);
      } else {
        console.log(`Клик на ${buttonType} успешно записан`);
      }
    } catch (error) {
      console.error('Ошибка трекинга клика:', error);
    }
  };

  return { trackButtonClick };
};