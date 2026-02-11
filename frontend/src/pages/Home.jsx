import { Link } from 'react-router-dom';
import { Sparkles, BookOpen, Play } from 'lucide-react';

export function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background-dark via-background-dark to-background-darker">
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 md:py-32">
        <div className="text-center max-w-5xl mx-auto">
          <h1 className="font-display text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
            Dungeons & Dragons{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-gold to-accent-purple">
              AI
            </span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-300 mb-12 max-w-3xl mx-auto leading-relaxed">
            Embark on AI-generated adventures where every choice shapes your destiny.
            Infinite stories, infinite possibilities.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/library?action=generate"
              className="group inline-flex items-center gap-3 px-8 py-4 bg-primary-default hover:bg-primary-hover text-white rounded-xl font-display text-lg font-bold transition-all transform hover:scale-105 shadow-lg hover:shadow-primary-hover/50"
            >
              <Sparkles className="w-6 h-6 group-hover:rotate-12 transition-transform" />
              Generate New Adventure
            </Link>
            <Link
              to="/library"
              className="group inline-flex items-center gap-3 px-8 py-4 bg-background-card hover:bg-background-input text-white rounded-xl font-display text-lg font-bold border border-background-input transition-all hover:scale-105"
            >
              <BookOpen className="w-6 h-6 group-hover:scale-110 transition-transform" />
              Story Library
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <div className="group bg-background-card p-8 rounded-2xl border border-background-input hover:border-background-input/50 transition-all hover:-translate-y-1 hover:shadow-xl">
            <div className="w-16 h-16 bg-accent-purple/20 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-accent-purple/30 transition-colors">
              <Sparkles className="w-8 h-8 text-accent-purple" />
            </div>
            <h3 className="font-display text-2xl font-bold text-white mb-4">
              AI-Generated Stories
            </h3>
            <p className="text-gray-400 leading-relaxed">
              Unique adventures crafted by advanced AI, with branching narratives and dynamic choices that adapt to your decisions.
            </p>
          </div>

          <div className="group bg-background-card p-8 rounded-2xl border border-background-input hover:border-background-input/50 transition-all hover:-translate-y-1 hover:shadow-xl">
            <div className="w-16 h-16 bg-accent-gold/20 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-accent-gold/30 transition-colors">
              <BookOpen className="w-8 h-8 text-accent-gold" />
            </div>
            <h3 className="font-display text-2xl font-bold text-white mb-4">
              Atmospheric Visuals
            </h3>
            <p className="text-gray-400 leading-relaxed">
              AI-generated images bring each scene to life with stunning detail, creating immersive fantasy worlds.
            </p>
          </div>

          <div className="group bg-background-card p-8 rounded-2xl border border-background-input hover:border-background-input/50 transition-all hover:-translate-y-1 hover:shadow-xl">
            <div className="w-16 h-16 bg-accent-green/20 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-accent-green/30 transition-colors">
              <Play className="w-8 h-8 text-accent-green" />
            </div>
            <h3 className="font-display text-2xl font-bold text-white mb-4">
              Save & Replay
            </h3>
            <p className="text-gray-400 leading-relaxed">
              Save your progress and revisit adventures with different choices. Every decision leads to new outcomes.
            </p>
          </div>
        </div>
      </section>

      {/* Quick Stats Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="bg-background-card/50 rounded-2xl border border-background-input p-12 max-w-4xl mx-auto text-center">
          <h2 className="font-display text-3xl font-bold text-white mb-8">
            Start Your Adventure Now
          </h2>
          <div className="grid md:grid-cols-4 gap-8">
            <div className="space-y-2">
              <p className="text-4xl font-display font-bold text-accent-gold">∞</p>
              <p className="text-gray-400">Stories</p>
            </div>
            <div className="space-y-2">
              <p className="text-4xl font-display font-bold text-accent-purple">5+</p>
              <p className="text-gray-400">Character Classes</p>
            </div>
            <div className="space-y-2">
              <p className="text-4xl font-display font-bold text-accent-green">20</p>
              <p className="text-gray-400">Sided Dice</p>
            </div>
            <div className="space-y-2">
              <p className="text-4xl font-display font-bold text-white">Free</p>
              <p className="text-gray-400">To Play</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Home;
