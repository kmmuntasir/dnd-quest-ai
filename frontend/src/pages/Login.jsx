import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Gamepad2, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { Card, CardBody } from '../components/ui/Card';
import { useToast } from '../components/ui/ToastContext';

export function Login() {
  const navigate = useNavigate();
  const { login, loading } = useAuth();
  const toast = useToast();

  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.email || !formData.password) {
      toast.warning('Please fill in all fields');
      return;
    }

    setIsSubmitting(true);

    const result = await login(formData.email, formData.password);

    setIsSubmitting(false);

    if (result.success) {
      toast.success('Welcome back, adventurer!');
      navigate('/library');
    } else {
      toast.error(result.error || 'Login failed');
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background-dark via-background-dark to-background-darker px-4">
      <Card className="w-full max-w-md">
        <CardBody className="p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <Gamepad2 className="w-16 h-16 text-accent-gold" />
            </div>
            <h1 className="font-display text-3xl font-bold text-white mb-2">
              Welcome Back
            </h1>
            <p className="text-gray-400">
              Continue your adventure
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
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
                  placeholder="Enter your password"
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
                  Signing in...
                </span>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>

          {/* Register Link */}
          <div className="mt-6 text-center">
            <p className="text-gray-400">
              New adventurer?{' '}
              <Link to="/register" className="text-accent-gold hover:text-accent-gold/80 font-medium transition-colors">
                Create an account
              </Link>
            </p>
          </div>

          {/* Demo Note */}
          <div className="mt-6 p-4 bg-background-dark/50 rounded-lg border border-background-input">
            <p className="text-sm text-gray-400 text-center">
              Register an account to save your adventures and games. Your data is private and secure.
            </p>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

export default Login;
