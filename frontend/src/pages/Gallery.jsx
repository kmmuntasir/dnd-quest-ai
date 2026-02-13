import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, RefreshCw, Clock, AlertCircle, CheckCircle, Loader2, Wrench } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { LoadingPage } from '../components/ui/LoadingSpinner';
import { Image, resolveImageUrl } from '../components/ui/Image';
import { FadeIn, SlideUp } from '../components/ui/Transitions';
import { adventuresAPI, imagesAPI } from '../services/api';

// Status badge component
function ImageStatusBadge({ status }) {
  const statusConfig = {
    pending: {
      icon: Clock,
      text: 'Queued',
      className: 'bg-yellow-500/80 text-yellow-900'
    },
    processing: {
      icon: Loader2,
      text: 'Generating',
      className: 'bg-blue-500/80 text-blue-900 animate-pulse'
    },
    ready: {
      icon: CheckCircle,
      text: 'Ready',
      className: 'bg-green-500/80 text-green-900'
    },
    failed: {
      icon: AlertCircle,
      text: 'Failed',
      className: 'bg-red-500/80 text-red-900'
    },
    unknown: {
      icon: AlertCircle,
      text: 'Unknown',
      className: 'bg-gray-500/80 text-gray-900'
    }
  };

  const config = statusConfig[status] || statusConfig.unknown;
  const Icon = config.icon;

  return (
    <div className={`px-2 py-1 rounded-full ${config.className} text-xs font-medium flex items-center gap-1`}>
      <Icon className={`w-3 h-3 ${status === 'processing' ? 'animate-spin' : ''}`} />
      {config.text}
    </div>
  );
}

export function Gallery() {
  const { adventureId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [adventure, setAdventure] = useState(null);
  const [scenes, setScenes] = useState([]);
  const [selectedScene, setSelectedScene] = useState(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [repairing, setRepairing] = useState(false);
  const [imageStatus, setImageStatus] = useState({});

  // Calculate image statistics
  const getImageStats = useCallback(() => {
    const stats = { total: 0, pending: 0, processing: 0, ready: 0, failed: 0 };
    Object.values(imageStatus).forEach(status => {
      stats.total++;
      if (stats.hasOwnProperty(status)) {
        stats[status]++;
      }
    });
    return stats;
  }, [imageStatus]);

  // Check if any images need repair
  const needsRepair = useCallback(() => {
    const stats = getImageStats();
    return stats.pending > 0 || stats.failed > 0;
  }, [getImageStats]);

  // Load adventure status (for image generation progress)
  const loadImageStatus = useCallback(async () => {
    try {
      const response = await adventuresAPI.getStatus(adventureId);
      const data = response.data || response;

      // Build status map from images array
      const statusMap = {};
      if (data.images) {
        data.images.forEach(img => {
          statusMap[img.hash] = img.status;
        });
      }

      setImageStatus(statusMap);

      // Update adventure status
      if (adventure && data.status !== adventure.status) {
        setAdventure(prev => ({ ...prev, status: data.status }));
      }

      return data;
    } catch (error) {
      console.error('Failed to load image status:', error);
      return null;
    }
  }, [adventureId, adventure]);

  // Poll for status updates when images are processing
  useEffect(() => {
    const stats = getImageStats();
    if (stats.processing > 0 || stats.pending > 0) {
      const interval = setInterval(() => {
        loadImageStatus();
      }, 5000); // Poll every 5 seconds

      return () => clearInterval(interval);
    }
  }, [getImageStats, loadImageStatus]);

  useEffect(() => {
    loadAdventure();
  }, [adventureId]);

  // Initial status load
  useEffect(() => {
    if (adventure && scenes.length > 0) {
      loadImageStatus();
    }
  }, [adventure, scenes, loadImageStatus]);

  const loadAdventure = async () => {
    try {
      setLoading(true);
      const response = await adventuresAPI.getById(adventureId);
      const data = response.data || response;
      setAdventure(data);
      setScenes(data.scenes || []);
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

  const handleRegenerate = async () => {
    if (!selectedScene?.image_hash || regenerating) return;

    try {
      setRegenerating(true);
      const response = await imagesAPI.regenerate(selectedScene.image_hash);
      const data = response.data || response;

      if (data.success) {
        // Update the scene with the new hash and URL
        const newHash = data.newHash;
        const newUrl = data.newUrl;

        // Update selected scene
        setSelectedScene(prev => ({
          ...prev,
          image_hash: newHash,
          image_url: newUrl
        }));

        // Update scenes array
        setScenes(prev => prev.map(scene =>
          scene.id === selectedScene.id
            ? { ...scene, image_hash: newHash, image_url: newUrl }
            : scene
        ));

        // Update status
        setImageStatus(prev => ({
          ...prev,
          [newHash]: 'processing'
        }));

        // Start polling for status (async regeneration)
        pollImageStatus(newHash);
      }
    } catch (error) {
      console.error('Failed to regenerate image:', error);
      alert(error.response?.data?.details || error.response?.data?.error || 'Failed to regenerate image. Please try again.');
      setRegenerating(false);
    }
  };

  // Poll for image status until ready or failed
  const pollImageStatus = async (hash, attempts = 0) => {
    const maxAttempts = 36; // 3 minutes at 5s intervals
    const pollInterval = 5000; // 5 seconds

    if (attempts >= maxAttempts) {
      setImageStatus(prev => ({ ...prev, [hash]: 'failed' }));
      setRegenerating(false);
      return;
    }

    try {
      const response = await imagesAPI.getStatus(hash);
      const data = response.data || response;

      if (data.status === 'ready') {
        // Image is ready - update status and stop regenerating
        setImageStatus(prev => ({ ...prev, [hash]: 'ready' }));
        setRegenerating(false);
        // Force image reload by updating the URL with timestamp
        const newUrl = `/api/images/${hash}?t=${Date.now()}`;
        setSelectedScene(prev => ({
          ...prev,
          image_url: newUrl
        }));
        // Also update the thumbnail in the scenes array
        setScenes(prev => prev.map(scene =>
          scene.image_hash === hash
            ? { ...scene, image_url: newUrl }
            : scene
        ));
      } else if (data.status === 'failed') {
        setImageStatus(prev => ({ ...prev, [hash]: 'failed' }));
        setRegenerating(false);
        alert(data.error || 'Image generation failed');
      } else {
        // Still processing - continue polling
        setTimeout(() => pollImageStatus(hash, attempts + 1), pollInterval);
      }
    } catch (error) {
      console.error('Error polling image status:', error);
      // Continue polling on error
      setTimeout(() => pollImageStatus(hash, attempts + 1), pollInterval);
    }
  };

  const handleRepairImages = async () => {
    if (repairing) return;

    try {
      setRepairing(true);
      const response = await adventuresAPI.repairImages(adventureId);
      const data = response.data || response;

      if (data.success) {
        alert(`${data.message}\n\nImages will be generated in the background. This page will update automatically.`);
        // Reload status to start polling
        await loadAdventure();
        await loadImageStatus();
      }
    } catch (error) {
      console.error('Failed to repair images:', error);
      alert(error.response?.data?.error || 'Failed to repair images. Please try again.');
    } finally {
      setRepairing(false);
    }
  };

  if (loading) {
    return <LoadingPage message="Loading gallery..." />;
  }

  const imageStats = getImageStats();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background-dark via-background-dark to-background-darker">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <FadeIn>
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
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

              {/* Image Status & Repair Button */}
              <div className="flex items-center gap-4">
                {(imageStats.pending > 0 || imageStats.processing > 0 || imageStats.failed > 0) && (
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 text-sm text-gray-400">
                      <span className="flex items-center gap-1">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {imageStats.processing} generating
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {imageStats.pending} queued
                      </span>
                      {imageStats.failed > 0 && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-1 text-red-400">
                            <AlertCircle className="w-4 h-4" />
                            {imageStats.failed} failed
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {needsRepair() && (
                  <Button
                    onClick={handleRepairImages}
                    variant="secondary"
                    className="gap-2"
                    disabled={repairing}
                  >
                    <Wrench className={`w-4 h-4 ${repairing ? 'animate-spin' : ''}`} />
                    {repairing ? 'Repairing...' : 'Repair Images'}
                  </Button>
                )}
              </div>
            </div>
          </FadeIn>

          {/* Gallery Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {scenes.map((scene, index) => {
              const status = scene.image_status || imageStatus[scene.image_hash] || 'unknown';

              return (
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

                      {/* Image status badge */}
                      <div className="absolute top-2 right-2">
                        <ImageStatusBadge status={status} />
                      </div>

                      {/* Key scene indicator */}
                      {scene.is_key_scene && (
                        <div className="absolute bottom-2 left-2 px-2 py-1 rounded-full bg-accent-gold/80 backdrop-blur-sm text-xs font-bold text-background-dark">
                          Key
                        </div>
                      )}

                      {/* Expand icon on hover */}
                      <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <div className="p-2 rounded-full bg-white/20 backdrop-blur-sm">
                          <ChevronRight className="w-4 h-4 text-white" />
                        </div>
                      </div>
                    </div>
                  </Card>
                </SlideUp>
              );
            })}
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
                      src={resolveImageUrl(selectedScene.image_url)}
                      alt={`Scene ${scenes.findIndex(s => s.id === selectedScene.id) + 1}`}
                      loading="lazy"
                      decoding="async"
                      className="max-w-full max-h-[55vh] lg:max-h-[65vh] object-contain rounded-lg"
                    />

                    {/* Image status badge */}
                    <div className="absolute top-4 left-4">
                      <ImageStatusBadge status={selectedScene.image_status || imageStatus[selectedScene.image_hash] || 'unknown'} />
                    </div>

                    {/* Key scene badge */}
                    {selectedScene.is_key_scene && (
                      <div className="absolute top-14 left-4 px-3 py-1 rounded-full bg-accent-gold text-background-dark font-bold text-sm">
                        Key Scene
                      </div>
                    )}

                    {/* Regenerate button */}
                    {selectedScene.image_hash && (
                      <button
                        onClick={handleRegenerate}
                        disabled={regenerating}
                        className="absolute bottom-4 right-4 px-3 py-2 rounded-lg bg-black/60 hover:bg-black/80 backdrop-blur-sm text-white text-sm font-medium flex items-center gap-2 transition-colors disabled:opacity-50"
                        title="Regenerate image with new AI variation"
                      >
                        <RefreshCw className={`w-4 h-4 ${regenerating ? 'animate-spin' : ''}`} />
                        {regenerating ? 'Regenerating...' : 'Regenerate'}
                      </button>
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
                  {scenes.map((scene, index) => {
                    const status = scene.image_status || imageStatus[scene.image_hash] || 'unknown';

                    return (
                      <button
                        key={scene.id}
                        onClick={() => setSelectedScene(scene)}
                        className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all relative ${
                          scene.id === selectedScene.id
                            ? 'border-accent-gold scale-110'
                            : 'border-transparent opacity-50 hover:opacity-100'
                        }`}
                      >
                        <img
                          src={resolveImageUrl(scene.image_url)}
                          alt={`Thumbnail ${index + 1}`}
                          loading="lazy"
                          decoding="async"
                          className="w-full h-full object-cover"
                        />
                        {/* Status indicator on thumbnail */}
                        {status !== 'ready' && (
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                            {status === 'processing' && <Loader2 className="w-4 h-4 text-white animate-spin" />}
                            {status === 'pending' && <Clock className="w-4 h-4 text-yellow-400" />}
                            {status === 'failed' && <AlertCircle className="w-4 h-4 text-red-400" />}
                          </div>
                        )}
                      </button>
                    );
                  })}
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
