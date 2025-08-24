import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, ArrowLeft } from 'lucide-react';

export default function Unlock() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    const token = searchParams.get('token');
    if (token === 'coffee-2025') {
      localStorage.setItem('tr_unlocked', '1');
      setUnlocked(true);
    }
  }, [searchParams]);

  const handleGoHome = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-background/80 flex items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <CheckCircle className="w-16 h-16 text-green-500" />
          </div>
          <CardTitle className="text-2xl font-bold">
            {unlocked ? 'Thank You!' : 'Welcome Back!'}
          </CardTitle>
          <CardDescription className="text-lg">
            {unlocked 
              ? 'Your donation has been confirmed. You now have unlimited route generations!'
              : 'Thanks for visiting TurnRight.city'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleGoHome} className="w-full">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Route Generator
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}