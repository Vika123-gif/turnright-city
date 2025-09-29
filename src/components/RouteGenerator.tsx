import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button'; // Из ui/
import { Input } from '@/components/ui/input';   // Из ui/

const RouteGenerator: React.FC = () => {
  const [locationInput, setLocationInput] = useState('');
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);

  // Функция для записи клика с отладкой
  const handleClick = async (buttonType: string) => {
    console.log(`Попытка записать клик: ${buttonType}`);
    const { error } = await (supabase as any).from('button_clicks').insert({ button_type: buttonType });
    if (error) {
      console.error('Ошибка записи клика:', error.message);
    } else {
      console.log(`Клик на ${buttonType} успешно записан`);
    }
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
  };

  return (
    <div className="p-6 space-y-4">
      {/* Шаг 1 */}
      <Button onClick={() => handleClick("I'm already here")}>I'm already here</Button>

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
};

export default RouteGenerator;