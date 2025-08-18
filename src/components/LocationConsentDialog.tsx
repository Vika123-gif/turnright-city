import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface LocationConsentDialogProps {
  open: boolean;
  onConsent: (granted: boolean) => void;
}

const LocationConsentDialog: React.FC<LocationConsentDialogProps> = ({ open, onConsent }) => {
  return (
    <AlertDialog open={open}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Location Access</AlertDialogTitle>
          <AlertDialogDescription>
            We'd like to access your location to find the best places nearby for your trip. 
            Your location data is only used to provide personalized recommendations.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => onConsent(false)}>
            Deny
          </AlertDialogCancel>
          <AlertDialogAction onClick={() => onConsent(true)}>
            Allow Location
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default LocationConsentDialog;