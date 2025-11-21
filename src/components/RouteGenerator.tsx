import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button'; // Из ui/
import { Input } from '@/components/ui/input';   // Из ui/
import { useButtonTracking } from '@/hooks/useButtonTracking';

const RouteGenerator: React.FC = () => {
  const [locationInput, setLocationInput] = useState('');
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [showRoute, setShowRoute] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const { trackButtonClick } = useButtonTracking();

  // Функция для записи клика с отладкой
  const handleClick = async (buttonType: string) => {
    await trackButtonClick(buttonType);
  };

  // Обработка ввода адреса и отправки
  const handleLocationSubmit = async () => {
    if (locationInput) {
      await handleClick('share my location or input');
      setLocationInput('');
    }
  };

  // Обработка выбора опций (галочек)
  const handleOptionToggle = (option: string) => {
    setSelectedOptions((prev) =>
      prev.includes(option) ? prev.filter((o) => o !== option) : [...prev, option]
    );
    handleClick(option); // Записываем клик на каждую галочку
  };

  // Обработка генерации маршрута
  const handleGenerateRoute = async () => {
    await handleClick('generate route');
    // Здесь можно добавить логику генерации
    setShowPreview(true); // После генерации показываем превью экран
  };

  // Derived display values for preview
  const selectedCategories = selectedOptions;
  const subtitle = selectedCategories && selectedCategories.length > 0
    ? `${selectedCategories.join(' + ')} = A day to remember.`
    : 'Your AI city loop is ready.';
  const totalDuration: string | null = null; // Replace with computed duration when available

  const FormUI: React.FC = () => (
    <div className="p-6 space-y-4">
      {/* Шаг 1 */}
      <Button onClick={() => handleClick("I'm already here")}>I want to explore now</Button>

      {/* Шаг 2 */}
      <div className="flex space-x-2">
        <Input
          value={locationInput}
          onChange={(e) => setLocationInput(e.target.value)}
          placeholder="Введите адрес"
        />
        <Button onClick={handleLocationSubmit}>→</Button>
      </div>

      {/* Шаг 3 */}
      <div className="flex space-x-2">
        <Button onClick={() => handleClick('3 hours')}>3 hours</Button>
        <Button onClick={() => handleClick('6 hours')}>6 hours</Button>
        <Button onClick={() => handleClick('full day')}>full day</Button>
      </div>

      {/* Шаг 4 */}
      <div className="flex space-x-2">
        <Button onClick={() => handleClick('No specific end point')}>No specific end point</Button>
        <Button onClick={() => handleClick('Circle route back to start')}>Circle route back to start</Button>
        <Button onClick={() => handleClick('I\'ll specify end point')}>I'll specify end point</Button>
      </div>

      {/* Шаг 5 */}
      <div>
        {['Restaurants', 'Cafés', 'Bars', 'Viewpoints', 'Parks', 'Museums', 'Architectural landmarks', 'Coworking', 'Bakery', 'Specialty coffee'].map((option) => (
          <div key={option} className="flex items-center space-x-2">
            <input
              type="checkbox"
              id={option}
              checked={selectedOptions.includes(option)}
              onChange={() => handleOptionToggle(option)}
            />
            <label htmlFor={option}>{option}</label>
          </div>
        ))}
        <Button onClick={handleGenerateRoute}>Generate route</Button>
      </div>

      {/* Шаг 6 */}
      <div>
        {['Barrier-free', 'More greenery', 'Avoid bad air', 'Safety'].map((option) => (
          <div key={option} className="flex items-center space-x-2">
            <input
              type="checkbox"
              id={option}
              checked={selectedOptions.includes(option)}
              onChange={() => handleOptionToggle(option)}
            />
            <label htmlFor={option}>{option}</label>
          </div>
        ))}
        <Button onClick={handleGenerateRoute}>Generate route</Button>
      </div>

      {/* Шаг 7 */}
      <div className="flex space-x-2">
        <Button onClick={() => handleClick('open in google maps')}>Open in Google Maps</Button>
        <Button onClick={() => handleClick('download route')}>Download route</Button>
        <Button onClick={() => handleClick('generate again')}>Generate again</Button>
        <Button onClick={() => handleClick('start new dialog')}>Start new dialog</Button>
      </div>
    </div>
  );

  const RouteDetails: React.FC = () => (
    <div className="p-6 space-y-4">
      {/* Keep your existing detailed route view here (map, list, etc.) */}
      {/* Не меняем логику данных/карт */}
      <div className="text-sm text-muted-foreground">Route details will appear here.</div>
    </div>
  );

  return (
    <div className="p-6 space-y-4">
      {!showPreview && !showRoute && <FormUI />}

      {showPreview && !showRoute && (
        <div className="flex flex-col items-center justify-center text-center min-h-[60vh] p-8">
          <h2 className="text-2xl font-semibold">Your route is ready 🎉</h2>
          <p className="mt-2 text-muted-foreground">{subtitle}</p>
          {totalDuration && (
            <p className="mt-1 text-sm text-muted-foreground">{`Total time: ${totalDuration}`}</p>
          )}
          {selectedCategories && selectedCategories.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2 justify-center">
              {selectedCategories.map((cat) => (
                <span key={cat} className="px-3 py-1 text-sm bg-emerald-50 text-emerald-700 rounded-full">
                  {cat}
                </span>
              ))}
            </div>
          )}
          <div className="mt-6">
            <Button onClick={() => setShowRoute(true)}>Show My Route</Button>
          </div>
        </div>
      )}

      {showRoute && <RouteDetails />}
    </div>
  );
};

export default RouteGenerator;