import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    console.log(`[Auth] Attempting ${isLogin ? 'login' : 'registration'} for: ${email}`);
    
    try {
      if (isLogin) {
        await login(email, password);
        toast.success('เข้าสู่ระบบสำเร็จ');
      } else {
        await register(email, password);
        toast.success('ลงทะเบียนสำเร็จ');
      }
      console.log(`[Auth] ${isLogin ? 'Login' : 'Registration'} successful`);
      navigate('/brands');
    } catch (error: any) {
      console.error(`[Auth] ${isLogin ? 'Login' : 'Registration'} failed:`, error);
      const message = error.response?.data?.message;
      toast.error(Array.isArray(message) ? message[0] : (message || 'เกิดข้อผิดพลาด'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold text-primary">ChabaPOS</CardTitle>
          <CardDescription>
            {isLogin ? 'เข้าสู่ระบบเพื่อจัดการร้านอาหารของคุณ' : 'สร้างบัญชีใหม่เพื่อเริ่มต้นใช้งาน'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">อีเมล</Label>
              <Input 
                id="email" 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required 
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">รหัสผ่าน</Label>
              <Input 
                id="password" 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
                disabled={loading}
              />
            </div>
            <Button type="submit" className="w-full py-6 text-lg" disabled={loading}>
              {loading ? 'กำลังดำเนินการ...' : (isLogin ? 'เข้าสู่ระบบ' : 'ลงทะเบียน')}
            </Button>
            <div className="text-center">
              <button 
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-sm text-primary hover:underline"
              >
                {isLogin ? 'ยังไม่มีบัญชี? ลงทะเบียนที่นี่' : 'มีบัญชีอยู่แล้ว? เข้าสู่ระบบที่นี่'}
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
