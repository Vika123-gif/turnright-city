
import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const KEY_STORAGE = "openai_api_key_dev";

type ApiKeyModalProps = {
  open: boolean;
  onSet: (key: string) => void;
};

export default function ApiKeyModal({ open, onSet }: ApiKeyModalProps) {
  const [key, setKey] = useState("");
  const [visible, setVisible] = useState(false);

  // Autofill key value if stored
  useEffect(() => {
    if (open) {
      setKey(localStorage.getItem(KEY_STORAGE) || "");
    }
  }, [open]);

  const handleSave = () => {
    localStorage.setItem(KEY_STORAGE, key);
    onSet(key);
  };

  return (
    <Dialog open={open}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>
            🔑 Enter your OpenAI API key
          </DialogTitle>
        </DialogHeader>
        <input
          type={visible ? "text" : "password"}
          className="border rounded-lg px-3 py-2 w-full text-base mt-4"
          value={key}
          onChange={e => setKey(e.target.value)}
          autoFocus
          data-testid="openai-key-input"
        />
        <label className="mt-2 block text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={visible}
            onChange={e => setVisible(e.target.checked)}
          /> Show API key
        </label>
        <Button
          variant="default"
          className="mt-6 w-full"
          disabled={!key}
          onClick={handleSave}
        >
          Save and Continue
        </Button>
        <div className="mt-2 text-xs text-muted-foreground">
          Your key is stored only in your browser (localStorage) and never sent anywhere except directly to OpenAI for testing.
        </div>
      </DialogContent>
    </Dialog>
  );
}
