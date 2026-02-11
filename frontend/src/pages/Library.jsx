export function Library() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="font-display text-4xl font-bold text-white mb-8">
        Story Library
      </h1>
      <div className="bg-background-card p-8 rounded-xl border border-background-input text-center">
        <p className="text-gray-400">
          Loading your saved adventures...
        </p>
      </div>
    </div>
  );
}

export default Library;
