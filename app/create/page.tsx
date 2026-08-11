import POForm from '@/components/POForm';
import { getDropdowns } from '@/lib/api';

export const revalidate = 60; // Revalidate every 60 seconds

export default async function CreatePOPage() {
  const dpResponse = await getDropdowns();
  const initialDropdowns = dpResponse.status === 'success' ? dpResponse.data : undefined;

  return (
    <div className="w-full">
      <POForm initialDropdowns={initialDropdowns} />
    </div>
  );
}
