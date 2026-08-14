"use client";

import { useEffect, useState } from 'react';
import POForm from '@/components/POForm';
import { getDropdowns } from '@/lib/api';
import type { DropdownData } from '@/lib/types';

// This page renders INSTANTLY (no server-side data blocking).
// Dropdowns are fetched in the background after mount.
export default function CreatePOPage() {
  const [dropdowns, setDropdowns] = useState<Partial<DropdownData> | undefined>(undefined);

  useEffect(() => {
    getDropdowns().then(res => {
      if (res.status === 'success' && res.data) {
        setDropdowns(res.data);
      }
    });
  }, []);

  return (
    <div className="w-full">
      <POForm initialDropdowns={dropdowns} />
    </div>
  );
}
