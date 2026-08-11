import POForm from '../components/POForm';

export default function Home() {
  return (
    <main className="min-h-screen bg-zinc-100 dark:bg-black py-8">
      <div className="container mx-auto px-4">
        <POForm />
      </div>
    </main>
  );
}
