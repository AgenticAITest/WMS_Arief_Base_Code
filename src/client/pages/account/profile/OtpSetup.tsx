import { Button } from "@client/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@client/components/ui/card";
import { Input } from "@client/components/ui/input";
import { Label } from "@client/components/ui/label";
import { useAuth } from "@client/provider/AuthProvider";
import axios from "axios";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";

const OtpSetup = () => {
  const [step, setStep] = useState<'setup' | 'verify' | 'enabled'>('setup');
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [secret, setSecret] = useState<string>('');
  const [code, setCode] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const navigate = useNavigate();

  const { user } = useAuth();

  useEffect(() => {
    checkOtpStatus();
  }, []);

  const checkOtpStatus = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/api/auth/otp-status');
      if (response.data.enabled) {
        setStep('enabled');
      } else {
        // If not enabled, try to setup (which will create if not exists)
        await setupOtp();
      }
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to check OTP status');
    } finally {
      setLoading(false);
    }
  };

  const setupOtp = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await axios.post('/api/auth/setup-otp');
      setQrCodeUrl(response.data.qrCodeUrl);
      setSecret(response.data.secret);
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to setup OTP');
    } finally {
      setLoading(false);
    }
  };

  const disableOtp = async () => {
    setLoading(true);
    setError('');
    try {
      await axios.post('/api/auth/disable-otp');
      setStep('setup');
      // After disable (delete), we can setup fresh
      await checkOtpStatus(); // This will call setupOtp since no record
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to disable OTP');
    } finally {
      setLoading(false);
    }
  };

  const enableOtp = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const response = await axios.post('/api/auth/enable-otp', { code });
      setSuccess('OTP enabled successfully!');
      setStep('enabled'); // After enable, show enabled
    } catch (error: any) {
      setError(error.response?.data?.message || 'Failed to enable OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Setup TOTP Authentication</CardTitle>
          <CardDescription>
            Scan the QR code with your authenticator app and enter the code to enable OTP login.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {step === 'enabled' && (
            <div className="text-center">
              <p className="text-green-600 text-lg">OTP is already enabled for your account.</p>
              <p className="text-sm text-muted-foreground mt-2">
                You can use OTP to login.
              </p>
              <div className="flex flex-col gap-0 mt-4">
                <Button onClick={disableOtp} variant="destructive" className="mt-4">
                  Disable OTP
                </Button>
                <Button onClick={() => navigate('/console/profile')} variant="outline" className="mt-4">
                  Back to Profile
                </Button>
              </div>
            </div>
          )}

          {step === 'setup' && qrCodeUrl && (
            <div className="text-center">
              <img src={qrCodeUrl} alt="QR Code" className="mx-auto" />
              <p className="text-sm text-muted-foreground mt-2">
                Scan this QR code with your authenticator app
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Secret: {secret}
              </p>
              <div className="flex flex-col gap-0 mt-4">
                <Button onClick={() => setStep('verify')} className="mt-4">
                  I've scanned the code
                </Button>
                <Button onClick={() => navigate('/console/profile')} variant="outline" className="mt-4">
                  Back to Profile
                </Button>
              </div>
            </div>
          )}

          {step === 'verify' && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="code">Enter the 6-digit code from your app</Label>
                <Input
                  id="code"
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="000000"
                  maxLength={6}
                />
              </div>
              <Button onClick={enableOtp} disabled={loading} className="w-full">
                {loading ? <Loader2 size={16} className="animate-spin" /> : 'Enable OTP'}
              </Button>
              <Button variant="outline" onClick={() => setStep('setup')} className="w-full">
                Back
              </Button>
            </div>
          )}

          {error && (
            <p className="text-destructive text-center text-sm">{error}</p>
          )}

          {success && (
            <p className="text-green-600 text-center text-sm">{success}</p>
          )}

          {loading && step === 'setup' && !qrCodeUrl && (
            <div className="text-center">
              <Loader2 size={16} className="animate-spin" />
              <p className="text-sm text-muted-foreground mt-2">Setting up OTP...</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default OtpSetup;