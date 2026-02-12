import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { User, Shield, Wand, Eye, Heart, Swords } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card, CardBody, CardFooter } from '../ui/Card';
import { LoadingSpinner, LoadingPage } from '../ui/LoadingSpinner';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const classes = [
  {
    value: 'Fighter',
    label: 'Fighter',
    icon: Swords,
    description: 'Master of combat and weapons. Strong and brave.',
    hpBonus: 10
  },
  {
    value: 'Wizard',
    label: 'Wizard',
    icon: Wand,
    description: 'Wielder of arcane magic. Intelligence and wisdom.',
    hpBonus: 6
  },
  {
    value: 'Rogue',
    label: 'Rogue',
    icon: Eye,
    description: 'Stealthy and cunning. Master of skills and stealth.',
    hpBonus: 8
  },
  {
    value: 'Cleric',
    label: 'Cleric',
    icon: Heart,
    description: 'Divine healer and protector. Wisdom and faith.',
    hpBonus: 8
  },
  {
    value: 'Ranger',
    label: 'Ranger',
    icon: User,
    description: 'Nature warrior and tracker. Versatile in wilderness.',
    hpBonus: 10
  }
];

export function CharacterCreation() {
  const navigate = useNavigate();
  const { adventureId } = useParams();
  const [formData, setFormData] = useState({
    name: '',
    class: 'Fighter'
  });
  const [stats, setStats] = useState({
    STR: 10,
    DEX: 10,
    INT: 10,
    WIS: 10,
    CON: 10,
    CHA: 10
  });

  // Roll 3d6 for a stat
  const rollStat = () => {
    return Math.floor(Math.random() * 6) + 1 +
           Math.floor(Math.random() * 6) + 1 +
           Math.floor(Math.random() * 6) + 1;
  };

  const rollAllStats = () => {
    setStats({
      STR: rollStat(),
      DEX: rollStat(),
      INT: rollStat(),
      WIS: rollStat(),
      CON: rollStat(),
      CHA: rollStat()
    });
  };

  // Calculate HP based on class and CON
  const calculateHP = () => {
    const selectedClass = classes.find(c => c.value === formData.class);
    const conMod = Math.floor((stats.CON - 10) / 2);
    return selectedClass.hpBonus + conMod;
  };

  const handleCreateCharacter = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      alert('Please enter a character name');
      return;
    }

    try {
      const response = await axios.post(`${API_BASE_URL}/games/start`, {
        adventureId,
        characterName: formData.name,
        characterClass: formData.class
      });

      // Navigate to the game with the returned game ID
      navigate(`/game/${response.data.gameId}`, { replace: true });
    } catch (error) {
      console.error('Failed to create character:', error);
      alert(error.response?.data?.error || 'Failed to create character. Please try again.');
    }
  };

  const getModifier = (stat) => {
    const mod = Math.floor((stat - 10) / 2);
    return mod >= 0 ? `+${mod}` : `${mod}`;
  };

  if (!adventureId) {
    return <LoadingPage message="No adventure selected" />;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <Shield className="w-16 h-16 mx-auto text-accent-gold mb-4" />
          <h1 className="font-display text-4xl font-bold text-white mb-4">
            Create Your Character
          </h1>
          <p className="text-gray-400 text-lg">
            Roll your stats and choose your class to begin your adventure
          </p>
        </div>

        <form onSubmit={handleCreateCharacter}>
          {/* Character Name */}
          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Character Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Enter your character's name..."
              className="w-full px-4 py-3 bg-background-input text-white rounded-lg border border-background-input focus:border-primary-default focus:ring-2 focus:ring-primary-default/20 focus:outline-none transition-all"
              required
            />
          </div>

          {/* Stats Display */}
          <div className="mb-8 bg-background-card p-6 rounded-xl border border-background-input">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-display text-2xl font-bold text-white flex items-center gap-2">
                <Swords className="w-6 h-6 text-accent-gold" />
                Ability Scores
              </h2>
              <Button
                type="button"
                onClick={rollAllStats}
                variant="secondary"
                size="sm"
                className="gap-2"
              >
                <Shield className="w-4 h-4" />
                Roll All Stats
              </Button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {Object.entries(stats).map(([stat, value]) => (
                <div
                  key={stat}
                  className="bg-background-dark/50 p-4 rounded-lg border border-background-input"
                >
                  <div className="text-center">
                    <div className="text-sm text-gray-400 mb-1">{stat}</div>
                    <div className="font-display text-4xl font-bold text-accent-gold mb-1">
                      {value}
                    </div>
                    <div className="text-sm text-gray-400">
                      {getModifier(value)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Class Selection */}
          <div className="mb-8">
            <h2 className="font-display text-2xl font-bold text-white mb-4 flex items-center gap-2">
              <User className="w-6 h-6 text-accent-gold" />
              Choose Your Class
            </h2>
            <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-4">
              {classes.map((cls) => {
                const Icon = cls.icon;
                return (
                  <Card
                    key={cls.value}
                    hover
                    className={`cursor-pointer transition-all ${
                      formData.class === cls.value
                        ? 'border-accent-gold ring-2 ring-accent-gold/20'
                        : 'hover:border-background-input/50'
                    }`}
                    onClick={() => setFormData({ ...formData, class: cls.value })}
                  >
                    <CardBody>
                      <Icon className={`w-12 h-12 mx-auto mb-3 ${
                        formData.class === cls.value ? 'text-accent-gold' : 'text-gray-400'
                      }`} />
                      <h3 className="font-display text-lg font-bold text-white mb-2 text-center">
                        {cls.label}
                      </h3>
                      <p className="text-sm text-gray-400 text-center">
                        {cls.description}
                      </p>
                      <div className="text-center mt-2 text-sm font-medium text-accent-gold">
                        HP Bonus: +{cls.hpBonus}
                      </div>
                    </CardBody>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* HP Preview */}
          <div className="mb-8 bg-background-card p-6 rounded-xl border border-background-input">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display text-xl font-bold text-white mb-2">
                  Starting Hit Points
                </h3>
                <p className="text-gray-400 text-sm">
                  Based on {formData.class} base HP + CON modifier
                </p>
              </div>
              <div className="text-right">
                <div className="font-display text-5xl font-bold text-accent-gold">
                  {calculateHP()}
                </div>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-center gap-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate(-1)}
            >
              Back
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="gap-2 px-12"
            >
              <Shield className="w-5 h-5" />
              Create Character & Start
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CharacterCreation;
