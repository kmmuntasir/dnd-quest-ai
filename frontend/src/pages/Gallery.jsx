import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, ChevronLeft, ChevronRight, Download, Maximize2 } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { LoadingPage } from '../components/ui/LoadingSpinner';
import { Image } from '../components/ui/Image';
import { FadeIn, SlideUp } from '../components/ui/Transitions';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export function Gallery() {
  const { adventureId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [adventure, setAdventure] = useState(null);
  const [scenes, setScenes] = useState([]);
  const [selectedScene, setSelectedScene] = useState(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  useEffect(() => {
    loadAdventure();
  }, [adventureId]);

  const loadAdventure = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/adventures/${adventureId}`);
      setAdventure(response.data);
      setScenes(response.data.scenes || []);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load adventure:', error);
      setLoading(false);
      navigate('/library');
    }
  };

  const openLightbox = (scene) => {
    setSelectedScene(scene);
    setLightboxOpen(true);
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
    setSelectedScene(null);
  };

  const navigateScene = (direction) => {
    if (!selectedScene) return;
    const currentIndex = scenes.findIndex(s => s.id === selectedScene.id);
    const newIndex = currentIndex + direction;
    if (newIndex >= 0 && newIndex < scenes.length) {
      setSelectedScene(scenes[newIndex]);
    }
  };

  if (loading) {
    return <LoadingPage message="Loading gallery..." />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background-dark via-background-dark to-background-darker">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <FadeIn>
            <div className="flex items-center gap-4 mb-8">
              <Button
                onClick={() => navigate(-1)}
                variant="secondary"
                className="gap-2"
              >
                <ArrowLeft className="w-5 h-5" />
                Back
              </Button>
              <div>
                <h1 className="font-display text-4xl font-bold text-white">
                  {adventure?.title}
                </h1>
                <p className="text-gray-400">
                  {scenes.length} scenes • Gallery View
                </p>
              </div>
            </div>
          </FadeIn>

          {/* Gallery Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {scenes.map((scene, index) => (
              <SlideUp key={scene.id} delay={index * 50}>
                <Card
                  hover
                  className="group cursor-pointer overflow-hidden"
                  onClick={() => openLightbox(scene)}
                >
                  <div className="relative aspect-square overflow-hidden">
                    <Image
                      src={scene.image_url}
                      alt={`Scene ${index + 1}`}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                    {/* Scene number badge */}
                    <div className="absolute top-2 left-2 px-2 py-1 rounded-full bg-black/60 backdrop-blur-sm text-xs font-bold text-white">
                      Scene {index + 1}
                    </div>

                    {/* Key scene indicator */}
                    {scene.is_key_scene && (
                      <div className="absolute top-2 right-2 px-2 py-1 rounded-full bg-accent-gold/80 backdrop-blur-sm text-xs font-bold text-background-dark">
                        Key
                      </div>
                    )}

                    {/* Expand icon on hover */}
                    <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="p-2 rounded-full bg-white/20 backdrop-blur-sm">
                        <Maximize2 className="w-4 h-4 text-white" />
                      </div>
                    </div>
                  </div>
                </Card>
              </SlideUp>
            ))}
          </div>

          {/* Empty State */}
          {scenes.length === 0 && (
            <div className="text-center py-16">
              <p className="text-gray-400 text-lg">No scenes found for this adventure.</p>
            </div>
          )}
        </div>
      </div>

      {/* Lightbox Modal */}
      {lightboxOpen && selectedScene && (
        <div
          className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4"
          onClick={closeLightbox}
        >
          <FadeIn>
            <div className="relative max-w-7xl max-h-[90vh] w-full" onClick={e => e.stopPropagation()}>
              {/* Close button */}
              <button
                onClick={closeLightbox}
                className="absolute -top-12 right-0 text-white/60 hover:text-white transition-colors z-10"
              >
                ✕
              </button>

              {/* Scene counter */}
              <div className="absolute -top-12 left-0 text-white/60 font-display">
                Scene {scenes.findIndex(s => s.id === selectedScene.id) + 1} of {scenes.length}
              </div>

              {/* Main content - Horizontal layout on desktop, vertical on mobile */}
              <div className="flex flex-col gap-6">
                {/* Top section - Image and Description side by side on desktop */}
                <div className="flex flex-col lg:flex-row gap-6">
                  {/* Image Container */}
                  <div className="relative flex-shrink-0 lg:max-w-[60%] flex items-center justify-center">
                    <img
                      src={selectedScene.image_url}
                      alt={`Scene ${scenes.findIndex(s => s.id === selectedScene.id) + 1}`}
                      className="max-w-full max-h-[55vh] lg:max-h-[65vh] object-contain rounded-lg"
                    />

                    {/* Key scene badge */}
                    {selectedScene.is_key_scene && (
                      <div className="absolute top-4 left-4 px-3 py-1 rounded-full bg-accent-gold text-background-dark font-bold text-sm">
                        Key Scene
                      </div>
                    )}
                  </div>

                  {/* Description - Right side on desktop, below on mobile */}
                  <div className="lg:flex-1 lg:min-w-[300px]">
                    <div className="bg-background-card/90 backdrop-blur-sm p-6 rounded-lg h-full overflow-y-auto max-h-[30vh] lg:max-h-[65vh]">
                      <h3 className="font-display text-xl font-bold text-accent-gold mb-4">
                        Scene {scenes.findIndex(s => s.id === selectedScene.id) + 1}
                      </h3>
                      <p className="text-white text-lg leading-relaxed">
                        {selectedScene.description}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Thumbnail strip - Full width below both image and description */}
                <div className="flex justify-center gap-3 pb-2">
                  {scenes.map((scene, index) => (
                    <button
                      key={scene.id}
                      onClick={() => setSelectedScene(scene)}
                      className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                        scene.id === selectedScene.id
                          ? 'border-accent-gold scale-110'
                          : 'border-transparent opacity-50 hover:opacity-100'
                      }`}
                    >
                      <img
                        src={scene.image_url}
                        alt={`Thumbnail ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Navigation arrows */}
              {scenes.findIndex(s => s.id === selectedScene.id) > 0 && (
                <button
                  onClick={() => navigateScene(-1)}
                  className="absolute left-0 lg:-left-12 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
              )}
              {scenes.findIndex(s => s.id === selectedScene.id) < scenes.length - 1 && (
                <button
                  onClick={() => navigateScene(1)}
                  className="absolute right-0 lg:-right-12 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              )}
            </div>
          </FadeIn>
        </div>
      )}
    </div>
  );
}

export default Gallery;
