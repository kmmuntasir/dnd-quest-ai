import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Backpack, Check, AlertCircle } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Toast } from '../ui/Toast';

export function SaveButton({ onSave, disabled = false, saving = false }) {
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSave = async () => {
    try {
      await onSave();
      setShowSaveConfirm(false);
      setShowSuccess(true);
      
      // Auto-hide success message
      setTimeout(() => {
        setShowSuccess(false);
      }, 3000);
    } catch (error) {
      console.error('Failed to save game:', error);
    }
  };

  return (
    <>
      <button
        onClick={() => setShowSaveConfirm(true)}
        disabled={disabled || saving}
        className="w-full px-6 py-3 bg-background-card hover:bg-background-input text-white rounded-lg border border-background-input transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Backpack className={`w-5 h-5 ${saving ? 'animate-spin' : 'text-gray-400'}`} />
        {saving ? 'Saving...' : 'Save Game'}
      </button>

      {/* Save Confirmation Modal */}
      {showSaveConfirm && (
        <Modal
          isOpen={showSaveConfirm}
          onClose={() => setShowSaveConfirm(false)}
          title="Save Game"
          size="sm"
        >
          <div className="space-y-6">
            <div className="text-center">
              <Backpack className="w-16 h-16 mx-auto text-accent-gold mb-4" />
              <p className="text-gray-300">
                Do you want to save your current progress?
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="secondary"
                onClick={() => setShowSaveConfirm(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleSave}
                loading={saving}
                className="flex-1"
              >
                Save
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Success Toast */}
      {showSuccess && (
        <Toast
          message="Game saved successfully!"
          type="success"
          onClose={() => setShowSuccess(false)}
          duration={3000}
        />
      )}
    </>
  );
}

export function AutoSaveIndicator({ lastSaved }) {
  const formatTime = (timestamp) => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    return date.toLocaleTimeString();
  };

  return (
    <div className="bg-background-dark/50 backdrop-blur-sm border-b border-background-card py-2 px-4">
      <div className="container mx-auto flex items-center justify-center gap-2 text-sm text-gray-400">
        <AlertCircle className="w-4 h-4" />
        <span>Last saved: {formatTime(lastSaved)}</span>
      </div>
    </div>
  );
}

export function SaveSlots({ saves, onLoad, onDelete }) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);

  const handleDelete = (saveId) => {
    setShowDeleteConfirm(saveId);
  };

  const confirmDelete = async () => {
    if (showDeleteConfirm) {
      try {
        await onDelete(showDeleteConfirm);
        setShowDeleteConfirm(null);
      } catch (error) {
        console.error('Failed to delete save:', error);
      }
    }
  };

  return (
    <div className="space-y-4">
      {saves.map((save) => (
        <div
          key={save.id}
          className="bg-background-card p-4 rounded-lg border border-background-input hover:border-background-input/50 transition-all group cursor-pointer"
          onClick={() => onLoad(save.id)}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h3 className="font-display text-lg font-bold text-white mb-1">
                {save.characterName}
              </h3>
              <p className="text-sm text-gray-400">
                {save.adventureTitle} • Level {save.level}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {formatTime(save.lastPlayed)}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="primary"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onLoad(save.id);
                }}
              >
                Load
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(save.id);
                }}
              >
                Delete
              </Button>
            </div>
          </div>

          {/* Delete Confirmation Modal */}
          {showDeleteConfirm === save.id && (
            <Modal
              isOpen={true}
              onClose={() => setShowDeleteConfirm(null)}
              title="Delete Save"
              size="sm"
            >
              <div className="space-y-6">
                <div className="text-center">
                  <AlertCircle className="w-16 h-16 mx-auto text-accent-red mb-4" />
                  <p className="text-gray-300 mb-2">
                    Are you sure you want to delete this save?
                  </p>
                  <p className="text-sm text-gray-400">
                    <strong>{save.characterName}</strong> • {save.adventureTitle}
                  </p>
                </div>
                <div className="flex gap-3">
                  <Button
                    variant="secondary"
                    onClick={() => setShowDeleteConfirm(null)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="danger"
                    onClick={confirmDelete}
                    className="flex-1"
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </Modal>
          )}
        </div>
      ))}
    </div>
  );
}

export default { SaveButton, AutoSaveIndicator, SaveSlots };
