import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, ArrowLeft } from 'lucide-react';
import api from '../lib/api';

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }

    setLoading(true);
    try {
      const loggedInUser = await login(email, password);
      toast.success('เข้าสู่ระบบสำเร็จ');

      // Super Admin → redirect to admin dashboard immediately
      if (loggedInUser.role === 'SUPER_ADMIN') {
        navigate('/super-admin/dashboard', { replace: true });
        return;
      }

      // Regular tenant → smart redirect to brand/branch
      try {
        const brandsRes = await api.get('/brands');
        const brands = brandsRes.data;

        if (Array.isArray(brands) && brands.length === 1) {
          const brandId = brands[0].id;
          const branchesRes = await api.get(`/brands/${brandId}/branches`);
          const branches = branchesRes.data;

          if (Array.isArray(branches) && branches.length === 1) {
            navigate(`/brands/${brandId}/branches/${branches[0].id}`);
          } else {
            navigate(`/brands/${brandId}/branches`);
          }
        } else {
          navigate('/brands');
        }
      } catch {
        navigate('/brands');
      }
    } catch (error: any) {
      const message = error.response?.data?.message;
      toast.error(Array.isArray(message) ? message[0] : (message || 'อีเมลหรือรหัสผ่านไม่ถูกต้อง'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md mb-4">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          กลับหน้าหลัก
        </Link>
      </div>

      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Link to="/" className="mx-auto w-fit">
            <CardTitle className="text-3xl font-bold text-primary transition-opacity hover:opacity-80">
              ChabaPOS
            </CardTitle>
          </Link>
          <CardDescription>เข้าสู่ระบบเพื่อจัดการร้านอาหารของคุณ</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">อีเมล</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                disabled={loading}
                placeholder="example@mail.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">รหัสผ่าน</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  placeholder="••••••••"
                  className="pr-10"
                />
                <button
                  type="button"
                  onMouseDown={() => setShowPassword(true)}
                  onMouseUp={() => setShowPassword(false)}
                  onMouseLeave={() => setShowPassword(false)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                >
                  {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full py-6 text-lg mt-2" disabled={loading}>
              {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
            </Button>

            <div className="text-center pt-2">
              <p className="text-sm text-slate-500">
                ยังไม่มีบัญชี?{' '}
                <Link to="/register" className="text-primary font-semibold hover:underline">
                  สมัครสมาชิกที่นี่
                </Link>
              </p>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
