import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, CheckCircle2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface TwoFactorSetupModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const TwoFactorSetupModal: React.FC<TwoFactorSetupModalProps> = ({ isOpen, onClose }) => {
    const { toast } = useToast();
    const [step, setStep] = useState<'init' | 'scan' | 'verify' | 'success'>('init');
    const [factorId, setFactorId] = useState<string>('');
    const [qrCode, setQrCode] = useState<string>('');
    const [secret, setSecret] = useState<string>('');
    const [verifyCode, setVerifyCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const startSetup = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const { data, error } = await supabase.auth.mfa.enroll({
                factorType: 'totp',
            });

            if (error) throw error;

            setFactorId(data.id);
            setQrCode(data.totp.qr_code);
            setSecret(data.totp.secret);
            setStep('scan');
        } catch (err: any) {
            console.error('Error enrolling in MFA:', err);
            setError(err.message || 'Failed to start 2FA setup');
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerify = async () => {
        if (verifyCode.length !== 6) {
            setError('Please enter a valid 6-digit code');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            const { data, error } = await supabase.auth.mfa.challengeAndVerify({
                factorId,
                code: verifyCode,
            });

            if (error) throw error;

            setStep('success');
            toast({
                title: "2FA Enabled",
                description: "Two-factor authentication has been successfully enabled.",
            });
        } catch (err: any) {
            console.error('Error verifying MFA:', err);
            setError(err.message || 'Invalid code. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleClose = () => {
        // Reset state when closing
        if (step === 'success') {
            setStep('init');
            setVerifyCode('');
        }
        onClose();
    };

    const copySecret = () => {
        navigator.clipboard.writeText(secret);
        toast({
            title: "Copied",
            description: "Secret key copied to clipboard",
        });
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[450px] bg-white">
                <DialogHeader>
                    <DialogTitle>Set Up Two-Factor Authentication</DialogTitle>
                    <DialogDescription>
                        Add an extra layer of security to your account using an authenticator app.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4">
                    {step === 'init' && (
                        <div className="space-y-4">
                            <div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-800">
                                <p>You will need an authenticator app like Google Authenticator, Authy, or Microsoft Authenticator.</p>
                            </div>
                            <Button onClick={startSetup} className="w-full" disabled={isLoading}>
                                {isLoading ? "Initializing..." : "Start Setup"}
                            </Button>
                        </div>
                    )}

                    {step === 'scan' && (
                        <div className="space-y-6">
                            <div className="flex flex-col items-center justify-center space-y-4">
                                <div className="p-4 bg-white border rounded-lg shadow-sm">
                                    <QRCodeSVG value={qrCode} size={180} />
                                </div>
                                <p className="text-sm text-center text-gray-500">
                                    Scan this QR code with your authenticator app
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs text-gray-500 uppercase">Or enter code manually</Label>
                                <div className="flex gap-2">
                                    <Input readOnly value={secret} className="font-mono text-sm bg-gray-50" />
                                    <Button variant="outline" size="icon" onClick={copySecret}>
                                        <Copy size={16} />
                                    </Button>
                                </div>
                            </div>

                            <Button onClick={() => setStep('verify')} className="w-full">
                                Next
                            </Button>
                        </div>
                    )}

                    {step === 'verify' && (
                        <div className="space-y-4">
                            <p className="text-sm text-gray-600">
                                Enter the 6-digit code from your authenticator app to verify setup.
                            </p>

                            <div className="space-y-2">
                                <Label htmlFor="code">Verification Code</Label>
                                <Input
                                    id="code"
                                    value={verifyCode}
                                    onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                    placeholder="000000"
                                    className="text-center text-2xl tracking-widest"
                                    autoFocus
                                />
                            </div>

                            {error && (
                                <Alert variant="destructive">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertTitle>Error</AlertTitle>
                                    <AlertDescription>{error}</AlertDescription>
                                </Alert>
                            )}

                            <Button onClick={handleVerify} className="w-full" disabled={isLoading || verifyCode.length !== 6}>
                                {isLoading ? "Verifying..." : "Verify & Enable"}
                            </Button>

                            <Button variant="ghost" onClick={() => setStep('scan')} className="w-full">
                                Back to QR Code
                            </Button>
                        </div>
                    )}

                    {step === 'success' && (
                        <div className="flex flex-col items-center justify-center space-y-4 py-6">
                            <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center">
                                <CheckCircle2 className="h-8 w-8 text-green-600" />
                            </div>
                            <h3 className="text-xl font-semibold">2FA Enabled!</h3>
                            <p className="text-center text-gray-500">
                                Your account is now secured with two-factor authentication.
                            </p>
                            <Button onClick={handleClose} className="w-full mt-4">
                                Done
                            </Button>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};
