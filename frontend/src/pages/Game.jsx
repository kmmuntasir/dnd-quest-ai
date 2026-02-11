export function Game() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="font-display text-4xl font-bold text-white mb-8">
        Game
      </h1>
      <div className="bg-background-card p-8 rounded-xl border border-background-input text-center">
        <p className="text-gray-400">
          Loading game...
        </p>
      </div>
    </div>
  );
}

export default Game;
