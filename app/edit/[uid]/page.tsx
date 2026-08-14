import POForm from '@/components/POForm';
import { getDropdowns, getPOById } from '@/lib/api';
import { notFound } from 'next/navigation';

export const revalidate = 0; // Dynamic route, do not cache statically

// Next.js 15+: params is a Promise — must be awaited before accessing properties
export default async function EditPOPage({ params }: { params: Promise<{ uid: string }> }) {
  const { uid } = await params;

  const dpResponse = await getDropdowns();
  const initialDropdowns = dpResponse.status === 'success' ? dpResponse.data : undefined;
  
  const poResponse = await getPOById(uid);
  if (poResponse.status !== 'success' || !poResponse.data) {
    return notFound();
  }
  
  return (
    <div className="w-full">
      <POForm initialDropdowns={initialDropdowns} initialData={poResponse.data} />
    </div>
  );
}

