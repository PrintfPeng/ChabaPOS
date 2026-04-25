import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    phone: '',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{[key: string]: boolean}>({});
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
    // Clear error for the field when user starts typing
    if (errors[id]) {
      setErrors(prev => ({ ...prev, [id]: false }));
    }
  };

  const validatePasswords = () => {
    let hasError = false;
    const newErrors: {[key: string]: boolean} = {};

    if (formData.password.length < 6) {
      toast.error('รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร');
      newErrors.password = true;
      hasError = true;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error('รหัสผ่านไม่ตรงกัน กรุณาตรวจสอบอีกครั้ง');
      newErrors.confirmPassword = true;
      hasError = true;
    }

    if (hasError) {
      setErrors(prev => ({ ...prev, ...newErrors }));
      return false;
    }

    return true;
  };

  const validateForm = () => {
    setErrors({});
    if (isLogin) {
      if (!formData.email || !formData.password) {
        toast.error('กรุณากรอกข้อมูลให้ครบถ้วน');
        return false;
      }
    } else {
      const requiredFields = ['email', 'password', 'confirmPassword', 'firstName', 'lastName'];
      const missingFields = requiredFields.filter(field => !formData[field as keyof typeof formData]);
      
      if (missingFields.length > 0) {
        toast.error('กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน');
        const newErrors: {[key: string]: boolean} = {};
        missingFields.forEach(field => {
          newErrors[field] = true;
        });
        setErrors(newErrors);
        return false;
      }

      if (!validatePasswords()) {
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    console.log(`[Auth] Attempting ${isLogin ? 'login' : 'registration'} for: ${formData.email}`);
    
    try {
      if (isLogin) {
        await login(formData.email, formData.password);
        toast.success('เข้าสู่ระบบสำเร็จ');
      } else {
        const { confirmPassword, ...registerData } = formData;
        await register(registerData);
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
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold text-primary">ChabaPOS</CardTitle>
          <CardDescription>
            {isLogin ? 'เข้าสู่ระบบเพื่อจัดการร้านอาหารของคุณ' : 'สร้างบัญชีใหม่เพื่อเริ่มต้นใช้งาน'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-2 sm:col-span-1">
                  <Label htmlFor="firstName">ชื่อ</Label>
                  <Input 
                    id="firstName" 
                    value={formData.firstName} 
                    onChange={handleInputChange} 
                    required 
                    disabled={loading}
                    placeholder="สมชาย"
                  />
                </div>
                <div className="col-span-2 space-y-2 sm:col-span-1">
                  <Label htmlFor="lastName">นามสกุล</Label>
                  <Input 
                    id="lastName" 
                    value={formData.lastName} 
                    onChange={handleInputChange} 
                    required 
                    disabled={loading}
                    placeholder="รักชาติ"
                  />
                </div>
              </div>
            )}

            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="phone">เบอร์โทรศัพท์ (ถ้ามี)</Label>
                <Input 
                  id="phone" 
                  value={formData.phone} 
                  onChange={handleInputChange} 
                  disabled={loading}
                  placeholder="0812345678"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">อีเมล</Label>
              <Input 
                id="email" 
                type="email" 
                value={formData.email} 
                onChange={handleInputChange} 
                required 
                disabled={loading}
                placeholder="example@mail.com"
              />
            </div>

            <div className={`grid ${!isLogin ? 'grid-cols-2' : 'grid-cols-1'} gap-4`}>
              <div className="space-y-2">
                <Label htmlFor="password">รหัสผ่าน</Label>
                <div className="relative">
                  <Input 
                    id="password" 
                    type={showPassword ? 'text' : 'password'} 
                    value={formData.password} 
                    onChange={handleInputChange} 
                    required 
                    disabled={loading}
                    placeholder="••••••••"
                    className={`pr-10 ${errors.password ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                  />
                  <button
                    type="button"
                    onMouseDown={() => setShowPassword(true)}
                    onMouseUp={() => setShowPassword(false)}
                    onMouseLeave={() => setShowPassword(false)}
                    onTouchStart={(e) => {
                      e.preventDefault();
                      setShowPassword(true);
                    }}
                    onTouchEnd={(e) => {
                      e.preventDefault();
                      setShowPassword(false);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none touch-none"
                  >
                    {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                  </button>
                </div>
              </div>
              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">ยืนยันรหัสผ่าน</Label>
                  <div className="relative">
                    <Input 
                      id="confirmPassword" 
                      type={showConfirmPassword ? 'text' : 'password'} 
                      value={formData.confirmPassword} 
                      onChange={handleInputChange} 
                      required 
                      disabled={loading}
                      placeholder="••••••••"
                      className={`pr-10 ${errors.confirmPassword ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                    />
                    <button
                      type="button"
                      onMouseDown={() => setShowConfirmPassword(true)}
                      onMouseUp={() => setShowConfirmPassword(false)}
                      onMouseLeave={() => setShowConfirmPassword(false)}
                      onTouchStart={(e) => {
                        e.preventDefault();
                        setShowConfirmPassword(true);
                      }}
                      onTouchEnd={(e) => {
                        e.preventDefault();
                        setShowConfirmPassword(false);
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none touch-none"
                    >
                      {showConfirmPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <Button type="submit" className="w-full py-6 text-lg mt-4" disabled={loading}>
              {loading ? 'กำลังดำเนินการ...' : (isLogin ? 'เข้าสู่ระบบ' : 'ลงทะเบียน')}
            </Button>
            <div className="text-center mt-4">
              <button 
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setShowPassword(false);
                  setShowConfirmPassword(false);
                }}
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
