import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserIcon, Users } from 'lucide-react';

// Move LoginForm component outside
interface LoginFormProps {
  email: string;
  setEmail: (email: string) => void;
  password: string;
  setPassword: (password: string) => void;
  isLoading: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

const LoginForm: React.FC<LoginFormProps> = React.memo(({
  email,
  setEmail,
  password,
  setPassword,
  isLoading,
  onSubmit
}) => (
  <form onSubmit={onSubmit} className="space-y-4">
    <div className="space-y-2">
      <Label htmlFor="email">Email</Label>
      <Input
        id="email"
        type="email"
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
    </div>
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <Label htmlFor="password">Password</Label>
        <Link
          to="/forgot-password"
          className="text-xs text-primary hover:underline"
        >
          Forgot password?
        </Link>
      </div>
      <Input
        id="password"
        type="password"
        placeholder="••••••••"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
    </div>
    <Button
      type="submit"
      className="w-full"
      disabled={isLoading}
    >
      {isLoading ? 'Signing in...' : 'Sign in'}
    </Button>
  </form>
));

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  
  const from = (location.state as any)?.from?.pathname || '/';
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      await login(email, password);
      toast({
        title: 'Login Successful',
        description: 'Welcome to Support Flow Nexus',
      });
      navigate(from, { replace: true });
    } catch (error) {
      console.error('Login error:', error);
      toast({
        title: 'Login Failed',
        description: 'Invalid email or password',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Demo login function for quick access
  const demoLogin = async (role: 'admin' | 'agent' | 'customer') => {
    setIsLoading(true);
    
    try {
      let email = '';
      switch (role) {
        case 'admin':
          email = 'admin@example.com';
          break;
        case 'agent':
          email = 'agent@example.com';
          break;
        case 'customer':
          email = 'customer@example.com';
          break;
      }
      
      await login(email, 'password'); // Using a dummy password
      toast({
        title: `Logged in as ${role}`,
        description: `You are now logged in as a ${role}`,
      });
      navigate(from, { replace: true });
    } catch (error) {
      console.error('Demo login error:', error);
      toast({
        title: 'Login Failed',
        description: 'Something went wrong',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-support-blue">Support Flow Nexus</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Customer Support Management System
          </p>
        </div>
        
        <Card className="animate-fade-in">
          <CardHeader>
            <CardTitle>Sign in to your account</CardTitle>
            <CardDescription>
              Choose your login type below
            </CardDescription>
          </CardHeader>
          
          <Tabs defaultValue="customer" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="customer" className="flex items-center justify-center gap-2">
                <UserIcon className="h-4 w-4" />
                <span>Customers</span>
              </TabsTrigger>
              <TabsTrigger value="staff" className="flex items-center justify-center gap-2">
                <Users className="h-4 w-4" />
                <span>Staff</span>
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="customer" className="mt-0">
              <CardContent>
                <div className="py-2">
                  <h3 className="text-sm font-medium mb-4">Customer Login</h3>
                  <LoginForm 
                    email={email}
                    setEmail={setEmail}
                    password={password}
                    setPassword={setPassword}
                    isLoading={isLoading}
                    onSubmit={handleSubmit}
                  />
                </div>
              </CardContent>
              <CardFooter className="flex flex-col space-y-4">
                <div className="text-sm text-center">
                  Don't have an account?{' '}
                  <Link to="/register" className="text-primary hover:underline">
                    Register here
                  </Link>
                </div>
{/*                 
                <div className="space-y-2 w-full">
                  <p className="text-xs text-center text-muted-foreground">
                    For demo purposes, you can login as:
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => demoLogin('customer')}
                    disabled={isLoading}
                    className="w-full"
                  >
                    Demo Customer Login
                  </Button>
                </div> */}
              </CardFooter>
            </TabsContent>
            
            <TabsContent value="staff" className="mt-0">
              <CardContent>
                <div className="py-2">
                  <h3 className="text-sm font-medium mb-4">Staff Login (Admin/Agent)</h3>
                  <LoginForm 
                    email={email}
                    setEmail={setEmail}
                    password={password}
                    setPassword={setPassword}
                    isLoading={isLoading}
                    onSubmit={handleSubmit}
                  />
                </div>
              </CardContent>
              <CardFooter className="flex flex-col space-y-4">
              <div className="text-sm text-center">
                  Don't have an account?{' '}
                  <Link to="/register" className="text-primary hover:underline">
                    Register here
                  </Link>
                </div>
                {/* <div className="space-y-2 w-full">
                  <p className="text-xs text-center text-muted-foreground">
                    For demo purposes, you can login as:
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => demoLogin('admin')}
                      disabled={isLoading}
                    >
                      Admin
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => demoLogin('agent')}
                      disabled={isLoading}
                    >
                      Agent
                    </Button>
                  </div>
                </div> */}
              </CardFooter>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
};

export default Login;
