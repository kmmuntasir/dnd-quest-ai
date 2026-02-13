import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Gamepad2, User, Mail, Lock, Eye, EyeOff, Shield, Check, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { Card, CardBody } from '../components/ui/Card';
import { useToast } from '../components/ui/ToastContext';

// Password requirements matching backend validation
const PASSWORD_REQUIREMENTS = [
  { test: (p) => p.length >= 8, label: 'At least 8 characters' },
  { test: (p) => /[A-Z]/.test(p), label: 'One uppercase letter' },
  { test: (p) => /[a-z]/.test(p), label: 'One lowercase letter' },
  { test: (p) => /[0-9]/.test(p), label: 'One number' }
];

export function Register() {
  const navigate = useNavigate();
  const { register, loading } = useAuth();
  const toast = useToast();

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Calculate which password requirements are met
  const passwordChecks = useMemo(() => {
    return PASSWORD_REQUIREMENTS.map(req => ({
      ...req,
      met: req.test(formData.password)
    }));
  }, [formData.password]);

  const isPasswordValid = useMemo(() => {
    return passwordChecks.every(check => check.met);
  }, [passwordChecks]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.username || !formData.email || !formData.password) {
      toast.warning('Please fill in all fields');
      return;
    }

    if (formData.username.length < 3) {
      toast.warning('Username must be at least 3 characters');
      return;
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(formData.username)) {
      toast.warning('Username can only contain letters, numbers, underscores and hyphens');
      return;
    }

    if (!isPasswordValid) {
      toast.warning('Please meet all password requirements');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.warning('Passwords do not match');
      return;
    }

    setIsSubmitting(true);

    const result = await register(formData.username, formData.email, formData.password);

    setIsSubmitting(false);

    if (result.success) {
      toast.success('Account created! Welcome, adventurer!');
      navigate('/library');
    } else {
      // Handle validation errors from backend
      if (Array.isArray(result.error)) {
        const messages = result.error.map(e => e.message).join('. ');
        toast.error(messages);
      } else {
        toast.error(result.error || 'Registration failed');
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background-darker">
        <div className="animate-spin w-8 h-8 border-2 border-accent-gold border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background-dark via-background-dark to-background-darker px-4 py-8">
      <Card className="w-full max-w-md">
        <CardBody className="p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <Shield className="w-16 h-16 text-accent-gold" />
            </div>
            <h1 className="font-display text-3xl font-bold text-white mb-2">
              Create Account
            </h1>
            <p className="text-gray-400">
              Begin your adventure
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Username */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Username
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="AdventurerName"
                  className="w-full pl-10 pr-4 py-3 bg-background-input text-white rounded-lg border border-background-input focus:border-accent-gold focus:ring-2 focus:ring-accent-gold/20 focus:outline-none transition-all"
                  required
                  minLength={3}
                  maxLength={30}
                  pattern="[a-zA-Z0-9_-]+"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Letters, numbers, underscores, hyphens only
              </p>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="adventurer@example.com"
                  className="w-full pl-10 pr-4 py-3 bg-background-input text-white rounded-lg border border-background-input focus:border-accent-gold focus:ring-2 focus:ring-accent-gold/20 focus:outline-none transition-all"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Create a strong password"
                  className="w-full pl-10 pr-12 py-3 bg-background-input text-white rounded-lg border border-background-input focus:border-accent-gold focus:ring-2 focus:ring-accent-gold/20 focus:outline-none transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              {/* Password Requirements */}
              <div className="mt-3 space-y-1">
                {passwordChecks.map((check, index) => (
                  <div
                    key={index}
                    className={`flex items-center gap-2 text-xs transition-colors ${
                      check.met ? 'text-green-400' : 'text-gray-500'
                    }`}
                  >
                    {check.met ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <X className="w-4 h-4" />
                    )}
                    <span>{check.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  placeholder="Confirm your password"
                  className={`w-full pl-10 pr-4 py-3 bg-background-input text-white rounded-lg border focus:ring-2 focus:outline-none transition-all ${
                    formData.confirmPassword && formData.password !== formData.confirmPassword
                      ? 'border-accent-red focus:border-accent-red focus:ring-accent-red/20'
                      : 'border-background-input focus:border-accent-gold focus:ring-accent-gold/20'
                  }`}
                  required
                />
              </div>
              {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                <p className="text-xs text-accent-red mt-1">Passwords do not match</p>
              )}
            </div>

            {/* Submit */}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                  Creating account...
                </span>
              ) : (
                'Create Account'
              )}
            </Button>
          </form>

          {/* Login Link */}
          <div className="mt-6 text-center">
            <p className="text-gray-400">
              Already have an account?{' '}
              <Link to="/login" className="text-accent-gold hover:text-accent-gold/80 font-medium transition-colors">
                Sign in
              </Link>
            </p>
          </div>

          {/* Info Note */}
          <div className="mt-6 p-4 bg-background-dark/50 rounded-lg border border-background-input">
            <p className="text-sm text-gray-400 text-center">
              Your adventures, characters, and settings will be saved to your account and accessible from any device.
            </p>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

export default Register;
