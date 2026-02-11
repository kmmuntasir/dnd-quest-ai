import { Link } from 'react-router-dom';
import { Sparkles, BookOpen, Settings } from 'lucide-react';

export function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background-dark to-background-darker">
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="font-display text-5xl md:text-6xl font-bold text-white mb-6">
            Dungeons & Dragons <span className="text-accent-gold">AI</span>
          </h1>
          <p className="text-xl text-gray-300 mb-12 max-w-2xl mx-auto">
            Embark on AI-generated adventures where every choice shapes your destiny.
            Infinite stories, infinite possibilities.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/library?action=generate"
              className="inline-flex items-center gap-2 px-8 py-4 bg-primary-default hover:bg-primary-hover text-white rounded-xl font-display text-lg font-bold transition-all transform hover:scale-105"
            >
              <Sparkles className="w-6 h-6" />
              Generate New Adventure
            </Link>
            <Link
              to="/library"
              className="inline-flex items-center gap-2 px-8 py-4 bg-background-card hover:bg-background-input text-white rounded-xl font-display text-lg font-bold border border-background-input transition-all"
            >
              <BookOpen className="w-6 h-6" />
              Story Library
            </Link>
          </div>
        </div>
      </section>

      {/* Features Preview */}
      <section className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div className="bg-background-card p-6 rounded-xl border border-background-input">
            <div className="w-12 h-12 bg-accent-purple/20 rounded-lg flex items-center justify-center mb-4">
              <Sparkles className="w-6 h-6 text-accent-purple" />
            </div>
            <h3 className="font-display text-xl font-bold text-white mb-3">
              AI-Generated Stories
            </h3>
            <p className="text-gray-400">
              Unique adventures crafted by advanced AI, with branching narratives and dynamic choices.
            </p>
          </div>

          <div className="bg-background-card p-6 rounded-xl border border-background-input">
            <div className="w-12 h-12 bg-accent-gold/20 rounded-lg flex items-center justify-center mb-4">
              <BookOpen className="w-6 h-6 text-accent-gold" />
            </div>
            <h3 className="font-display text-xl font-bold text-white mb-3">
              Atmospheric Visuals
            </h3>
            <p className="text-gray-400">
              AI-generated images bring each scene to life with stunning detail.
            </p>
          </div>

          <div className="bg-background-card p-6 rounded-xl border border-background-input">
            <div className="w-12 h-12 bg-accent-green/20 rounded-lg flex items-center justify-center mb-4">
              <Settings className="w-6 h-6 text-accent-green" />
            </div>
            <h3 className="font-display text-xl font-bold text-white mb-3">
              Save & Replay
            </h3>
            <p className="text-gray-400">
              Save your progress and revisit adventures with different choices.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Home;
